import React, { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  analyserNode?: AnalyserNode | null;
  isActive: boolean;
  color?: string;
  height?: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  analyserNode,
  isActive,
  color = '#06b6d4', // Cyan
  height = 80,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const width = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, width, h);

      // Draw background grid lines
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(width, h / 2);
      ctx.stroke();

      if (isActive && analyserNode) {
        const bufferLength = analyserNode.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteTimeDomainData(dataArray);

        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.beginPath();

        const sliceWidth = (width * 1.0) / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * h) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, h / 2);
        ctx.stroke();
      } else {
        // Honest baseline when audio is inactive or silent
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(width, h / 2);
        ctx.stroke();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [analyserNode, isActive, color]);

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-slate-800/80 bg-slate-950/80 p-2 shadow-inner">
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1 px-1">
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
          {isActive ? 'LIVE AUDIO INPUT STREAM' : 'INPUT INACTIVE'}
        </span>
        <span>16,000 HZ / PCM FLOAT32</span>
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={height}
        className="w-full h-[70px] block"
      />
    </div>
  );
};
