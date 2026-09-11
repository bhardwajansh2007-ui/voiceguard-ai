# VOICEGUARD AI — Deployment & Live Mobile Testing Guide

This guide covers how to:
1. **Access and test VoiceGuard AI on phones and other devices immediately.**
2. **Configure cloud databases (PostgreSQL / Neon / Supabase).**
3. **Deploy VoiceGuard AI live to the cloud (Vercel + Render or Docker).**

---

## Part 1: Instant Live Testing on Phones & Other Devices

### Why HTTPS is Required for Mobile Microphones
Modern mobile browsers (Google Chrome on Android, Apple Safari on iOS) **strictly disable microphone access (`navigator.mediaDevices.getUserMedia`)** on insecure HTTP connections unless the host is `localhost`. 
Therefore:
- **Local Wi-Fi HTTP (`http://192.168.1.34:5173`)**: Perfect for viewing the dashboard, looking up Caller Intelligence, testing evaluation scenarios, and resolving held actions.
- **Public HTTPS Tunnel**: Necessary if you want to stream real live microphone audio from a phone.

---

### Option A: Immediate Local Wi-Fi Access (No Internet Tunnel Needed)
Both your PC and phone must be on the **same Wi-Fi network**.

1. **Verify Services are Running on PC:**
   - Backend: `python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000`
   - Frontend: `npm run dev` (running in `frontend/`)
2. **On your phone's browser, open:**
   ```
   http://192.168.1.34:5173
   ```
3. **Log in with:**
   - **Username:** `admin`
   - **Password:** `VoiceGuardAdmin2026!`

---

### Option B: Free HTTPS Tunnel via Ngrok (Works for Anyone Anywhere + Live Phone Mic)
`ngrok` is already installed on this machine.

1. In PowerShell, start the tunnel:
   ```powershell
   ngrok http 5173
   ```
2. Ngrok will output a secure HTTPS link:
   ```
   Forwarding: https://xxxx-xx-xx.ngrok-free.app -> http://localhost:5173
   ```
3. Send this link to anyone or open it on your phone:
   - Microphone permissions work smoothly because it is HTTPS.
   - Vite automatically proxies `/api` and `/ws` (WebSockets) to port 8000.
   - You can install it as a Phone App (PWA) by tapping **"Add to Home Screen"** in Safari / Chrome!

---

## Part 2: Database Configuration

### 1. Local Database (Current Default: SQLite)
- File: `voiceguard.db` in project root.
- Zero setup needed. Pre-configured with:
  - Administrator account (`admin` / `VoiceGuardAdmin2026!`).
  - Reference identity: `Aarav Mehta, Finance Operations, DemoBank Secure` (`EMP-DEMO-001`, `+91 98000 12345`).
  - Initialized schema for calls, biometric embeddings, risk assessments, decisions, and audit ledger.

### 2. Switching to Cloud PostgreSQL (Free on Neon / Supabase / Render)
VoiceGuard AI uses SQLAlchemy, which automatically detects your database type from the connection string.

1. **Get a free PostgreSQL instance:**
   - [Neon.tech](https://neon.tech) (Serverless Postgres with free tier)
   - [Supabase.com](https://supabase.com) (Free managed Postgres)
   - [Render.com](https://render.com) (Free PostgreSQL database)
2. **Set the environment variable in `.env`:**
   ```bash
   DATABASE_URL=postgresql://username:password@ep-xyz.neon.tech/voiceguard?sslmode=require
   ```
3. **Restart the backend:**
   Tables, baseline risk weights, and admin accounts will be created automatically on startup by `init_db.py`.

---

## Part 3: Permanent Cloud Deployment (24/7 Live for Judges)

### Architecture
```
[User Phone / Browser] 
         │
         ▼
[Frontend: Vercel / Netlify / Render] (React + Vite + Tailwind)
         │  HTTPS / WSS
         ▼
[Backend: Render.com / Railway / Fly.io] (FastAPI + WebSocket + PyTorch)
         │
         ▼
[Cloud Database: Neon / Supabase / Render Postgres]
```

### Step 1: Deploy Backend (Render.com Web Service)
1. Push this repository to GitHub.
2. Log into [Render.com](https://render.com) $\rightarrow$ **New Web Service**.
3. Connect your GitHub repository.
4. Set configurations:
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
5. Under **Environment Variables**, add:
   - `JWT_SECRET_KEY` = `<random_32_char_secret>`
   - `DATABASE_URL` = `postgresql://...` (from Neon / Supabase / Render Postgres)
   - `ENVIRONMENT` = `production`
6. Click **Deploy**. Note your backend URL: e.g. `https://voiceguard-backend.onrender.com`.

### Step 2: Deploy Frontend (Vercel / Render Static Site)
1. In [Vercel](https://vercel.com) $\rightarrow$ **Add New Project** $\rightarrow$ Import repository.
2. Select **Root Directory**: `frontend`.
3. Framework Preset: `Vite`.
4. Add Environment Variable:
   - `VITE_API_BASE_URL` = `https://voiceguard-backend.onrender.com/api/v1`
5. Click **Deploy**.
6. You will receive a permanent live URL: e.g. `https://voiceguard-ai.vercel.app`.

---

## Part 4: Testing Two-Device Communication
1. Open the **Caller Terminal** on phone 1:
   `https://<YOUR_APP_URL>/?mode=caller`
2. Open the **SOC Console** on laptop/phone 2:
   `https://<YOUR_APP_URL>/`
3. Enter the pairing code or scan the QR code in **Protected Calls** $\rightarrow$ **Secondary Device Bridge**.
4. Audio spoken on the phone is streamed directly into the SOC's real-time sliding inference window!
