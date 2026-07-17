'use client';

import { useRef, useCallback, useState, useEffect } from 'react';

const WARM_HUE = 30; // hsl(30, 100%, 60%)
const COOL_HUE = 210; // hsl(210, 60%, 70%)

const COLOR_SWATCHES = [
  { name: 'Red', hex: '#FF3B30' },
  { name: 'Orange', hex: '#FF9500' },
  { name: 'Yellow', hex: '#FFCC00' },
  { name: 'Green', hex: '#34C759' },
  { name: 'Blue', hex: '#007AFF' },
  { name: 'Purple', hex: '#AF52DE' },
  { name: 'White', hex: '#FFFFFF' },
];

const WHITE_SWATCH_HEX = '#FFFFFF';

const LONG_PRESS_MS = 400;
const RADIAL_RADIUS = 64;
const MOVE_CANCEL_THRESHOLD = 20;

function tempToColor(colorTemp) {
  const t = Math.max(0, Math.min(100, colorTemp)) / 100;
  const hue = WARM_HUE + (COOL_HUE - WARM_HUE) * t;
  const sat = 100 + (60 - 100) * t;
  const light = 60 + (70 - 60) * t;
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function colorsAreClose(a, b) {
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  const dist = Math.sqrt(
    Math.pow(rgbA.r - rgbB.r, 2) +
      Math.pow(rgbA.g - rgbB.g, 2) +
      Math.pow(rgbA.b - rgbB.b, 2)
  );
  return dist < 30; // tolerant threshold for RGB -> HSV -> RGB round-trip
}

function closestSwatchIndex(dx, dy) {
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI; // -180..180, 0 = right
  const step = 360 / COLOR_SWATCHES.length;
  const normalized = ((angle % 360) + 360) % 360;
  return Math.round(normalized / step) % COLOR_SWATCHES.length;
}

export default function LightCard({
  light,
  isSelected,
  onSelect,
  onBrightnessChange,
  onColorTempChange,
  onColorChange,
  onWhiteSelect,
}) {
  const trackRef = useRef(null);
  const lastBrightnessRef = useRef(light.brightness);
  const lastColorTempRef = useRef(light.colorTemp);
  const movedRef = useRef(false);
  const longPressTimerRef = useRef(null);
  const colorModeRef = useRef(false);
  const isColorModeRef = useRef(false);
  const originRef = useRef({ x: 0, y: 0 });
  const lastSentSwatchRef = useRef(null);

  const [dragValue, setDragValue] = useState(null);
  const [dragColorTemp, setDragColorTemp] = useState(null);
  const [colorMode, setColorMode] = useState(false);
  const [radialOrigin, setRadialOrigin] = useState({ x: 0, y: 0 });
  const [activeSwatchIndex, setActiveSwatchIndex] = useState(null);
  const [optimisticColor, setOptimisticColor] = useState(null);
  const [optimisticWorkMode, setOptimisticWorkMode] = useState(null);
  const activeSwatchIndexRef = useRef(null);

  const isDragging = dragValue !== null;

  const getValuesFromEvent = useCallback((clientX, clientY) => {
    if (!trackRef.current) return { brightness: light.brightness, colorTemp: light.colorTemp };
    const rect = trackRef.current.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const yPct = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return { brightness: Math.round(xPct * 100), colorTemp: Math.round(yPct * 100) };
  }, [light.brightness, light.colorTemp]);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const applySwatch = useCallback(
    (index) => {
      if (index === null || index === lastSentSwatchRef.current) return;
      lastSentSwatchRef.current = index;
      const swatch = COLOR_SWATCHES[index];
      if (swatch.hex === WHITE_SWATCH_HEX) {
        setOptimisticColor(null);
        setOptimisticWorkMode('white');
        const brightness = light.brightness > 0 ? light.brightness : 100;
        onWhiteSelect(brightness, light.colorTemp);
        return;
      }
      setOptimisticColor(swatch.hex);
      onColorChange(swatch.hex);
    },
    [onColorChange, onWhiteSelect, light.brightness, light.colorTemp]
  );

  const closeColorMode = useCallback(() => {
    setColorMode(false);
    setActiveSwatchIndex(null);
    activeSwatchIndexRef.current = null;
    lastSentSwatchRef.current = null;
    setOptimisticWorkMode(null);
  }, []);

  const handlePointerDown = useCallback(
    (e) => {
      e.preventDefault();
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      movedRef.current = false;
      colorModeRef.current = false;
      const startX = e.clientX;
      const startY = e.clientY;
      originRef.current = { x: startX, y: startY };

      activeSwatchIndexRef.current = null;
      setActiveSwatchIndex(null);
      const { brightness, colorTemp } = getValuesFromEvent(e.clientX, e.clientY);
      lastBrightnessRef.current = brightness;
      lastColorTempRef.current = colorTemp;
      setDragValue(brightness);
      setDragColorTemp(colorTemp);

      clearLongPressTimer();
      longPressTimerRef.current = setTimeout(() => {
        if (movedRef.current) return;
        colorModeRef.current = true;
        movedRef.current = true;
        lastSentSwatchRef.current = null;
        const rect = target.getBoundingClientRect();
        setRadialOrigin({ x: startX - rect.left, y: startY - rect.top });
        setColorMode(true);
      }, LONG_PRESS_MS);

      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (colorModeRef.current) {
          const dist = Math.hypot(dx, dy);
          const idx = dist < 12 ? null : closestSwatchIndex(dx, dy);
          activeSwatchIndexRef.current = idx;
          setActiveSwatchIndex(idx);
          applySwatch(idx);
          return;
        }
        if (Math.abs(dx) > MOVE_CANCEL_THRESHOLD || Math.abs(dy) > MOVE_CANCEL_THRESHOLD) {
          movedRef.current = true;
          clearLongPressTimer();
        }
        const vv = getValuesFromEvent(ev.clientX, ev.clientY);
        lastBrightnessRef.current = vv.brightness;
        if (isColorModeRef.current) {
          // Em modo de cor o slide ajusta apenas o brilho; mantém a cor.
          setDragValue(vv.brightness);
        } else {
          lastColorTempRef.current = vv.colorTemp;
          setDragValue(vv.brightness);
          setDragColorTemp(vv.colorTemp);
        }
      };
      const onUp = () => {
        clearLongPressTimer();
        setDragValue(null);
        setDragColorTemp(null);
        target.removeEventListener('pointermove', onMove);
        target.removeEventListener('pointerup', onUp);
        if (colorModeRef.current) {
          closeColorMode();
          return;
        }
        if (movedRef.current) {
          if (isColorModeRef.current) {
            // Em modo de cor só altera brilho e mantém a cor escolhida.
            onBrightnessChange(lastBrightnessRef.current, optimisticColor ?? light.color);
          } else {
            onBrightnessChange(lastBrightnessRef.current);
            onColorTempChange(lastColorTempRef.current);
          }
        } else {
          onSelect();
        }
      };
      target.addEventListener('pointermove', onMove);
      target.addEventListener('pointerup', onUp);
    },
    [getValuesFromEvent, onBrightnessChange, onColorTempChange, onSelect, applySwatch]
  );

  useEffect(() => clearLongPressTimer, []);

  useEffect(() => {
    if (optimisticColor && light.workMode === 'colour') {
      const real = light.color?.toLowerCase() ?? '';
      const expected = optimisticColor.toLowerCase();
      // Clear optimistic color once the device reports something close to it.
      if (real === expected || colorsAreClose(real, expected)) {
        setOptimisticColor(null);
      }
    }
    if (optimisticWorkMode && light.workMode && light.workMode !== 'colour') {
      setOptimisticWorkMode(null);
    }
  }, [light.workMode, light.color, optimisticColor, optimisticWorkMode]);

  // Always close the swatch menu on release, even if the browser's own
  // long-press context menu forced the pointerup to fire outside our target.
  useEffect(() => {
    if (!colorMode) return;
    const handleUp = () => closeColorMode();
    document.addEventListener('pointerup', handleUp, true);
    document.addEventListener('pointercancel', handleUp, true);
    return () => {
      document.removeEventListener('pointerup', handleUp, true);
      document.removeEventListener('pointercancel', handleUp, true);
    };
  }, [colorMode, closeColorMode]);

  const displayVal = isDragging ? dragValue : light.brightness;
  const displayColorTemp = isDragging ? dragColorTemp : light.colorTemp;
  const isOn = displayVal > 0;
  const effectiveWorkMode = optimisticWorkMode || light.workMode;
  const isColorMode = optimisticColor != null || effectiveWorkMode === 'colour';
  isColorModeRef.current = isColorMode;
  const fillColor = isColorMode ? (optimisticColor ?? light.color) : tempToColor(displayColorTemp);

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative overflow-visible border p-4 cursor-pointer select-none touch-none transition-colors ${
        isSelected ? 'border-foreground' : 'border-border hover:border-foreground/30'
      }`}
    >
      <div
        className={`absolute inset-y-0 left-0 ${isDragging && !colorMode ? '' : 'transition-all duration-150'}`}
        style={{
          width: `${displayVal}%`,
          backgroundColor: isOn ? fillColor : 'transparent',
          opacity: isOn ? 0.25 : 0,
        }}
      />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-2 h-2 flex-shrink-0 transition-colors ${isOn ? '' : 'bg-muted-foreground/20'}`}
            style={isOn ? { backgroundColor: fillColor } : undefined}
          />
          <div className="min-w-0">
            <p className="font-mono text-xs font-bold uppercase tracking-wider truncate">{light.name}</p>
            <p className="text-[10px] text-muted-foreground/50 font-mono">{light.room || '—'}</p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
          {light.error ? (
            <span className="text-destructive" title={light.error}>
              {light.code ? `ERR ${light.code}` : 'ERROR'}
            </span>
          ) : isOn ? (
            `${displayVal}%`
          ) : (
            'OFF'
          )}
        </span>
      </div>

      {colorMode && (
        <div className="absolute z-10 pointer-events-none" style={{ left: radialOrigin.x, top: radialOrigin.y }}>
          {COLOR_SWATCHES.map((swatch, i) => {
            const angle = (360 / COLOR_SWATCHES.length) * i;
            const rad = (angle * Math.PI) / 180;
            const x = Math.cos(rad) * RADIAL_RADIUS;
            const y = Math.sin(rad) * RADIAL_RADIUS;
            const isActive = activeSwatchIndex === i;
            return (
              <span
                key={swatch.hex}
                className="absolute rounded-full border-2 transition-transform"
                style={{
                  left: x,
                  top: y,
                  width: isActive ? 28 : 20,
                  height: isActive ? 28 : 20,
                  marginLeft: isActive ? -14 : -10,
                  marginTop: isActive ? -14 : -10,
                  backgroundColor: swatch.hex,
                  borderColor: isActive ? '#fff' : 'rgba(255,255,255,0.3)',
                }}
              />
            );
          })}
          <span
            className="absolute rounded-full bg-foreground"
            style={{ width: 8, height: 8, marginLeft: -4, marginTop: -4 }}
          />
        </div>
      )}
    </div>
  );
}
