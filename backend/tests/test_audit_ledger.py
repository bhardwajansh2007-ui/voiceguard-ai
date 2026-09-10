from backend.app.db.database import SessionLocal
from backend.app.models.database_models import AuditEvent
from backend.app.services.audit.ledger import AuditLedger


def test_audit_ledger_hash_chain_and_tamper_detection():
    db = SessionLocal()
    try:
        # Clear test events
        db.query(AuditEvent).delete()
        db.commit()

        # 1. Record series of events
        evt1 = AuditLedger.record_event(
            db=db,
            event_type="CALL_STARTED",
            payload={"call_id": "CALL-101", "caller": "+919876543210"},
            actor="SYSTEM",
        )
        assert evt1.previous_event_hash == AuditLedger.GENESIS_HASH

        evt2 = AuditLedger.record_event(
            db=db,
            event_type="ANALYSIS_COMPLETED",
            payload={"call_id": "CALL-101", "score": 24.5},
            actor="PIPELINE",
        )
        assert evt2.previous_event_hash == evt1.event_hash

        evt3 = AuditLedger.record_event(
            db=db,
            event_type="SECURITY_DECISION",
            payload={"call_id": "CALL-101", "decision": "ALLOW"},
            actor="POLICY",
        )
        assert evt3.previous_event_hash == evt2.event_hash

        # 2. Verify pristine chain
        report = AuditLedger.verify_integrity(db)
        assert report["is_valid"] is True
        assert report["total_events_checked"] == 3
        assert report["tampered_event_id"] is None

        # 3. Simulate malicious database tampering on block 2
        evt2.payload_json = '{"call_id":"CALL-101","score":99.9}'
        db.commit()

        # 4. Verify tampering is detected and event ID pinpointed
        tampered_report = AuditLedger.verify_integrity(db)
        assert tampered_report["is_valid"] is False
        assert tampered_report["tampered_event_id"] == evt2.event_id
        assert "Payload corruption detected" in tampered_report["verification_message"]

    finally:
        # Cleanup
        db.query(AuditEvent).delete()
        db.commit()
        db.close()
