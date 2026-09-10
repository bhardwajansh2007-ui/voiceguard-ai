export interface User {
  id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'SECURITY_ANALYST' | 'AUTHORIZED_OPERATOR';
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
  user_id: string;
  username: string;
  role: string;
}

export interface CallSession {
  id: string;
  call_id: string;
  caller_id?: string;
  claimed_identity?: string;
  source_type?: 'COMMUNICATION_SANDBOX' | 'MICROPHONE' | 'AUDIO_UPLOAD' | 'EXTERNAL_INTEGRATION' | string;
  action_type: string;
  action_sensitivity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  transaction_amount?: number;
  authentication_state: string;
  status: 'ACTIVE' | 'HOLD' | 'VERIFIED' | 'COMPLETED' | 'TERMINATED';
  created_at: string;
  updated_at: string;
}

export type ProtectedActionCategory =
  | 'FINANCIAL_ACTION'
  | 'CREDENTIAL_ACTION'
  | 'CONFIDENTIAL_INFORMATION'
  | 'ADMINISTRATIVE_ACTION'
  | 'OTHER_SENSITIVE_ACTION'
  | 'WIRE_TRANSFER'
  | 'CREDENTIAL_RESET'
  | 'SYSTEM_ACCESS'
  | 'GENERAL_INQUIRY';

export type CommunicationSourceType =
  | 'COMMUNICATION_SANDBOX'
  | 'MICROPHONE'
  | 'AUDIO_UPLOAD'
  | 'EXTERNAL_INTEGRATION';

export interface AcousticFeatures {
  duration_seconds: number;
  sample_rate: number;
  vad_speech_ratio: number;
  rms_energy: number;
  spectral_centroid: number;
  spectral_bandwidth: number;
  spectral_rolloff: number;
  zero_crossing_rate: number;
  fundamental_frequency_f0: number;
  jitter_local: number;
  shimmer_local: number;
  mfcc_mean: number[];
}

export interface AntiSpoofResult {
  status: 'GENUINE' | 'SPOOF' | 'UNCERTAIN' | 'MODEL_NOT_CONFIGURED';
  spoof_probability: number | null;
  genuine_probability: number | null;
  confidence: number;
  model_version: string;
}

export interface SpeakerVerificationResult {
  status: 'MATCH' | 'MISMATCH' | 'NO_ENROLLMENT_FOUND' | 'SKIPPED';
  similarity: number | null;
  confidence: number;
  claimed_speaker_id?: string;
}

export interface RiskAssessmentData {
  overall_risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  signal_values: Record<string, number>;
  weights_used: Record<string, number>;
  contributing_factors: string[];
  risk_engine_version?: string;
  evaluated_at?: string;
}

export interface SecurityDecisionData {
  id?: string;
  call_id: string;
  decision: 'ALLOW' | 'ADDITIONAL_VERIFICATION' | 'STRONG_VERIFICATION' | 'HOLD_SENSITIVE_ACTION';
  reason: string;
  required_action: string;
  action_status: 'PENDING' | 'RESOLVED_ALLOW' | 'RESOLVED_BLOCKED' | 'OVERRIDDEN';
  analyst_notes?: string;
  resolved_by?: string;
  decided_at?: string;
}

export interface CallDetailResponse {
  call_id: string;
  caller_id?: string;
  claimed_identity?: string;
  source_type?: string;
  action_type: string;
  action_sensitivity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  transaction_amount?: number;
  authentication_state: string;
  status: string;
  created_at: string;
  updated_at: string;
  latest_analysis: {
    duration_seconds: number;
    vad_speech_ratio: number;
    anti_spoof_status: string;
    spoof_probability: number | null;
    genuine_probability: number | null;
    model_confidence: number;
    speaker_verification_status: string;
    speaker_similarity: number | null;
    behavioral_risk_score: number;
    features?: AcousticFeatures;
    analyzed_at: string;
  } | null;
  latest_risk: RiskAssessmentData | null;
  latest_decision: SecurityDecisionData | null;
}

