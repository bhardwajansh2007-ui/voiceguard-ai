# VoiceGuard AI — Render Cloud Deployment Guide

This guide provides step-by-step instructions to deploy **VoiceGuard AI** to [Render](https://render.com) using a single, unified web service that runs both the React frontend and FastAPI backend with WebSockets and AASIST machine learning.

---

## 🚀 Why Single-Service Architecture on Render?

1. **Free/Hobby Tier Friendly**: Render allows you to host the entire application within a single Web Service.
2. **Zero CORS Issues**: Because FastAPI serves the built frontend (`frontend/dist`), all API calls (`/api/v1/...`) and WebSocket streams (`/ws/...`) use relative paths on the same domain.
3. **Automatic WebSockets**: Real-time audio streaming (`wss://<your-app>.onrender.com/ws/calls/{id}/stream`) works natively.
4. **Lightweight CPU PyTorch**: The configuration uses the CPU wheel (~150MB instead of 2.5GB CUDA packages) so your build completes quickly within Render's memory limits.

---

## 📁 Deployment Assets Included

The repository now contains all necessary Render deployment files:
- **`render.yaml`**: Infrastructure-as-code Blueprint for automated 1-click deployment.
- **`Dockerfile`**: Multi-stage Docker build (Node.js builds frontend $\rightarrow$ Python 3.11 slim runs backend).
- **`render-build.sh`**: Shell build script for Native Python environment deployments.
- **`.dockerignore`**: Excludes heavy local directories (`node_modules`, `venv`) to speed up upload/build.

---

## 🛠️ Method 1: Automated Blueprint Deployment (Recommended)

Render reads the `render.yaml` file from your repository and configures everything automatically.

### Step 1: Push Code to GitHub / GitLab
Make sure all your latest changes are pushed to your remote Git repository:
```bash
git add .
git commit -m "feat: configure unified Docker and Blueprint deployment for Render"
git push origin main
```

### Step 2: Open Render Dashboard
1. Go to [dashboard.render.com](https://dashboard.render.com/).
2. Click the **"New +"** button in the top navigation bar.
3. Select **"Blueprint"**.
4. Connect your GitHub/GitLab repository (`voiceguard-ai`).
5. Render will automatically detect `render.yaml` and show:
   - **Service Name:** `voiceguard-ai`
   - **Environment:** `Docker`
   - **Plan:** `Free`
   - **Region:** `Oregon`
6. Click **"Apply"**.
7. Render will build the Docker container and deploy the service.

---

## 🛠️ Method 2: Manual Web Service Setup (Docker)

If you prefer to configure the Web Service manually in the Render UI:

1. In the Render dashboard, click **"New +"** $\rightarrow$ **"Web Service"**.
2. Connect your Git repository.
3. Configure the service settings:
   - **Name:** `voiceguard-ai`
   - **Language / Runtime:** `Docker`
   - **Region:** Any (e.g., `Oregon (US West)` or `Frankfurt (EU)`)
   - **Branch:** `main`
   - **Dockerfile Path:** `./Dockerfile`
   - **Instance Type:** `Free` (or `Starter`)
4. Under **Environment Variables**, add:
   | Key | Value |
   | :--- | :--- |
   | `APP_ENV` | `production` |
   | `DEPLOYMENT_MODE` | `production` |
   | `SECRET_KEY` | *(Click "Generate" or enter a 32+ char string)* |
   | `CORS_ORIGINS` | `*` |
   | `DEVICE` | `cpu` |
5. Click **"Deploy Web Service"**.

---

## 🛠️ Method 3: Manual Web Service Setup (Native Python Runtime)

If you prefer Render's native Python runtime without Docker:

1. Click **"New +"** $\rightarrow$ **"Web Service"**.
2. Connect your Git repository.
3. Configure:
   - **Runtime:** `Python`
   - **Build Command:** `chmod +x render-build.sh && ./render-build.sh`
   - **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
4. Add the same Environment Variables as listed in Method 2.
5. Click **"Deploy Web Service"**.

---

## 🔍 Post-Deployment Verification Checklist

Once Render reports that your service is **Live**:

1. **Test Frontend Application**:
   Open `https://<your-service-name>.onrender.com` in your browser. You should see the VoiceGuard Mobile Security Layer / Phone interface.
2. **Test Health Endpoint**:
   Visit `https://<your-service-name>.onrender.com/api/v1/health`. It should return:
   ```json
   {
     "status": "HEALTHY",
     "app_name": "VoiceGuard-AI",
     "components": {
       "database": {"status": "OPERATIONAL"},
       "ml_inference": {"status": "OPERATIONAL"},
       "audit_ledger": {"status": "OPERATIONAL"},
       "websocket_gateway": {"status": "OPERATIONAL"}
     }
   }
   ```
3. **Test Interactive API Docs**:
   Visit `https://<your-service-name>.onrender.com/docs` to view Swagger UI.
4. **Test Live Scenario Audio / WebSockets**:
   In the phone interface, select a scenario (e.g. *Cloned Impersonation*) and click **Answer**. The WebSocket will connect to `wss://<your-service-name>.onrender.com/ws/calls/...`, process the audio, and show the security verdict.

---

> [!NOTE]
> **Render Free Tier Spin-Down**:
> On Render's free tier, inactive services spin down after 15 minutes of inactivity. When a new request arrives, it may take 30–50 seconds to wake up. Once awake, performance will be fast and responsive.
