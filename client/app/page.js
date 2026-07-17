'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchDevices, fetchDeviceStatus, sendCommand } from './lib/api';
import { deviceToLight, lightUpdatesToCommand, mergeStatusWithSent, hexToHsv } from './lib/light';
import LightCard from './components/LightCard';
import MoreSettings from './components/MoreSettings';

export default function Home() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState('all');
  const [moreOpen, setMoreOpen] = useState(false);
  const [selectedControlIds, setSelectedControlIds] = useState(['all']);
  const [controlHue, setControlHue] = useState(0);
  const [controlSaturation, setControlSaturation] = useState(0);
  const [controlValue, setControlValue] = useState(0);
  const [controlTemperature, setControlTemperature] = useState(50);

  const loadDevices = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const list = await fetchDevices();
      setDevices(list.filter((d) => d.id));
      if (list.length) setSelectedId((prev) => (prev === 'all' || list.some((d) => d.id === prev) ? prev : list[0].id));
    } catch (e) {
      setError(e.message);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const lights = devices.map((d) => deviceToLight(d, d.status ?? []));

  function areAllLightsEqual(list) {
    if (list.length < 2) return true;
    const first = list[0];
    return list.every((l) => {
      if (l.isOn !== first.isOn) return false;
      if (!l.isOn) return true;
      if (l.brightness !== first.brightness) return false;
      if (l.workMode !== first.workMode) return false;
      if (l.workMode === 'colour') return l.color === first.color;
      return l.colorTemp === first.colorTemp;
    });
  }

  const allEqual = areAllLightsEqual(lights);
  const allProxy = lights.length
    ? {
        id: 'all',
        name: 'All Lights',
        room: '',
        isOn: allEqual ? lights[0].isOn : false,
        brightness: allEqual ? lights[0].brightness : 0,
        colorTemp: allEqual ? lights[0].colorTemp : 50,
        color: allEqual ? lights[0].color : '#ffffff',
        workMode: allEqual ? lights[0].workMode : 'white',
      }
    : null;

  const handleUpdate = useCallback(
    async (target, updates) => {
      const ids = Array.isArray(target) ? target : target ? [target] : lights.map((l) => l.id);
      if (!ids.length) return;
      setError(null);
      const body = lightUpdatesToCommand(updates);
      if (Object.keys(body).length === 0) return;
      setDevices((prev) =>
        prev.map((d) => (ids.includes(d.id) ? { ...d, status: mergeStatusWithSent(d.status ?? [], body) } : d))
      );
      try {
        await Promise.all(ids.map((id) => sendCommand(id, body)));
        const list = await fetchDevices();
        setDevices(list.filter((d) => d.id));
      } catch (e) {
        setError(e.message);
        loadDevices();
      }
    },
    [lights, loadDevices]
  );

  useEffect(() => {
    if (!moreOpen) return;
    const selectedLights = selectedControlIds.includes('all')
      ? lights
      : lights.filter((l) => selectedControlIds.includes(l.id));
    if (!selectedLights.length) {
      setControlHue(0);
      setControlSaturation(0);
      setControlValue(0);
      setControlTemperature(50);
      return;
    }
    const anyColour = selectedLights.some((l) => l.workMode === 'colour');
    if (anyColour) {
      const colorLight = selectedLights.find((l) => l.workMode === 'colour');
      const [h, s, v] = hexToHsv(colorLight.color);
      setControlHue(h);
      setControlSaturation(Math.round(s));
      setControlValue(Math.round(v));
    } else {
      setControlHue(0);
      setControlSaturation(0);
      setControlValue(Math.round(selectedLights.reduce((s, l) => s + l.brightness, 0) / selectedLights.length) || 0);
    }
    setControlTemperature(Math.round(selectedLights.reduce((s, l) => s + l.colorTemp, 0) / selectedLights.length) || 50);
  }, [moreOpen, selectedControlIds, lights]);

  const applyToSelected = useCallback(
    (updates) => {
      const target = selectedControlIds.includes('all') ? null : selectedControlIds;
      handleUpdate(target, updates);
    },
    [selectedControlIds, handleUpdate]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6 py-8">
        <div className="h-8 w-8 border-2 border-foreground border-t-transparent animate-spin" />
        <p className="mt-4 font-mono text-xs text-muted-foreground uppercase tracking-widest">Loading…</p>
      </main>
    );
  }

  if (error && !devices.length) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6 py-8">
        <div className="border-2 border-foreground p-6 max-w-sm">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">Error</p>
          <p className="mt-2 font-mono text-sm">{error}</p>
          <p className="mt-3 text-[10px] font-mono text-muted-foreground">Check backend and TUYA_* env.</p>
        </div>
        <button
          type="button"
          onClick={loadDevices}
          className="mt-8 border-2 border-foreground px-4 py-2 font-mono text-xs uppercase tracking-wider hover:bg-foreground hover:text-background transition-colors"
        >
          Retry
        </button>
      </main>
    );
  }

  if (!devices.length) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6 py-8">
        <p className="font-mono text-sm text-muted-foreground">No devices. Set TUYA_DEVICE_IDS or TUYA_DEVICE_ID in the backend.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-6 pt-16 pb-12 flex flex-col">
      <header className="w-full max-w-lg mx-auto mb-10">
        <h1 className="flex items-end gap-3 font-overpass text-2xl uppercase tracking-[0.3em] text-muted-foreground">
          <img src="/pandora-logo.svg" alt="" className="h-8 w-8 pb-[5px]" />
          Pandora
        </h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="w-full max-w-lg space-y-10">
          {error && (
            <div className="border border-foreground/50 p-3 flex items-center justify-between gap-2">
              <p className="font-mono text-xs text-muted-foreground">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="font-mono text-[10px] uppercase underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          )}

          <section className="space-y-1">
            {allProxy && (
              <LightCard
                light={allProxy}
                isSelected={selectedId === 'all'}
                onSelect={() => setSelectedId('all')}
                onBrightnessChange={(v, keepColor) => {
                  const updates = { brightness: v };
                  if (typeof keepColor === 'string' || (allProxy.workMode === 'colour' && allProxy.color)) {
                    updates.color = keepColor ?? allProxy.color;
                  }
                  handleUpdate(null, updates);
                }}
                onColorTempChange={(v) => handleUpdate(null, { colorTemp: v })}
                onColorChange={(v) => handleUpdate(null, { color: v })}
                onWhiteSelect={(brightness, colorTemp) =>
                  handleUpdate(null, { brightness, colorTemp })
                }
              />
            )}
            {lights.map((light) => (
              <LightCard
                key={light.id}
                light={light}
                isSelected={selectedId === light.id}
                onSelect={() => setSelectedId(light.id)}
                onBrightnessChange={(v, keepColor) => {
                  const updates = { brightness: v };
                  if (typeof keepColor === 'string' || (light.workMode === 'colour' && light.color)) {
                    updates.color = keepColor ?? light.color;
                  }
                  handleUpdate(light.id, updates);
                }}
                onColorTempChange={(v) => handleUpdate(light.id, { colorTemp: v })}
                onColorChange={(v) => handleUpdate(light.id, { color: v })}
                onWhiteSelect={(brightness, colorTemp) =>
                  handleUpdate(light.id, { brightness, colorTemp })
                }
              />
            ))}
          </section>
        </div>

        <MoreSettings
          className="w-full max-w-lg mt-10"
          open={moreOpen}
          onToggleOpen={() => setMoreOpen((p) => !p)}
          lights={lights}
          selectedIds={selectedControlIds}
          onSelectedIdsChange={setSelectedControlIds}
          hue={controlHue}
          saturation={controlSaturation}
          value={controlValue}
          temperature={controlTemperature}
          onHueChange={setControlHue}
          onSaturationChange={setControlSaturation}
          onValueChange={setControlValue}
          onTemperatureChange={setControlTemperature}
          onApply={applyToSelected}
        />
      </div>

      <footer className="w-full max-w-lg mx-auto py-6 flex items-center justify-center gap-2 text-xs font-mono text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="text-sm leading-none font-overpass font-thin not-italic">©</span>
          <span>2026 Rita Patacas</span>
        </span>
        <span>|</span>
        <a
          href="https://github.com/ritapatacas/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
          aria-label="GitHub"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
          </svg>
        </a>
      </footer>
    </main>
  );
}