export interface Speaker {
  id: string;
  speaker_id: string;
  display_name: string;
  organization?: string;
  department?: string;
  role_title?: string;
  caller_id?: string;
  identity_status?: 'VERIFIED' | 'PENDING' | 'SUSPENDED';
  mfa_enabled?: boolean;
  sensitive_actions_enabled?: boolean;
  risk_threshold?: number;
  allowed_operations?: string[];
  notes?: string;
  consent_recorded: boolean;
  consent_timestamp?: string;
  model_version: string;
  has_embedding: boolean;
  created_at: string;
}

export type IdentityProfile = Speaker;

export interface CallerIntelligenceDossier {
  caller_name: string;
  organization: string;
  department: string;
  role_title: string;
  caller_id: string;
  speaker_id: string;
  identity_status: string;
  organization_trust_status: string;
  mfa_enabled: boolean;
  has_voice_enrollment: boolean;
  previous_sessions_count: number;
  average_historical_risk: number | null;
  active_call_id: string | null;
  active_call_status: string | null;
  action_type: string;
  action_sensitivity: string;
  transaction_amount: number | null;
  speaker_verification_status: string;
  speaker_match_percentage: number | null;
  voice_authenticity_status: string;
  voice_authenticity_percentage: number | null;
  deepfake_probability_percentage: number | null;
  caller_risk_level: string;
  behavior_risk_level: string;
  transaction_risk_level: string;
  overall_risk_score: number | null;
  overall_risk_level: string;
  contributing_factors: string[];
  recommended_decision: string;
  action_status: string;
}

export interface ProtectedActionSimulationResult {
  call_id: string;
  action_type: string;
  description: string;
  simulated_amount: number;
  risk_score: number;
  decision: string;
  required_action: string;
  status: string;
  message: string;
  simulated_only: boolean;
}

export interface AuditEvent {
  id: string;
  event_id: string;
  call_id?: string;
  event_type: string;
  payload: Record<string, any>;
  payload_hash: string;
  previous_event_hash: string;
  event_hash: string;
  actor: string;
  timestamp: string;
}

export interface AuditChainVerification {
  is_valid: boolean;
  total_events_checked: number;
  genesis_hash_verified: boolean;
  tampered_event_id?: string | null;
  verification_message: string;
  verified_at: string;
}

export interface ComponentHealth {
  status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN' | 'NOT_CONFIGURED';
  latency_ms?: number;
  message?: string;
}

export interface SystemHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  app_name: string;
  environment: string;
  deployment_mode: string;
  timestamp: string;
  uptime_seconds: number;
  components: Record<string, ComponentHealth>;
}

export interface ModelHealth {
  anti_spoof_model: {
    model_name: string;
    model_version: string;
    status: string;
    is_loaded: boolean;
    device: string;
    configured_path: string;
    last_latency_ms?: number;
  };
  speaker_verification_model: {
    model_name: string;
    model_version: string;
    status: string;
    vector_dim: number;
    is_custom_checkpoint: boolean;
    device: string;
    last_latency_ms?: number;
  };
  device: string;
  is_gpu_available: boolean;
  gpu_device_name?: string;
  checked_at: string;
}

export interface StreamingAnalysisUpdate {
  type: 'ANALYSIS_UPDATE';
  call_id: string;
  source_type?: string;
  chunk_index: number;
  window_duration: number;
  vad_active: boolean;
  vad_speech_ratio: number;
  voice_authenticity: AntiSpoofResult;
  speaker_verification: SpeakerVerificationResult;
  behavioral_risk: number;
  overall_risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommended_action: string;
  required_action?: string;
  decision_reason?: string;
  contributing_factors: string[];
  signals?: Record<string, number>;
  timestamp: string;
}

export interface BufferStatusUpdate {
  type: 'BUFFER_STATUS';
  call_id: string;
  buffered_seconds: number;
  target_seconds: number;
  progress_pct: number;
  energy_level: number;
  participants_count: number;
}

export interface IntegrationSourceStatus {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string;
  latency_ms: number;
}

export interface IntegrationStatusResponse {
  gateway_name: string;
  gateway_version: string;
  deployment_mode: string;
  timestamp: string;
  disclaimer: string;
  sources: IntegrationSourceStatus[];
  api_endpoints: { method: string; path: string; purpose: string }[];
}


