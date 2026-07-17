import { Router } from 'express';
import {
  cmdSwitch,
  cmdBrightness,
  cmdTemp,
  cmdColourHSV,
  cmdColourRGB,
  cmdWorkMode,
} from '../tuya/commands.js';

export function createCommandsRouter(tuya) {
  const router = Router();

  router.post('/:deviceId?', async (req, res) => {
    try {
      const deviceId = req.params.deviceId || undefined;
      const body = req.body || {};
      const commands = [];

      if (typeof body.switch_led !== 'undefined') {
        commands.push(cmdSwitch(body.switch_led));
      }

      // Brightness (standalone, no colour_data): force white mode
      if (typeof body.bright_value === 'number' && !body.colour_data) {
        commands.push(cmdWorkMode('white'));
        commands.push(cmdBrightness(body.bright_value));
      }
      if (typeof body.temp_value === 'number') {
        commands.push(cmdWorkMode('white'));
        commands.push(cmdTemp(body.temp_value));
      }

      // Colour: when a brightness is supplied it drives the HSV value directly,
      // so the intensity slider is independent of the chosen colour.
      if (body.colour_data) {
        commands.push(cmdWorkMode('colour'));
        if (typeof body.colour_data === 'string') {
          try {
            const parsed = JSON.parse(body.colour_data);
            if (parsed && typeof parsed.h === 'number' && typeof parsed.s === 'number' && typeof parsed.v === 'number') {
              const value = typeof body.bright_value === 'number' ? body.bright_value * 10 : parsed.v;
              commands.push(cmdColourHSV(parsed.h, parsed.s, Math.round(value)));
            } else {
              commands.push({ code: 'colour_data_v2', value: parsed });
            }
          } catch {
            commands.push({ code: 'colour_data_v2', value: body.colour_data });
          }
        } else if (
          typeof body.colour_data.h !== 'undefined' &&
          typeof body.colour_data.s !== 'undefined' &&
          typeof body.colour_data.v !== 'undefined'
        ) {
          const value = typeof body.bright_value === 'number' ? body.bright_value * 10 : body.colour_data.v;
          commands.push(
            cmdColourHSV(body.colour_data.h, body.colour_data.s, Math.round(value))
          );
        } else if (
          typeof body.colour_data.r !== 'undefined' &&
          typeof body.colour_data.g !== 'undefined' &&
          typeof body.colour_data.b !== 'undefined'
        ) {
          commands.push(
            cmdColourRGB(body.colour_data.r, body.colour_data.g, body.colour_data.b, body.bright_value)
          );
        }
      }

      if (body.commands && Array.isArray(body.commands)) {
        commands.push(...body.commands);
      }

      if (commands.length === 0) {
        return res.status(400).json({ error: 'No valid commands in body' });
      }

      await tuya.sendCommands(deviceId, commands);
      res.json({ ok: true });
    } catch (e) {
      const status = e.status || (e.code === 1106 ? 401 : 500);
      res.status(status).json({ error: e.message, code: e.code });
    }
  });

  return router;
}
