# ID Photo Maker — Expo App

## Setup
```bash
npm install
# Set your backend URL at build time:
# EAS: set EXPO_PUBLIC_API_URL=https://<cloud-run-service>.run.app
# local dev:
export EXPO_PUBLIC_API_URL=http://localhost:8080
npm run start
```

## Features
- Pick/take a photo
- Manual adjust (drag/pinch) inside target frame
- Background → White (server heuristic)
- Export PNG
- Create print sheets (4×6, A4, Letter) via backend PDF composer

## Notes
- This MVP keeps cropping simple by resizing to the exact target canvas. You can add face detection later to auto-position head within official bands.
- The backend ensures print-accurate sheet packing at 300 DPI.