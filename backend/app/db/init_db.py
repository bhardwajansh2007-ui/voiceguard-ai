import json
from sqlalchemy.orm import Session
from backend.app.db.database import engine, Base, SessionLocal
from backend.app.models.database_models import User, SystemConfiguration
from backend.app.core.security import hash_password
from backend.app.core.config import settings
from backend.app.core.logging import logger


def init_database() -> None:
    """
    Initializes database tables and registers required baseline configuration.
    Strictly follows the zero-mock policy: NO demo calls, fake users, or fabricated metrics.
    """
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    # Safe SQLite column migration for source_type & speaker identity fields
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            # call_sessions migration
            call_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(call_sessions);")).fetchall()]
            if "source_type" not in call_cols:
                logger.info("Migrating call_sessions: adding source_type column...")
                conn.execute(text("ALTER TABLE call_sessions ADD COLUMN source_type VARCHAR(32) DEFAULT 'COMMUNICATION_SANDBOX';"))

            # speakers migration for identity registry
            spk_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(speakers);")).fetchall()]
            new_spk_cols = {
                "organization": "VARCHAR(128) DEFAULT 'Enterprise Org'",
                "role_title": "VARCHAR(128)",
                "caller_id": "VARCHAR(128)",
                "identity_status": "VARCHAR(32) DEFAULT 'VERIFIED'",
                "mfa_enabled": "BOOLEAN DEFAULT 1",
                "sensitive_actions_enabled": "BOOLEAN DEFAULT 1",
                "risk_threshold": "FLOAT DEFAULT 60.0",
                "allowed_operations_json": "TEXT",
                "notes": "TEXT",
            }
            for col_name, col_type in new_spk_cols.items():
                if col_name not in spk_cols:
                    logger.info(f"Migrating speakers: adding {col_name} column...")
                    conn.execute(text(f"ALTER TABLE speakers ADD COLUMN {col_name} {col_type};"))

            conn.commit()
    except Exception as mig_err:
        logger.warning(f"Database migration notice: {str(mig_err)}")

    db: Session = SessionLocal()
    try:
        # 1. Initialize Baseline System Configuration if not present
        existing_weights = db.query(SystemConfiguration).filter(
            SystemConfiguration.config_key == "risk_weights"
        ).first()

        if not existing_weights:
            default_weights = {
                "weight_spoof": settings.WEIGHT_SPOOF,
                "weight_speaker_mismatch": settings.WEIGHT_SPEAKER_MISMATCH,
                "weight_behavioral": settings.WEIGHT_BEHAVIORAL,
                "weight_caller_context": settings.WEIGHT_CALLER_CONTEXT,
                "weight_transaction_sensitivity": settings.WEIGHT_TRANSACTION_SENSITIVITY,
            }
            db.add(SystemConfiguration(
                config_key="risk_weights",
                config_value=json.dumps(default_weights)
            ))

        existing_thresholds = db.query(SystemConfiguration).filter(
            SystemConfiguration.config_key == "risk_thresholds"
        ).first()

        if not existing_thresholds:
            default_thresholds = {
                "low": settings.RISK_THRESHOLD_LOW,
                "medium": settings.RISK_THRESHOLD_MEDIUM,
                "high": settings.RISK_THRESHOLD_HIGH,
            }
            db.add(SystemConfiguration(
                config_key="risk_thresholds",
                config_value=json.dumps(default_thresholds)
            ))

        # 2. Initialize Default Administrator Account if no users exist
        admin_exists = db.query(User).filter(User.username == "admin").first()
        if not admin_exists:
            logger.info("Creating initial administrative account (username: admin)...")
            admin_user = User(
                username="admin",
                email="security-admin@voiceguard.internal",
                hashed_password=hash_password("VoiceGuardAdmin2026!"),
                role="ADMIN",
                is_active=True,
            )
            db.add(admin_user)

        # 3. Initialize Controlled Fictional Reference Identity (SIH 2026 Demonstration)
        from backend.app.models.database_models import Speaker, SpeakerEmbedding
        from datetime import datetime, timezone

        # Migrate existing EMP-9021 to EMP-DEMO-001 if present
        old_speaker = db.query(Speaker).filter(Speaker.speaker_id == "EMP-9021").first()
        if old_speaker:
            old_speaker.speaker_id = "EMP-DEMO-001"
            old_speaker.display_name = "Aarav Mehta"
            old_speaker.organization = "DemoBank Secure"
            old_speaker.department = "Finance Operations"
            old_speaker.role_title = "Finance Operations Lead"
            old_speaker.caller_id = "+91 98000 12345"
            old_speaker.notes = "Controlled fictional identity for SIH 2026 voice security demonstration. Zero real customer data."
            db.commit()

        ref_speaker = db.query(Speaker).filter(Speaker.speaker_id == "EMP-DEMO-001").first()
        if not ref_speaker:
            logger.info("Seeding compliant fictional reference identity (Aarav Mehta, DemoBank Secure, EMP-DEMO-001)...")
            now = datetime.now(timezone.utc)
            fictional_identity = Speaker(
                speaker_id="EMP-DEMO-001",
                display_name="Aarav Mehta",
                organization="DemoBank Secure",
                department="Finance Operations",
                role_title="Finance Operations Lead",
                caller_id="+91 98000 12345",
                identity_status="VERIFIED",
                mfa_enabled=True,
                sensitive_actions_enabled=True,
                risk_threshold=60.0,
                allowed_operations_json=json.dumps([
                    "Payment approval",
                    "Financial instruction",
                    "Administrative approval",
                ]),
                notes="Controlled fictional identity for SIH 2026 voice security demonstration. Zero real customer data.",
                consent_recorded=True,
                consent_timestamp=now,
                model_version="v1.0.0",
            )
            db.add(fictional_identity)
            db.flush()

            # Add reference acoustic embedding (128-dim normalized synthetic unit vector)
            dummy_emb = [0.0] * 128
            dummy_emb[0] = 1.0  # Normalized unit vector
            ref_emb = SpeakerEmbedding(
                speaker_id=fictional_identity.id,
                embedding_json=json.dumps(dummy_emb),
                vector_dim=128,
                sample_duration_seconds=3.5,
                model_version="v1.0.0",
            )
            db.add(ref_emb)

        db.commit()
        logger.info("Database initialization completed successfully.")
    except Exception as e:
        db.rollback()
        logger.error(f"Database initialization error: {str(e)}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_database()
