<h1 align="left">
  <img src="client/public/pandora-logo.svg" alt="" width="24" height="24" />
  <i>PANDORA</i>
</h1>

*Home enlightenment, a non-intellectual app*<br>Created to remotely control smart bulbs at home | [live demo](https://pandoraspot.vercel.app/)


## TLDT

To run locally:
```bash
./dev.sh
```

> **Backend** runs at `http://localhost:4000`.
> <br>**Frontend** at `http://localhost:3000`.

## Architecture & Project structure

```
Next.js  →  Node.js  →  Tuya Cloud API  →  Bulbs
```

- **Backend**: Token management (grant_type=1), HMAC-SHA256 request signing, device and command APIs.
- **Client**: Device list, real-time state, on/off, brightness, color temperature, RGB.

```
pandora/
├── backend/
│   ├── src/
│   │   ├── tuya/
│   │   ├── routes/
│   │   ├── app.js
│   │   └── index.js
│   └── .env.example
├── client/
│   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── page.js
│   └── next.config.js
└── README.md
```

## Quick start

1. Copy `backend/.env.example` to `backend/.env` and fill in `TUYA_ACCESS_ID`, `TUYA_ACCESS_SECRET`, `TUYA_DEVICE_ID`.
2. Run (and install) the app using `./dev.sh` script


## License

MIT.