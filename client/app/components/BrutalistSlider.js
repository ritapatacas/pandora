'use client';

import { useRef, useCallback, useState } from 'react';

export default function BrutalistSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  label,
  displayValue,
  disabled = false,
  trackColor,
}) {
  const trackRef = useRef(null);
  const lastValueRef = useRef(value);
  const [dragValue, setDragValue] = useState(null);
  const isDragging = dragValue !== null;

  const getValueFromEvent = useCallback(
    (clientX) => {
      if (!trackRef.current) return value;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(min + pct * (max - min));
    },
    [min, max, value]
  );

  const handlePointerDown = useCallback(
    (e) => {
      if (disabled) return;
      e.preventDefault();
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      const v = getValueFromEvent(e.clientX);
      lastValueRef.current = v;
      setDragValue(v);
      const onMove = (ev) => {
        const vv = getValueFromEvent(ev.clientX);
        lastValueRef.current = vv;
        setDragValue(vv);
      };
      const onUp = () => {
        onChange(lastValueRef.current);
        setDragValue(null);
        target.removeEventListener('pointermove', onMove);
        target.removeEventListener('pointerup', onUp);
      };
      target.addEventListener('pointermove', onMove);
      target.addEventListener('pointerup', onUp);
    },
    [disabled, getValueFromEvent, onChange]
  );

  const displayVal = isDragging ? dragValue : value;
  const pct = ((displayVal - min) / (max - min)) * 100;

  return (
    <div className={`space-y-2 ${disabled ? 'opacity-30' : ''}`}>
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className="text-sm font-mono text-foreground">
          {isDragging ? `${displayVal}%` : (displayValue ?? `${displayVal}%`)}
        </span>
      </div>
      <div
        ref={trackRef}
        className="slider-track touch-none"
        onPointerDown={handlePointerDown}
      >
        <div
          className="slider-fill"
          style={{ width: `${pct}%`, backgroundColor: trackColor }}
        />
        <div className="slider-thumb" style={{ left: `${pct}%` }} />
      </div>
    </div>
  );
}
