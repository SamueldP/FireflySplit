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

## 🚀 Deployment Instructions

### 🛑 Fix for "Unrecognized input header: 72" Error
The error you encountered (`Unrecognized input header: 72`) is a known bug when Portainer tries to build images directly from source using Podman's BuildKit implementation. To bypass this, we will build the image directly on your Rocky Linux server using the terminal, and then deploy it in Portainer without the build step.

### Step 1: Build the Image via Rocky Linux CLI
SSH into your Rocky Linux server and run the following commands to pull your new code and build the image manually:

```bash
# 1. Clone the repository you just exported to your GitHub
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY

# 2. Build the Docker image locally (this bypasses Portainer's buildkit bug)
podman build -t firefly-receipt-splitter:latest .
```

### Step 2: Deploy the Stack in Portainer
Now that the image is built and sitting on your server, go back to Portainer.

1. Navigate to your **Environment / Local (Podman)** $\rightarrow$ **Stacks** $\rightarrow$ **+ Add stack**.
2. Set the stack name: `firefly-receipt-splitter`.
3. Choose **Web editor** (do NOT choose Repository this time).
4. Paste the following updated `docker-compose.yml` (notice we removed the `build:` section and are just using the image we built):

   ```yaml
   version: "3.8"

   services:
     receipt-splitter:
       image: firefly-receipt-splitter:latest
       container_name: firefly-receipt-splitter
       restart: unless-stopped
       ports:
         - "3000:3000"
       environment:
         - GEMINI_API_KEY=${GEMINI_API_KEY}
         - FIREFLY_URL=${FIREFLY_URL}
         - FIREFLY_TOKEN=${FIREFLY_TOKEN}
   ```
5. Scroll down to **Environment variables** section and add:
   - `GEMINI_API_KEY` = `your_actual_gemini_api_key`
   - `FIREFLY_URL` = `http://192.168.1.100:8080` *(your Firefly URL)*
   - `FIREFLY_TOKEN` = `your_personal_access_token`
6. Click **Deploy the stack**. 
7. Access the app on `http://<rocky-linux-ip>:3000` from any browser or mobile phone!

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
