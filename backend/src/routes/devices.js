import { Router } from 'express';

export function createDevicesRouter(tuya) {
  const router = Router();

  router.get('/:deviceId?', async (req, res) => {
    try {
      const { deviceId } = req.params;
      if (!deviceId) {
        const devices = await tuya.getDevices();
        res.json(devices);
        return;
      }
      const device = await tuya.getDevice(deviceId);
      res.json(device);
    } catch (e) {
      const status = e.status || (e.code === 1106 ? 401 : 500);
      res.status(status).json({ error: e.message, code: e.code });
    }
  });

  router.get('/:deviceId/status', async (req, res) => {
    try {
      const status = await tuya.getDeviceStatus(req.params.deviceId);
      res.json({ status });
    } catch (e) {
      const status = e.status || (e.code === 1106 ? 401 : 500);
      res.status(status).json({ error: e.message, code: e.code });
    }
  });

  return router;
}
