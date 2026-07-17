'use client';

import BrutalistSlider from './BrutalistSlider';
import BrightnessSlider from './BrightnessSlider';
import ColorPicker from './ColorPicker';

export default function LightControls({ light, onUpdate, isAll = false }) {
  const isOn = light.brightness > 0;
  const tempLabel = light.colorTemp <= 33 ? 'WARM' : light.colorTemp <= 66 ? 'NEUTRAL' : 'COOL';

  return (
    <div className="space-y-8">
      <BrightnessSlider
        value={light.brightness}
        onChange={(v) => onUpdate({ brightness: v })}
      />

      <BrutalistSlider
        label="Temperature"
        value={light.colorTemp}
        onChange={(v) => onUpdate({ colorTemp: v })}
        disabled={!isOn}
        displayValue={tempLabel}
        trackColor={
          light.colorTemp <= 33
            ? 'hsl(30, 100%, 60%)'
            : light.colorTemp <= 66
            ? 'hsl(0, 0%, 90%)'
            : 'hsl(210, 60%, 70%)'
        }
      />

      <div className={!isOn ? 'opacity-30 pointer-events-none' : ''}>
        <ColorPicker
          value={light.color}
          onChange={(c) => onUpdate({ color: c })}
        />
      </div>
    </div>
  );
}
