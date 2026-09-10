import { StreamingAnalysisUpdate, BufferStatusUpdate } from '../types';

export class VoiceStreamClient {
  private ws: WebSocket | null = null;
  private callId: string;
  private onUpdate: (update: StreamingAnalysisUpdate) => void;
  private onError: (error: string) => void;
  private onReady?: () => void;
  private onBufferStatus?: (status: BufferStatusUpdate) => void;
  private onParticipantUpdate?: (count: number) => void;

  constructor(
    callId: string,
    onUpdate: (update: StreamingAnalysisUpdate) => void,
    onError: (error: string) => void,
    onReady?: () => void,
    onBufferStatus?: (status: BufferStatusUpdate) => void,
    onParticipantUpdate?: (count: number) => void
  ) {
    this.callId = callId;
    this.onUpdate = onUpdate;
    this.onError = onError;
    this.onReady = onReady;
    this.onBufferStatus = onBufferStatus;
    this.onParticipantUpdate = onParticipantUpdate;
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/calls/${this.callId}/stream`;

    this.ws = new WebSocket(url);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      console.log(`[WebSocket] Connected to audio stream for call ${this.callId}`);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'STREAM_READY') {
          if (this.onReady) this.onReady();
          if (msg.participants_count && this.onParticipantUpdate) {
            this.onParticipantUpdate(msg.participants_count);
          }
        } else if (msg.type === 'BUFFER_STATUS') {
          if (this.onBufferStatus) this.onBufferStatus(msg as BufferStatusUpdate);
        } else if (msg.type === 'PARTICIPANT_UPDATE') {
          if (this.onParticipantUpdate) this.onParticipantUpdate(msg.participants_count);
        } else if (msg.type === 'ANALYSIS_UPDATE') {
          this.onUpdate(msg as StreamingAnalysisUpdate);
        } else if (msg.type === 'ERROR') {
          this.onError(msg.message || 'Stream processing error');
        }
      } catch (err) {
        console.error('[WebSocket] Parse error:', err);
      }
    };

    this.ws.onerror = (err) => {
      console.error('[WebSocket] Connection error:', err);
      this.onError('WebSocket connection error');
    };

    this.ws.onclose = () => {
      console.log(`[WebSocket] Closed connection for call ${this.callId}`);
    };
  }

  sendAudioChunk(chunk: Int16Array) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(chunk.buffer as ArrayBuffer);
    }
  }

  stop() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'STOP_STREAM' }));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
