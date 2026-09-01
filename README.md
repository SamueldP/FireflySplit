# Firefly III AI Receipt Splitter 🧾⚡

A self-hosted, mobile-friendly AI bridge that uses **Google Gemini AI** to extract receipts, intelligently categorize individual line items (e.g., separating Lego/toys from groceries), and push them as native **Split Transactions** directly to your **Firefly III** personal finance instance.

---

## 🌟 Key Features

1. **Intelligent Multimodal OCR**: Powered by Gemini 3.7 / 2.5 Flash for high-precision extraction of store names, dates, amounts, line items, and taxes.
2. **True Split Transactions**: Automatically builds Firefly III `/api/v1/transactions` payloads using native splits so a single receipt (e.g. Costco or Target) accurately splits into multiple categories (`Groceries`, `Hobbies & Entertainment`, `Pharmacy`, `Household`).
3. **Podman & Rootless Friendly**: Specially configured for **Rocky Linux + Podman** with zero `docker.sock` mounts.
4. **Portainer Stack Ready**: One-click deployment via Portainer Web Editor.
5. **Mobile & Desktop Responsive**: Drag & drop or snap photos on your phone directly into Firefly III.

---

## 📋 Prerequisites

1. **Google Gemini API Key**: Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. **Firefly III Personal Access Token (PAT)**:
   - Log in to your Firefly III web UI.
   - Go to **Profile** (top right) $\rightarrow$ **OAuth** tab.
   - Under **Personal Access Tokens**, click **Create New Token**.
   - Name it `Receipt AI Splitter` and copy the generated token string.
3. **Portainer on Rocky Linux**: Running with Podman engine.

---

## 🚀 Portainer Stack Deployment (Step-by-Step)

### Option A: Clone & Build via Portainer Web Editor

Since this app is custom-built for you in Google AI Studio, you will first need to export it to your own GitHub repository (using the export menu in the AI Studio settings), and then deploy it in Portainer.

1. **Export to GitHub**: In AI Studio, go to Settings $\rightarrow$ Export to GitHub. 
2. Open your **Portainer** dashboard.
3. Navigate to your **Environment / Local (Podman)** $\rightarrow$ **Stacks** $\rightarrow$ **+ Add stack**.
4. Set the stack name: `firefly-receipt-splitter`.
5. Choose **Repository** (or paste the compose file in Web Editor) and use the following `docker-compose.yml`:
   ```yaml
   version: "3.8"

   services:
     receipt-splitter:
       build: 
         context: .
         dockerfile: Dockerfile
       container_name: firefly-receipt-splitter
       restart: unless-stopped
       ports:
         - "3000:3000"
       environment:
         - GEMINI_API_KEY=${GEMINI_API_KEY}
   ```
6. Scroll down to **Environment variables** section in Portainer and add:
   - `GEMINI_API_KEY` = `your_actual_gemini_api_key`
   - `FIREFLY_URL` = `http://192.168.1.100:8080` *(your Firefly base URL or container IP)*
   - `FIREFLY_TOKEN` = `your_personal_access_token`
7. Click **Deploy the stack**. Portainer will build the image directly from your source code.
8. Access the app on `http://<rocky-linux-ip>:3000`.

---

### Option B: Build & Run directly with Podman CLI on Rocky Linux

If you prefer building directly on your Rocky Linux host via CLI:

```bash
# 1. Clone or copy project files to your server
mkdir -p ~/firefly-splitter && cd ~/firefly-splitter

# 2. Create your .env file
cat <<EOF > .env
GEMINI_API_KEY="your_gemini_api_key_here"
FIREFLY_URL="http://192.168.1.50:8080"
FIREFLY_TOKEN="your_firefly_pat_token_here"
DEFAULT_SOURCE_ACCOUNT="Checking Account"
PORT=5000
EOF

# 3. Build the container image using Podman
podman build -t firefly-receipt-splitter:latest -f Containerfile .

# 4. Run the container with Podman (rootless)
podman run -d \
  --name firefly-receipt-splitter \
  --restart unless-stopped \
  -p 8805:5000 \
  --env-file .env \
  firefly-receipt-splitter:latest

# 5. Check logs
podman logs -f firefly-receipt-splitter
```

---

## 🛠️ Firefly III Split Transaction JSON Specification

The integration makes a `POST` request to `{FIREFLY_URL}/api/v1/transactions` with the following schema:

```json
{
  "error_if_duplicate_hash": false,
  "apply_rules": true,
  "fire_webhooks": true,
  "transactions": [
    {
      "type": "withdrawal",
      "date": "2025-05-14T12:00:00+00:00",
      "amount": "89.99",
      "description": "Lego Star Wars Imperial Shuttle 75300",
      "source_name": "Checking Account",
      "destination_name": "Target Superstore",
      "category_name": "Hobbies & Entertainment",
      "notes": "Lego set bought during weekly grocery run",
      "tags": ["receipt-ai", "gemini-ocr", "hobbies"]
    },
    {
      "type": "withdrawal",
      "date": "2025-05-14T12:00:00+00:00",
      "amount": "4.29",
      "description": "Organic Whole Milk 1 Gallon",
      "source_name": "Checking Account",
      "destination_name": "Target Superstore",
      "category_name": "Groceries",
      "notes": "Dairy staple",
      "tags": ["receipt-ai", "gemini-ocr", "groceries"]
    },
    {
      "type": "withdrawal",
      "date": "2025-05-14T12:00:00+00:00",
      "amount": "14.50",
      "description": "Bounty Paper Towels 6-Pack",
      "source_name": "Checking Account",
      "destination_name": "Target Superstore",
      "category_name": "Household",
      "notes": "Cleaning & Paper Supplies",
      "tags": ["receipt-ai", "gemini-ocr", "household"]
    }
  ]
}
```

---

## 🔒 Security Best Practices for Podman on Rocky Linux

- **No Docker Socket**: This tool uses standard HTTP REST API endpoints and does not interact with `/var/run/docker.sock` or `podman.sock`.
- **Non-Root Execution**: The `Containerfile` drops root privileges and executes as `appuser` (UID 1001).
- **SELinux Compatible**: Fully works with Rocky Linux SELinux enforcing mode out of the box.
