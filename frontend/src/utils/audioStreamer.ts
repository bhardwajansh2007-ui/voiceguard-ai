/**
 * Audio Streamer Utility for VoiceGuard
 * Streams real audio PCM chunks from benchmark WAV files into the VoiceStreamClient
 * at real-time 16kHz playback rate (512 samples every 32ms) to mimic a live call.
 */

export class AudioFileStreamer {
  private timer: any = null;
  private isPlaying: boolean = false;

  async streamWavUrl(
    wavUrl: string,
    onChunk: (chunk: Int16Array) => void,
    onComplete?: () => void
  ): Promise<void> {
    this.stop();
    this.isPlaying = true;

    try {
      const response = await fetch(wavUrl);
      if (!response.ok) {
        throw new Error('Failed to load audio sample: ' + response.statusText);
      }
      const arrayBuffer = await response.arrayBuffer();

      let pcmOffset = 44;
      const dataView = new DataView(arrayBuffer);

      for (let i = 12; i < Math.min(arrayBuffer.byteLength - 8, 200); i++) {
        if (
          dataView.getUint8(i) === 0x64 &&
          dataView.getUint8(i + 1) === 0x61 &&
          dataView.getUint8(i + 2) === 0x74 &&
          dataView.getUint8(i + 3) === 0x61
        ) {
          pcmOffset = i + 8;
          break;
        }
      }

      const pcmBytes = arrayBuffer.slice(pcmOffset);
      const int16Samples = new Int16Array(pcmBytes);

      const chunkSize = 512;
      const intervalMs = 32;
      let currentIndex = 0;

      this.timer = setInterval(() => {
        if (!this.isPlaying) {
          if (this.timer) clearInterval(this.timer);
          return;
        }

        if (currentIndex >= int16Samples.length) {
          if (this.timer) clearInterval(this.timer);
          this.isPlaying = false;
          if (onComplete) onComplete();
          return;
        }

        const nextIndex = Math.min(currentIndex + chunkSize, int16Samples.length);
        const chunk = int16Samples.slice(currentIndex, nextIndex);
        onChunk(chunk);
        currentIndex = nextIndex;
      }, intervalMs);
    } catch (err) {
      console.error('Failed to stream WAV file:', err);
      this.stop();
      if (onComplete) onComplete();
    }
  }

  stop(): void {
    this.isPlaying = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  isActive(): boolean {
    return this.isPlaying;
  }
}
