import React, { useMemo, useState, useEffect, useRef } from 'react';

export default function ColorPicker6({ value, onChange }) {
  const baseColors = useMemo(
    () => [
      { name: 'Red', hex: '#FF3B30' },
      { name: 'Orange', hex: '#FF9500' },
      { name: 'Yellow', hex: '#FFCC00' },
      { name: 'Green', hex: '#34C759' },
      { name: 'Blue', hex: '#007AFF' },
      { name: 'Purple', hex: '#AF52DE' },
    ],
    []
  );

  const [activeBase, setActiveBase] = useState(() => closestBaseHex(value, baseColors));
  const [selected, setSelected] = useState(value ?? baseColors[0].hex);
  const [interactionBase, setInteractionBase] = useState(null);
  const pendingHexRef = useRef(null);
  const shadesByBase = useMemo(
    () =>
      Object.fromEntries(
        baseColors.map((base) => [base.hex.toLowerCase(), generateShades(base.hex)])
      ),
    [baseColors]
  );

  useEffect(() => {
    if (!value) return;
    setSelected(value);
    setActiveBase(closestBaseHex(value, baseColors));
  }, [value, baseColors]);

  function setPending(hex) {
    pendingHexRef.current = hex;
    setSelected(hex);
  }

  function shadeFromPointer(clientY, baseHex, target) {
    const shades = shadesByBase[baseHex.toLowerCase()];
    if (!target || !shades?.length) return baseHex;
    const rect = target.getBoundingClientRect();
    const y = clamp(clientY - rect.top, 0, rect.height - 1);
    const index = clamp(Math.floor((y / rect.height) * shades.length), 0, shades.length - 1);
    return shades[index];
  }

  function startInteraction(event, baseHex) {
    const target = event.currentTarget;
    setActiveBase(baseHex);
    setInteractionBase(baseHex);
    const initialShade = shadeFromPointer(event.clientY, baseHex, target) || baseHex;
    setPending(initialShade);
    target.setPointerCapture?.(event.pointerId);

    const applyPointer = (pointerEvent) => {
      const shade = shadeFromPointer(pointerEvent.clientY, baseHex, target);
      setPending(shade);
    };
    applyPointer(event);

    const end = () => {
      const finalHex = pendingHexRef.current ?? selected;
      onChange?.(finalHex);
      setInteractionBase((current) => (current === baseHex ? null : current));
      target.removeEventListener('pointermove', applyPointer);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', end);
    };

    target.addEventListener('pointermove', applyPointer);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
  }

  return (
    <div className="color-picker">
      <div className="color-picker__header">
        <p className="color-picker__label font-mono">Color</p>
        <div className="color-picker__selected">
          <span className="color-picker__selected-swatch" style={{ background: selected }} />
          <code className="color-picker__selected-code font-mono">{selected.toUpperCase()}</code>
        </div>
      </div>

      <div className="color-picker__base-grid">
        {baseColors.map((c) => {
          const isActive = c.hex.toLowerCase() === activeBase.toLowerCase();
          const isBaseSelected = selected.toLowerCase() === c.hex.toLowerCase();
          const isInteracting = interactionBase?.toLowerCase() === c.hex.toLowerCase();
          const colorShades = shadesByBase[c.hex.toLowerCase()] ?? [];
          const selectedIndex = colorShades.findIndex(
            (hex) => hex.toLowerCase() === selected.toLowerCase()
          );
          const isShadeFromThisBase =
            selectedIndex >= 0 || selected.toLowerCase() === c.hex.toLowerCase();
          const buttonColor = isShadeFromThisBase ? selected : c.hex;

          return (
            <div key={c.hex} className="color-picker__base-item">
              <button
                type="button"
                title={c.name}
                aria-label={c.name}
                aria-expanded={isInteracting}
                aria-pressed={isBaseSelected}
                onPointerDown={(event) => startInteraction(event, c.hex)}
                onClick={() => {
                  if (!isInteracting) {
                    setActiveBase(c.hex);
                    setPending(c.hex);
                  }
                }}
                className={`color-picker__base-btn${isBaseSelected ? ' is-selected' : ''}${
                  isInteracting ? ' is-interacting' : ''
                }${isActive ? ' is-active' : ''}`}
              >
                {!isInteracting && (
                  <span className="color-picker__base-dot" style={{ background: buttonColor }} />
                )}
                {isInteracting && (
                  <span className="color-picker__shade-column" role="listbox" aria-label={`${c.name} shades`}>
                    {colorShades.map((hex) => (
                      <span
                        key={hex}
                        role="option"
                        aria-selected={selected.toLowerCase() === hex.toLowerCase()}
                        className="color-picker__shade-step"
                        style={{ background: hex }}
                      />
                    ))}
                    {selectedIndex >= 0 && (
                      <span
                        className="color-picker__shade-indicator"
                        style={{ top: `${((selectedIndex + 0.5) / colorShades.length) * 100}%` }}
                      />
                    )}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------- Color math helpers --------------------------- */

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function hexToRgb(hex) {
  const h = hex.replace('#', '').trim();
  if (h.length !== 6) throw new Error('Expected 6-digit hex.');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return { r, g, b };
}

function rgbToHex(r, g, b) {
  const toHex = (x) => x.toString(16).padStart(2, "0");
  return `#${toHex(clamp(Math.round(r), 0, 255))}${toHex(clamp(Math.round(g), 0, 255))}${toHex(
    clamp(Math.round(b), 0, 255)
  )}`.toUpperCase();
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let rp = 0, gp = 0, bp = 0;
  if (0 <= h && h < 60) { rp = c; gp = x; bp = 0; }
  else if (60 <= h && h < 120) { rp = x; gp = c; bp = 0; }
  else if (120 <= h && h < 180) { rp = 0; gp = c; bp = x; }
  else if (180 <= h && h < 240) { rp = 0; gp = x; bp = c; }
  else if (240 <= h && h < 300) { rp = x; gp = 0; bp = c; }
  else { rp = c; gp = 0; bp = x; }

  const r = (rp + m) * 255;
  const g = (gp + m) * 255;
  const b = (bp + m) * 255;
  return { r, g, b };
}

/**
 * Generates a palette around a base color by varying lightness
 * and slightly adjusting saturation to keep mid-tones vivid.
 */
function generateShades(baseHex) {
  const { r, g, b } = hexToRgb(baseHex);
  const { h, s, l } = rgbToHsl(r, g, b);

  // 12 shades from light to dark
  const lightnessStops = [0.92, 0.86, 0.80, 0.72, 0.64, 0.56, 0.48, 0.40, 0.32, 0.24, 0.16, 0.10];

  return lightnessStops.map((ls) => {
    // Boost saturation a bit for mid-tones; reduce for extremes to avoid neon/gray.
    const midBoost = 1 - Math.abs(ls - 0.52) / 0.52; // ~1 near middle, ~0 near edges
    const sat = clamp(s * (0.85 + 0.35 * midBoost), 0, 1);

    const { r: rr, g: gg, b: bb } = hslToRgb(h, sat, ls);
    return rgbToHex(rr, gg, bb);
  });
}

function closestBaseHex(hex, baseColors) {
  if (!hex) return baseColors[0].hex;

  try {
    const { r, g, b } = hexToRgb(hex);
    const source = rgbToHsl(r, g, b);
    let best = baseColors[0];
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const base of baseColors) {
      const rgb = hexToRgb(base.hex);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      const hueDelta = Math.min(
        Math.abs(source.h - hsl.h),
        360 - Math.abs(source.h - hsl.h)
      );
      const satDelta = Math.abs(source.s - hsl.s) * 100;
      const distance = hueDelta + satDelta;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = base;
      }
    }

    return best.hex;
  } catch {
    return baseColors[0].hex;
  }
}
