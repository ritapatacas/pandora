'use client';

import { useRef, useCallback, useState, useEffect } from 'react';

function hexToHsv(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

function hsvToHex(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export default function InlineColorPicker({ value, onChange, disabled = false }) {
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const padRef = useRef(null);
  const hueRef = useRef(null);

  useEffect(() => {
    const incoming = hexToHsv(value);
    if (hsvToHex(hsv[0], hsv[1], hsv[2]) !== value) setHsv(incoming);
  }, [value]);

  const emitColor = useCallback((h, s, v) => {
    setHsv([h, s, v]);
    onChange(hsvToHex(h, s, v));
  }, [onChange]);

  const handlePad = useCallback((clientX, clientY) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    const s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    emitColor(hsv[0], s, v);
  }, [hsv, emitColor]);

  const handleHue = useCallback((clientX) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const h = Math.max(0, Math.min(359, ((clientX - rect.left) / rect.width) * 360));
    emitColor(h, hsv[1], hsv[2]);
  }, [hsv, emitColor]);

  const makeDrag = (handler) => (e) => {
    if (disabled) return;
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    handler(e.clientX, e.clientY);
    const onMove = (ev) => handler(ev.clientX, ev.clientY);
    const onUp = () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
  };

  const hueColor = `hsl(${hsv[0]}, 100%, 50%)`;

  return (
    <div className={`space-y-3 ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Color</span>
        <span className="text-sm font-mono text-foreground">{value.toUpperCase()}</span>
      </div>
      <div
        ref={padRef}
        className="w-full h-32 relative cursor-crosshair touch-none border border-border"
        style={{ backgroundColor: hueColor }}
        onPointerDown={makeDrag(handlePad)}
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #fff, transparent)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #000, transparent)' }} />
        <div
          className="absolute w-3 h-3 border-2 border-foreground pointer-events-none"
          style={{
            left: `${hsv[1] * 100}%`,
            top: `${(1 - hsv[2]) * 100}%`,
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 0 1px hsl(0 0% 0% / 0.4)',
          }}
        />
      </div>
      <div
        ref={hueRef}
        className="w-full h-4 relative cursor-pointer touch-none border border-border"
        style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
        onPointerDown={makeDrag((x) => handleHue(x))}
      >
        <div
          className="absolute top-0 bottom-0 w-2 border-2 border-foreground pointer-events-none"
          style={{
            left: `${(hsv[0] / 360) * 100}%`,
            transform: 'translateX(-50%)',
            boxShadow: '0 0 0 1px hsl(0 0% 0% / 0.4)',
          }}
        />
      </div>
    </div>
  );
}
