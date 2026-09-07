import { useEffect, useRef } from 'react';
import SignaturePadLib from 'signature_pad';

interface Props {
  onChange: (isEmpty: boolean) => void;
}

export interface SignaturePadHandle {
  clear: () => void;
  toPngBlob: () => Promise<Blob | null>;
  isEmpty: () => boolean;
}

// 對應 workplan_v2.md §8：觸控/滑鼠皆可簽名、可清除重簽、輸出透明背景 PNG
export function SignaturePad({
  onChange,
  handleRef,
}: Props & { handleRef: React.MutableRefObject<SignaturePadHandle | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d')!.scale(ratio, ratio);
      padRef.current?.clear();
    };

    // backgroundColor 留空（rgba 全透明），輸出時才會是透明背景 PNG
    const pad = new SignaturePadLib(canvas, { backgroundColor: 'rgba(0,0,0,0)' });
    pad.addEventListener('endStroke', () => onChange(pad.isEmpty()));
    padRef.current = pad;

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    handleRef.current = {
      clear: () => {
        padRef.current?.clear();
        onChange(true);
      },
      isEmpty: () => padRef.current?.isEmpty() ?? true,
      toPngBlob: async () => {
        if (!padRef.current || padRef.current.isEmpty()) return null;
        const dataUrl = padRef.current.toDataURL('image/png');
        const res = await fetch(dataUrl);
        return res.blob();
      },
    };
  });

  return (
    <canvas
      ref={canvasRef}
      className="h-48 w-full touch-none rounded-lg border border-slate-300 bg-white"
    />
  );
}
