import asyncio
import json
from datetime import datetime, timezone
from typing import Dict, Set, List, Optional
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from backend.app.db.database import get_db, SessionLocal
from backend.app.models.database_models import CallSession, Speaker, SpeakerEmbedding, AudioAnalysis, RiskAssessment, SecurityDecision
from backend.app.services.audio.preprocessor import AudioPreprocessor
from backend.app.services.audio.vad import vad_detector
from backend.app.services.ml.feature_extraction.acoustic import extractor
from backend.app.services.ml.anti_spoof.adapter import anti_spoof_adapter
from backend.app.services.ml.speaker_verification.adapter import speaker_verification_adapter
from backend.app.services.risk.behavioral import behavioral_engine
from backend.app.services.risk.context_engine import context_risk_engine
from backend.app.services.risk.fusion_engine import risk_fusion_engine
from backend.app.services.security.policy_engine import policy_engine
from backend.app.services.audit.ledger import audit_ledger
from backend.app.schemas.analysis import SpeakerVerificationResult
from backend.app.core.config import settings
from backend.app.core.logging import logger

router = APIRouter(tags=["Real-Time WebSocket Streaming"])


class CallConnectionManager:
    """
    Manages concurrent WebSocket connections for each monitored call session.
    Allows two different devices (e.g. Remote Caller on Phone + Security Analyst on Laptop)
    to connect to the same call room simultaneously.
    """

    def __init__(self):
        self._connections: Dict[str, Set[WebSocket]] = {}
        self._buffers: Dict[str, np.ndarray] = {}
        self._chunk_indices: Dict[str, int] = {}
        self._locks: Dict[str, asyncio.Lock] = {}

    def get_lock(self, call_id: str) -> asyncio.Lock:
        if call_id not in self._locks:
            self._locks[call_id] = asyncio.Lock()
        return self._locks[call_id]

    async def connect(self, call_id: str, websocket: WebSocket):
        await websocket.accept()
        if call_id not in self._connections:
            self._connections[call_id] = set()
            self._buffers[call_id] = np.array([], dtype=np.float32)
            self._chunk_indices[call_id] = 0
            self._locks[call_id] = asyncio.Lock()

        self._connections[call_id].add(websocket)
        logger.info(
            f"WebSocket client connected to call session {call_id}. Total participants: {len(self._connections[call_id])}"
        )

    def disconnect(self, call_id: str, websocket: WebSocket):
        if call_id in self._connections:
            self._connections[call_id].discard(websocket)
            logger.info(
                f"WebSocket client disconnected from call session {call_id}. Remaining: {len(self._connections[call_id])}"
            )
            if not self._connections[call_id]:
                del self._connections[call_id]
                self._buffers.pop(call_id, None)
                self._chunk_indices.pop(call_id, None)
                self._locks.pop(call_id, None)

    async def broadcast(self, call_id: str, message: dict):
        if call_id not in self._connections:
            return
        dead_sockets = []
        for ws in list(self._connections[call_id]):
            try:
                await ws.send_json(message)
            except Exception:
                dead_sockets.append(ws)
        for dead_ws in dead_sockets:
            self.disconnect(call_id, dead_ws)

    def get_buffer(self, call_id: str) -> np.ndarray:
        return self._buffers.get(call_id, np.array([], dtype=np.float32))

    def append_buffer(self, call_id: str, chunk: np.ndarray) -> np.ndarray:
        current = self.get_buffer(call_id)
        updated = np.concatenate([current, chunk])
        self._buffers[call_id] = updated
        return updated

    def advance_buffer(self, call_id: str, hop_samples: int):
        if call_id in self._buffers:
            self._buffers[call_id] = self._buffers[call_id][hop_samples:]

    def next_chunk_index(self, call_id: str) -> int:
        idx = self._chunk_indices.get(call_id, 0) + 1
        self._chunk_indices[call_id] = idx
        return idx

    def participant_count(self, call_id: str) -> int:
        return len(self._connections.get(call_id, []))


