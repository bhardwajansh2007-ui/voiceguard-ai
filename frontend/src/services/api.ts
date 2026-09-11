import {
  AuthResponse,
  User,
  CallSession,
  CallDetailResponse,
  Speaker,
  AuditEvent,
  AuditChainVerification,
  SystemHealth,
  ModelHealth,
  SecurityDecisionData,
  IntegrationStatusResponse,
  ProtectedActionSimulationResult,
} from '../types';

const API_BASE = '/api/v1';

function getHeaders(isFormData = false): HeadersInit {
  const token = localStorage.getItem('voiceguard_token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'An unexpected API error occurred';
    try {
      const err = await res.json();
      errorDetail = err.detail || err.message || errorDetail;
    } catch {
      errorDetail = `HTTP ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }
  if (res.status === 204) {
    return {} as T;
  }
  return res.json();
}

export const api = {
  auth: {
    login: async (formData: FormData): Promise<AuthResponse> => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: formData,
      });
      return handleResponse<AuthResponse>(res);
    },
    register: async (userData: { username: string; email: string; password: string; role?: string }): Promise<User> => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(userData),
      });
      return handleResponse<User>(res);
    },
    me: async (): Promise<User> => {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: getHeaders(),
      });
      return handleResponse<User>(res);
    },
  },

  calls: {
    list: async (statusFilter?: string): Promise<CallSession[]> => {
      const query = statusFilter ? `?status_filter=${statusFilter}` : '';
      const res = await fetch(`${API_BASE}/calls${query}`, {
        headers: getHeaders(),
      });
      return handleResponse<CallSession[]>(res);
    },
    get: async (callId: string): Promise<CallDetailResponse> => {
      const res = await fetch(`${API_BASE}/calls/${callId}`, {
        headers: getHeaders(),
      });
      return handleResponse<CallDetailResponse>(res);
    },
    create: async (data: Partial<CallSession>): Promise<CallSession> => {
      const res = await fetch(`${API_BASE}/calls`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse<CallSession>(res);
    },
    updateContext: async (callId: string, data: Record<string, any>): Promise<CallSession> => {
      const res = await fetch(`${API_BASE}/calls/${callId}/context`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse<CallSession>(res);
    },
    uploadAudio: async (callId: string, file: File): Promise<any> => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/calls/${callId}/audio`, {
        method: 'POST',
        headers: getHeaders(true),
        body: formData,
      });
      return handleResponse<any>(res);
    },
    end: async (callId: string): Promise<any> => {
      const res = await fetch(`${API_BASE}/calls/${callId}/end`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse<any>(res);
    },
  },

  speakers: {
    list: async (): Promise<Speaker[]> => {
      const res = await fetch(`${API_BASE}/speakers`, {
        headers: getHeaders(),
      });
      return handleResponse<Speaker[]>(res);
    },
    enroll: async (formData: FormData): Promise<Speaker> => {
      const res = await fetch(`${API_BASE}/speakers/enroll`, {
        method: 'POST',
        headers: getHeaders(true),
        body: formData,
      });
      return handleResponse<Speaker>(res);
    },
    delete: async (speakerId: string): Promise<void> => {
      const res = await fetch(`${API_BASE}/speakers/${speakerId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse<void>(res);
    },
    create: async (data: Partial<Speaker>): Promise<Speaker> => {
      const res = await fetch(`${API_BASE}/speakers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse<Speaker>(res);
    },
    update: async (speakerId: string, data: Partial<Speaker>): Promise<Speaker> => {
      const res = await fetch(`${API_BASE}/speakers/${speakerId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse<Speaker>(res);
    },
    enrollExisting: async (speakerId: string, formData: FormData): Promise<Speaker> => {
      const res = await fetch(`${API_BASE}/speakers/${speakerId}/enroll`, {
        method: 'POST',
        headers: getHeaders(true),
        body: formData,
      });
      return handleResponse<Speaker>(res);
    },
  },

  callerIntelligence: {
    lookup: async (query?: string, callId?: string): Promise<any> => {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      if (callId) params.append('call_id', callId);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${API_BASE}/caller-intelligence/lookup${queryString}`, {
        headers: getHeaders(),
      });
      return handleResponse<any>(res);
    },
    listRecent: async (limit = 10): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/caller-intelligence/recent?limit=${limit}`, {
        headers: getHeaders(),
      });
      return handleResponse<any[]>(res);
    },
  },

  security: {
    listDecisions: async (statusFilter?: string): Promise<SecurityDecisionData[]> => {
      const query = statusFilter ? `?status_filter=${statusFilter}` : '';
      const res = await fetch(`${API_BASE}/security/decisions${query}`, {
        headers: getHeaders(),
      });
      return handleResponse<SecurityDecisionData[]>(res);
    },
    resolveDecision: async (callId: string, actionStatus: string, notes?: string): Promise<SecurityDecisionData> => {
      const res = await fetch(`${API_BASE}/security/decisions/${callId}/resolve`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action_status: actionStatus, analyst_notes: notes }),
      });
      return handleResponse<SecurityDecisionData>(res);
    },
    initiateVerification: async (callId: string, method: string, details?: string): Promise<any> => {
      const res = await fetch(`${API_BASE}/security/verification/${callId}/initiate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ method, details }),
      });
      return handleResponse<any>(res);
    },
    completeVerification: async (callId: string, code: string): Promise<any> => {
      const res = await fetch(`${API_BASE}/security/verification/${callId}/complete?verification_code=${encodeURIComponent(code)}`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse<any>(res);
    },
    simulateSensitiveAction: async (payload: {
      call_id?: string;
      action_type?: string;
      action_description?: string;
      simulated_amount?: number;
    }): Promise<ProtectedActionSimulationResult> => {
      const res = await fetch(`${API_BASE}/security/actions/simulate-sensitive-action`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return handleResponse<ProtectedActionSimulationResult>(res);
    },
  },

  audit: {
    list: async (eventType?: string): Promise<AuditEvent[]> => {
      const query = eventType ? `?event_type=${eventType}` : '';
      const res = await fetch(`${API_BASE}/audit${query}`, {
        headers: getHeaders(),
      });
      return handleResponse<AuditEvent[]>(res);
    },
    getCallTrail: async (callId: string): Promise<AuditEvent[]> => {
      const res = await fetch(`${API_BASE}/audit/call/${callId}`, {
        headers: getHeaders(),
      });
      return handleResponse<AuditEvent[]>(res);
    },
    verifyChain: async (): Promise<AuditChainVerification> => {
      const res = await fetch(`${API_BASE}/audit/verify-chain`, {
        headers: getHeaders(),
      });
      return handleResponse<AuditChainVerification>(res);
    },
  },

  health: {
    getSystemHealth: async (): Promise<SystemHealth> => {
      const res = await fetch(`${API_BASE}/health`);
      return handleResponse<SystemHealth>(res);
    },
  },

  models: {
    getStatus: async (): Promise<ModelHealth> => {
      const res = await fetch(`${API_BASE}/models/status`);
      return handleResponse<ModelHealth>(res);
    },
  },

  integration: {
    getStatus: async (): Promise<IntegrationStatusResponse> => {
      const res = await fetch(`${API_BASE}/integration/status`, {
        headers: getHeaders(),
      });
      return handleResponse<IntegrationStatusResponse>(res);
    },
  },
};
