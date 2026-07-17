'use client';

import { useRef, useCallback, useState } from 'react';

const TRACK_HEIGHT = 4;
const THUMB_SIZE = 20;
const VERTICAL_BAR_WIDTH = 4;
const ZONE_HEIGHT = 80;

export default function BrightnessSlider({ value, onChange, disabled = false }) {
  const containerRef = useRef(null);
  const lastValueRef = useRef(value);
  const [dragValue, setDragValue] = useState(null);
  const isDragging = dragValue !== null;

  const getValueFromPointer = useCallback((clientX, clientY) => {
    if (!containerRef.current) return value;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const trackW = rect.width - VERTICAL_BAR_WIDTH;
    if (trackW <= 0) return value;
    if (x < VERTICAL_BAR_WIDTH) {
      const pct = 1 - Math.max(0, Math.min(1, y / ZONE_HEIGHT));
      return Math.round(pct * 100) / 100;
    }
    const pct = Math.max(0, Math.min(1, (x - VERTICAL_BAR_WIDTH) / trackW));
    return Math.round(1 + pct * 99);
  }, [value]);

  const handlePointerDown = useCallback(
    (e) => {
      if (disabled) return;
      e.preventDefault();
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      const v = getValueFromPointer(e.clientX, e.clientY);
      lastValueRef.current = v;
      setDragValue(v);
      const onMove = (ev) => {
        const vv = getValueFromPointer(ev.clientX, ev.clientY);
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
    [disabled, getValueFromPointer, onChange]
  );

  const displayVal = isDragging ? dragValue : value;
  const inVerticalRange = displayVal <= 1;
  const thumbPct = displayVal <= 1 ? 0 : (displayVal - 1) / 99;
  const verticalThumbTop = THUMB_SIZE / 2 + (1 - Math.min(1, displayVal)) * (ZONE_HEIGHT - THUMB_SIZE);
  const cornerLeft = VERTICAL_BAR_WIDTH;
  const cornerTop = TRACK_HEIGHT / 2;

  return (
    <div className={`space-y-2 ${disabled ? 'opacity-30' : ''}`}>
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Brightness</span>
        <span className="text-sm font-mono text-foreground">{displayVal}%</span>
      </div>
      <div
        ref={containerRef}
        className="brightness-slider touch-none cursor-pointer"
        style={{ height: ZONE_HEIGHT }}
        onPointerDown={handlePointerDown}
      >
        <div className="brightness-slider__vertical">
          <div
            className="brightness-slider__fill-vertical"
            style={{
              height: displayVal <= 1 ? `${displayVal * 100}%` : '100%',
            }}
          />
        </div>
        <div className="brightness-slider__track" style={{ height: TRACK_HEIGHT }}>
          <div
            className="brightness-slider__fill"
            style={{ width: displayVal <= 1 ? 0 : `${thumbPct * 100}%` }}
          />
        </div>
        <div
          className="brightness-slider__thumb"
          style={
            inVerticalRange
              ? { left: `${VERTICAL_BAR_WIDTH / 2}px`, top: `${verticalThumbTop}px` }
              : { left: `calc(${cornerLeft}px + (100% - ${cornerLeft}px) * ${thumbPct})`, top: `${cornerTop}px` }
          }
        />
      </div>
    </div>
  );
}