manager = CallConnectionManager()


@router.websocket("/ws/calls/{call_id}/stream")
async def audio_stream_websocket(websocket: WebSocket, call_id: str):
    """
    Real-time bidirectional WebSocket connection for live audio streaming.
    Applies sliding window VAD, acoustic feature extraction, ML inference,
    risk fusion, and pushes progressive security intelligence updates.
    """
    db: Session = SessionLocal()
    try:
        call = db.query(CallSession).filter(CallSession.call_id == call_id).first()
        if not call:
            await websocket.accept()
            await websocket.send_json({
                "type": "ERROR",
                "message": f"Call session {call_id} does not exist. Initialize call session first.",
            })
            await websocket.close(code=1008)
            return

        # Fetch enrolled speaker embedding if claimed identity is registered
        enrolled_embedding = None
        if call.claimed_identity:
            speaker = db.query(Speaker).filter(Speaker.speaker_id == call.claimed_identity).first()
            if speaker and speaker.embeddings:
                enrolled_embedding = json.loads(speaker.embeddings[0].embedding_json)

        # Connect client to shared room manager
        await manager.connect(call_id, websocket)

        sample_rate = settings.AUDIO_SAMPLE_RATE
        window_samples = int(settings.STREAM_WINDOW_SIZE_SECONDS * sample_rate)
        hop_samples = int(settings.STREAM_STEP_SIZE_SECONDS * sample_rate)

        await websocket.send_json({
            "type": "STREAM_READY",
            "call_id": call_id,
            "sample_rate": sample_rate,
            "window_size_seconds": settings.STREAM_WINDOW_SIZE_SECONDS,
            "participants_count": manager.participant_count(call_id),
            "message": "Real-time acoustic analysis pipeline active and listening.",
        })

        if manager.participant_count(call_id) > 1:
            await manager.broadcast(
                call_id,
                {
                    "type": "PARTICIPANT_UPDATE",
                    "call_id": call_id,
                    "participants_count": manager.participant_count(call_id),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            )

        lock = manager.get_lock(call_id)

        while True:
            message = await websocket.receive()
            if "bytes" in message and message["bytes"]:
                raw_bytes = message["bytes"]
                # Convert 16-bit PCM chunk to normalized float32
                chunk_audio = AudioPreprocessor.decode_raw_pcm_chunk(raw_bytes)
                chunk_rms = float(np.sqrt(np.mean(chunk_audio**2))) if len(chunk_audio) > 0 else 0.0

                async with lock:
                    audio_buffer = manager.append_buffer(call_id, chunk_audio)
                    buffered_len = len(audio_buffer)

                    # Immediate buffer progress broadcast to all devices on this call
                    progress_pct = min(100, int((buffered_len / window_samples) * 100))
                    buffered_sec = round(buffered_len / sample_rate, 2)

                    await manager.broadcast(
                        call_id,
                        {
                            "type": "BUFFER_STATUS",
                            "call_id": call_id,
                            "buffered_seconds": buffered_sec,
                            "target_seconds": settings.STREAM_WINDOW_SIZE_SECONDS,
                            "progress_pct": progress_pct,
                            "energy_level": round(min(1.0, chunk_rms * 6.0), 3),
                            "participants_count": manager.participant_count(call_id),
                        },
                    )

                    # Process whenever window is full
                    while len(manager.get_buffer(call_id)) >= window_samples:
                        chunk_index = manager.next_chunk_index(call_id)
                        curr_buffer = manager.get_buffer(call_id)
                        window_audio = curr_buffer[:window_samples]

                        # 1. Voice Activity Detection
                        is_active, speech_ratio, _ = vad_detector.process(window_audio)

                        if not is_active:
                            # Non-speech / ambient silence: report state honestly without fabricating risk
                            await manager.broadcast(
                                call_id,
                                {
                                    "type": "ANALYSIS_UPDATE",
                                    "call_id": call_id,
                                    "chunk_index": chunk_index,
                                    "window_duration": settings.STREAM_WINDOW_SIZE_SECONDS,
                                    "vad_active": False,
                                    "vad_speech_ratio": round(speech_ratio, 3),
                                    "status": "SILENCE_OR_AMBIENT_NOISE",
                                    "voice_authenticity": {
                                        "status": "SILENCE",
                                        "spoof_probability": None,
                                        "genuine_probability": None,
                                        "confidence": 0.0,
                                    },
                                    "speaker_verification": {
                                        "status": "SKIPPED_SILENCE",
                                        "similarity": None,
                                        "confidence": 0.0,
                                        "claimed_speaker_id": call.claimed_identity,
                                    },
                                    "overall_risk_score": 0.0,
                                    "risk_level": "LOW",
                                    "recommended_action": "ALLOW",
                                    "required_action": "CONTINUE_MONITORING",
                                    "decision_reason": "Acoustic silence or ambient background noise (no speech detected)",
                                    "contributing_factors": ["Acoustic silence or ambient background noise"],
                                    "signals": {
                                        "voice_authenticity": 0.0,
                                        "speaker_verification": 0.0,
                                        "behavioral_anomaly": 0.0,
                                        "caller_reputation": 0.0,
                                        "transaction_sensitivity": 0.0,
                                    },
                                    "timestamp": datetime.now(timezone.utc).isoformat(),
                                },
                            )
                        else:
                            # 2. Extract Acoustic Features
                            features = extractor.extract_features(window_audio, vad_speech_ratio=speech_ratio)

                            # Compute Forensic Audio Integrity Hash for Streaming Chunk
                            import hashlib
                            chunk_hash = hashlib.sha256(window_audio.tobytes()).hexdigest()
                            diagnostic = {
                                "audio_sha256": chunk_hash,
                                "duration_seconds": settings.STREAM_WINDOW_SIZE_SECONDS,
                                "sample_rate": sample_rate,
                                "sample_count": len(window_audio),
                                "vad_speech_ratio": round(speech_ratio, 3),
                                "inference_device": anti_spoof_adapter.device,
                                "inference_timestamp": datetime.now(timezone.utc).isoformat(),
                            }

                            # 3. Anti-Spoof ML Inference
                            anti_spoof_res = anti_spoof_adapter.predict(window_audio)

                            # 4. Speaker Verification
                            if enrolled_embedding is not None:
                                curr_emb = speaker_verification_adapter.compute_embedding(window_audio)
                                sim = speaker_verification_adapter.verify_similarity(enrolled_embedding, curr_emb)
                                emb_hash = hashlib.sha256(json.dumps(curr_emb).encode()).hexdigest()[:16]
                                ref_hash = hashlib.sha256(json.dumps(enrolled_embedding).encode()).hexdigest()[:16]
                                diagnostic["embedding_hash"] = emb_hash
                                diagnostic["reference_embedding_hash"] = ref_hash
                                spk_thresh = getattr(settings, "SPEAKER_VERIFICATION_THRESHOLD", 0.880)
                                sp_status = "MATCH" if sim >= spk_thresh else "MISMATCH"
                                conf_level = "HIGH" if sim >= 0.92 else ("MEDIUM" if sim >= spk_thresh else "LOW")
                                speaker_res = SpeakerVerificationResult(
                                    status=sp_status,
                                    similarity=round(sim, 4),
                                    confidence=round(abs(sim), 4),
                                    confidence_level=conf_level,
                                    claimed_speaker_id=call.claimed_identity,
                                    reference_id=call.claimed_identity,
                                    model={
                                        "name": "SpeakerVerification-AcousticEmbed",
                                        "version": speaker_verification_adapter.model_version,
                                        "type": "Handcrafted 128-D Acoustic Vector",
                                    },
                                    input_audio_hash=chunk_hash,
                                    reference_embedding_hash=ref_hash,
                                )
                            elif call.claimed_identity:
                                speaker_res = SpeakerVerificationResult(
                                    status="NO_ENROLLMENT_FOUND",
                                    similarity=None,
                                    confidence=0.0,
                                    claimed_speaker_id=call.claimed_identity,
                                )
                            else:
                                speaker_res = SpeakerVerificationResult(
                                    status="SKIPPED",
                                    similarity=None,
                                    confidence=0.0,
                                    claimed_speaker_id=None,
                                )

                            # 5. Behavioral Risk
                            behavioral_score, beh_factors = behavioral_engine.evaluate(features)

                            # 6. Context Risk
                            caller_risk, trans_risk, ctx_factors = context_risk_engine.evaluate(
                                action_type=call.action_type,
                                action_sensitivity=call.action_sensitivity,
                                transaction_amount=call.transaction_amount,
                                caller_id=call.caller_id,
                                authentication_state=call.authentication_state,
                            )

                            # 7. Risk Fusion
                            (
                                overall_score,
                                risk_level,
                                signals,
                                weights_used,
                                fusion_factors,
                            ) = risk_fusion_engine.calculate_risk(
                                anti_spoof=anti_spoof_res,
                                speaker_res=speaker_res,
                                behavioral_score=behavioral_score,
                                caller_risk=caller_risk,
                                transaction_risk=trans_risk,
                            )

                            all_factors = fusion_factors + beh_factors + ctx_factors

                            # 8. Security Policy Decision
                            decision, reason, req_action = policy_engine.evaluate_policy(
                                risk_score=overall_score,
                                risk_level=risk_level,
                                action_type=call.action_type,
                                action_sensitivity=call.action_sensitivity,
                                transaction_amount=call.transaction_amount,
                                spoof_probability=anti_spoof_res.spoof_probability,
                                contributing_factors=all_factors,
                            )

                            if decision == "HOLD_SENSITIVE_ACTION" and call.status != "HOLD":
                                call.status = "HOLD"
                                db.commit()

                            # Dispatch progressive update to all listening clients
                            await manager.broadcast(
                                call_id,
                                {
                                    "type": "ANALYSIS_UPDATE",
                                    "call_id": call_id,
                                    "chunk_index": chunk_index,
                                    "window_duration": settings.STREAM_WINDOW_SIZE_SECONDS,
                                    "vad_active": True,
                                    "vad_speech_ratio": round(speech_ratio, 3),
                                    "voice_authenticity": anti_spoof_res.model_dump(),
                                    "speaker_verification": speaker_res.model_dump(),
                                    "behavioral_risk": behavioral_score,
                                    "overall_risk_score": overall_score,
                                    "risk_level": risk_level,
                                    "recommended_action": decision,
                                    "required_action": req_action,
                                    "decision_reason": reason,
                                    "contributing_factors": all_factors,
                                    "signals": signals,
                                    "diagnostic": diagnostic,
                                    "timestamp": datetime.now(timezone.utc).isoformat(),
                                },
                            )

                        # Advance window by hop_samples
                        manager.advance_buffer(call_id, hop_samples)

            elif "text" in message and message["text"]:
                try:
                    data = json.loads(message["text"])
                    if data.get("action") == "STOP_STREAM":
                        logger.info(f"Stream termination command received for {call_id}")
                        await manager.broadcast(call_id, {"type": "STREAM_STOPPED", "call_id": call_id})
                        break
                except json.JSONDecodeError:
                    pass

    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected for call session {call_id}")
    except Exception as e:
        logger.error(f"WebSocket error in audio stream: {str(e)}")
        try:
            await websocket.send_json({"type": "ERROR", "message": f"Stream error: {str(e)}"})
        except Exception:
            pass
    finally:
        manager.disconnect(call_id, websocket)
        db.close()
