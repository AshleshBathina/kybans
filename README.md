# Kybans Slot Booking

Simple slot booking app with:
- `client/`: React + Vite frontend
- `server/`: Express + SQLite backend

## Local Development

### 1) Backend

Create `server/.env`:

```env
CLIENT=http://localhost:5173
PORT=3001
```

Install and run:

```bash
cd server
npm install
npm start
```

### 2) Frontend

Install and run:

```bash
cd client
npm install
npm run dev
```

For local development, frontend uses `/api` and Vite proxy forwards it to `http://localhost:3001`.

## Deployment

### Backend (Render)

Set environment variables in Render:

```env
CLIENT=https://your-frontend-domain.com
```

Notes:
- Do not use trailing slash in `CLIENT`.
- Backend reads `PORT` from Render automatically (`process.env.PORT`).

### Frontend (Vercel/Netlify/etc.)

Set:

```env
VITE_API_URL=https://your-render-backend.onrender.com/api
```

The frontend resolves API base as:
- `VITE_API_URL` in production
- `/api` fallback for local dev

## Common Issues

- **CORS error in browser**: ensure backend `CLIENT` exactly matches frontend origin.
- **Frontend calling wrong domain**: ensure `VITE_API_URL` is set correctly and redeploy frontend.
- **Render deploy ok but app fails**: check Render logs and confirm env vars are present.
