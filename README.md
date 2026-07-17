# Pandora — Smart Lighting Remote Control

Remote control for **Energeeks E27 RGBW** smart bulbs via **Tuya Cloud**, with a Node.js backend and a web client.

## Architecture

```
Client (Next.js)  →  Backend (Node.js)  →  Tuya Cloud API  →  Energeeks bulb
```

- **Backend**: Token management (grant_type=1), HMAC-SHA256 request signing, device and command APIs.
- **Client**: Device list, real-time state, on/off, brightness, color temperature, RGB.

## Requirements

- Node.js ≥ 18
- Tuya Cloud project (Smart Home mode) with IoT Core and device linking

## Quick start

### 1. Tuya Developer setup

1. Go to [Tuya IoT Platform](https://developer.tuya.com/), create a Cloud project (Smart Home).
2. Link your Energeeks bulb via the Tuya Smart / Energeeks app to the same project (or account).
3. In the project, note **Access ID** and **Access Secret**.
4. Get the **Device ID** of the bulb from the Tuya console (Device list).

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: TUYA_ACCESS_ID, TUYA_ACCESS_SECRET, TUYA_DEVICE_ID, TUYA_BASE_URL
npm install
npm run dev
```

Backend runs at `http://localhost:4000`.

- **EU data center**: set `TUYA_BASE_URL=https://openapi.tuyaeu.com`
- **Other regions**: use the base URL shown in your Tuya project (e.g. `https://openapi.tuyaus.com`).

### 3. Client

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:3000`. The client talks to the backend via `/api/proxy/*` (rewritten to the backend URL).

For production, set `NEXT_PUBLIC_API_URL` to your backend URL (e.g. `https://api.yourdomain.com`).

## Environment variables

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `TUYA_ACCESS_ID` | Yes | Tuya project Access ID |
| `TUYA_ACCESS_SECRET` | Yes | Tuya project Access Secret |
| `TUYA_DEVICE_ID` | No* | Default device ID (can also be passed per request) |
| `TUYA_BASE_URL` | No | Tuya API base (default: `https://openapi.tuyaeu.com`) |
| `PORT` | No | Server port (default: 4000) |
| `CORS_ORIGIN` | No | Allowed CORS origin |
| `RATE_LIMIT_MAX` | No | Requests per minute (default: 120) |

\* Required if you do not pass `deviceId` in API paths.

### Client

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend URL (default: `http://localhost:4000` for dev) |

## API (backend)

- `GET /api/health` — Health check.
- `GET /api/devices` — Get default device (uses `TUYA_DEVICE_ID`).
- `GET /api/devices/:deviceId` — Get device by ID.
- `GET /api/devices/:deviceId/status` — Get device status (DPs).
- `POST /api/commands` — Send commands to default device.
- `POST /api/commands/:deviceId` — Send commands to device.

### Command body examples

```json
{ "switch_led": true }
{ "bright_value": 80 }
{ "temp_value": 500 }
{ "colour_data": { "r": 255, "g": 0, "b": 0 } }
{ "colour_data": { "h": 0, "s": 100, "v": 100 } }
```

## Device linking (Tuya / Energeeks app)

1. Install **Tuya Smart** or **Energeeks** app and create an account.
2. Add the E27 RGBW bulb (Wi‑Fi, follow in-app steps).
3. In Tuya IoT Console, ensure the cloud project is linked to the same app/account so the device appears under the project.
4. Copy the device ID from the console into `TUYA_DEVICE_ID` or use it in API paths.

## Deployment

- **Backend**: Run on any Node ≥ 18 host (Vercel serverless, AWS, DigitalOcean, etc.). Set env vars in the platform.
- **Client**: Build with `npm run build`, then `npm run start`, or deploy to Vercel. Set `NEXT_PUBLIC_API_URL` to the deployed backend URL.
- Use **HTTPS** in production. Keep **Access ID** and **Secret** only on the backend; never expose them to the client.

## Project structure

```
pandora/
├── backend/           # Node.js API
│   ├── src/
│   │   ├── tuya/      # Signing, token, client, devices, commands
│   │   ├── routes/
│   │   ├── app.js
│   │   └── index.js
│   └── .env.example
├── client/            # Next.js app
│   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── page.js
│   └── next.config.js
└── README.md
```

## License

MIT.
