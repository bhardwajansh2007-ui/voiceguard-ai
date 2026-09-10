import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from backend.app.models.database_models import AuditEvent
from backend.app.core.config import settings
from backend.app.core.logging import logger


class AuditLedger:
    """
    Cryptographic tamper-evident hash-chain audit ledger.
    Guarantees forensic integrity for high-stakes cybersecurity actions and ML risk assessments.
    """

    GENESIS_HASH = settings.GENESIS_BLOCK_HASH

    @staticmethod
    def _canonical_json(data: Dict[str, Any]) -> str:
        """Serializes dictionary to deterministic canonical JSON string."""
        return json.dumps(data, sort_keys=True, separators=(",", ":"), default=str)

    @classmethod
    def _compute_sha256(cls, text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    @classmethod
    def record_event(
        cls,
        db: Session,
        event_type: str,
        payload: Dict[str, Any],
        call_id: Optional[str] = None,
        actor: str = "SYSTEM",
    ) -> AuditEvent:
        """
        Appends a cryptographically chained event to the audit ledger.
        """
        # Fetch the most recent event to establish hash continuity
        last_event = (
            db.query(AuditEvent)
            .order_by(AuditEvent.created_at.desc())
            .first()
        )

        previous_hash = last_event.event_hash if last_event else cls.GENESIS_HASH
        timestamp = datetime.now(timezone.utc)
        event_id = f"EVT-{uuid.uuid4().hex[:12].upper()}"

        ts_str = timestamp.strftime("%Y-%m-%dT%H:%M:%S.%fZ")

        canonical_payload = cls._canonical_json(payload)
        payload_hash = cls._compute_sha256(canonical_payload)

        # Hash chain formula: SHA256(prev_hash + event_type + timestamp + payload_hash)
        chain_string = f"{previous_hash}|{event_type}|{ts_str}|{payload_hash}"
        event_hash = cls._compute_sha256(chain_string)

        audit_entry = AuditEvent(
            event_id=event_id,
            call_id=call_id,
            event_type=event_type,
            payload_json=canonical_payload,
            payload_hash=payload_hash,
            previous_event_hash=previous_hash,
            event_hash=event_hash,
            actor=actor,
            created_at=timestamp,
        )

        try:
            db.add(audit_entry)
            db.commit()
            db.refresh(audit_entry)
            logger.info(
                f"Recorded audit event: {event_id} ({event_type}) with hash {event_hash[:12]}..."
            )
            return audit_entry
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to record audit event: {str(e)}")
            raise

    @classmethod
    def verify_integrity(cls, db: Session) -> Dict[str, Any]:
        """
        Cryptographically verifies the entire audit ledger chain.
        Returns validation status and pinpoints tampering if any block has been altered.
        """
        events = db.query(AuditEvent).order_by(AuditEvent.created_at.asc()).all()
        
        if not events:
            return {
                "is_valid": True,
                "total_events_checked": 0,
                "genesis_hash_verified": True,
                "tampered_event_id": None,
                "verification_message": "Audit ledger is currently empty. Genesis state intact.",
                "verified_at": datetime.now(timezone.utc),
            }

        expected_prev_hash = cls.GENESIS_HASH
        for idx, event in enumerate(events):
            # 1. Verify previous hash link
            if event.previous_event_hash != expected_prev_hash:
                return {
                    "is_valid": False,
                    "total_events_checked": idx,
                    "genesis_hash_verified": False,
                    "tampered_event_id": event.event_id,
                    "verification_message": (
                        f"Chain continuity broken at event {event.event_id}. "
                        f"Expected previous hash {expected_prev_hash[:12]} but found {event.previous_event_hash[:12]}."
                    ),
                    "verified_at": datetime.now(timezone.utc),
                }

            # 2. Verify payload hash integrity
            recomputed_payload_hash = cls._compute_sha256(event.payload_json)
            if recomputed_payload_hash != event.payload_hash:
                return {
                    "is_valid": False,
                    "total_events_checked": idx,
                    "genesis_hash_verified": True,
                    "tampered_event_id": event.event_id,
                    "verification_message": f"Payload corruption detected in event {event.event_id}.",
                    "verified_at": datetime.now(timezone.utc),
                }

            # 3. Verify block event hash
            evt_ts_str = event.created_at.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            chain_string = f"{expected_prev_hash}|{event.event_type}|{evt_ts_str}|{recomputed_payload_hash}"
            recomputed_event_hash = cls._compute_sha256(chain_string)
            if recomputed_event_hash != event.event_hash:
                return {
                    "is_valid": False,
                    "total_events_checked": idx,
                    "genesis_hash_verified": True,
                    "tampered_event_id": event.event_id,
                    "verification_message": f"Cryptographic block signature mismatch for event {event.event_id}.",
                    "verified_at": datetime.now(timezone.utc),
                }

            expected_prev_hash = event.event_hash

        return {
            "is_valid": True,
            "total_events_checked": len(events),
            "genesis_hash_verified": True,
            "tampered_event_id": None,
            "verification_message": f"Forensic integrity verified. All {len(events)} cryptographic blocks are authentic.",
            "verified_at": datetime.now(timezone.utc),
        }


audit_ledger = AuditLedger()
