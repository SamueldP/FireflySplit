#!/usr/bin/env python3
"""
Firefly III AI Receipt Splitter
A local AI bridge that parses receipt images with Google Gemini AI
and pushes categorized split transactions directly to Firefly III.
"""

import os
import io
import json
import base64
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

from flask import Flask, request, jsonify, render_template_string
from dotenv import load_dotenv
import requests
from PIL import Image

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32 MB max upload

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("firefly_receipt_splitter")

# Configuration from Environment
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
FIREFLY_URL = os.getenv("FIREFLY_URL", "").rstrip("/")
FIREFLY_TOKEN = os.getenv("FIREFLY_TOKEN", "")
DEFAULT_SOURCE_ACCOUNT = os.getenv("DEFAULT_SOURCE_ACCOUNT", "Discovery")
DEFAULT_EXPENSE_ACCOUNT = os.getenv("DEFAULT_EXPENSE_ACCOUNT", "")

# Initialize Gemini Client
genai_client = None
if GEMINI_API_KEY:
    try:
        from google import genai
        genai_client = genai.Client(api_key=GEMINI_API_KEY)
        logger.info("Google GenAI client initialized successfully.")
    except Exception as e:
        logger.warning(f"Could not initialize Google GenAI SDK: {e}. Will attempt fallback or runtime initialization.")


def get_genai_client():
    global genai_client
    api_key = os.getenv("GEMINI_API_KEY") or GEMINI_API_KEY
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set in environment or configuration.")
    
    if genai_client is None:
        from google import genai
        genai_client = genai.Client(api_key=api_key)
    return genai_client


RECEIPT_SYSTEM_PROMPT = """You are an expert financial auditor, OCR extraction engine, and personal finance categorization system.
Your mission is to analyze receipt images, extract all transaction details with optical precision, and break down every purchased item into intelligent Firefly III split transaction line items.

Key Categorization Guidelines:
1. Intelligent Category Classification:
   - Separate distinct categories carefully! For example, if a store (like Walmart, Costco, Target, or Amazon) sells groceries AND toys/hobbies (like Lego sets, board games, video games), you MUST classify the Lego as 'Hobbies & Entertainment' or 'Toys', and the milk/produce as 'Groceries'.
   - Electronics, appliances, hardware tools, pharmacy/medications, personal care, clothing, household supplies, and pet supplies must each receive their own logical category.
2. Split Line Items:
   - Extract individual item descriptions, clean name, quantity, unit price (if available), and final item total.
   - For discounts, apply them to the respective item or create a separate split line if it is a general store coupon.
   - For taxes, if itemized taxes exist, include them proportionally or list tax as a separate split item under 'Taxes & Fees'.
3. Mathematical Verification:
   - Ensure the sum of all item splits matches the extracted receipt total_amount.
   - Extract date in ISO format YYYY-MM-DD. If year is missing or ambiguous, use current year.
   - Extract vendor/store name cleanly (e.g. 'Target', 'Costco Wholesale', 'Home Depot').
   - Extract currency code (e.g. 'ZAR', 'USD', 'EUR').

Output strictly valid JSON matching this schema:
{
  "store_name": "string",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "currency": "string",
  "total_amount": 0.00,
  "tax_amount": 0.00,
  "payment_method": "string",
  "splits": [
    {
      "description": "string (clear item name)",
      "amount": 0.00,
      "category": "string (e.g. Groceries, Hobbies & Toys, Electronics, Household, Pharmacy, Dining, Clothing, Pets, Home Improvement)",
      "quantity": 1,
      "unit_price": 0.00,
      "notes": "string (optional specific details, like 'Lego Star Wars set #75300')",
      "destination_name": "string (vendor or store department)"
    }
  ]
}
Do not wrap your output in markdown codeblocks if possible, or provide raw JSON directly.
"""


@app.route("/")
def index():
    """Render the mobile-friendly web interface."""
    return render_template_string(HTML_TEMPLATE, default_account=DEFAULT_SOURCE_ACCOUNT)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY") or GEMINI_API_KEY),
        "firefly_configured": bool(os.getenv("FIREFLY_URL") or FIREFLY_URL),
        "firefly_url": os.getenv("FIREFLY_URL") or FIREFLY_URL
    })


@app.route("/api/parse-receipt", methods=["POST"])
def parse_receipt():
    """Accepts receipt image (base64 or multipart) and extracts split transactions with Gemini AI."""
    try:
        image_bytes = None
        mime_type = "image/jpeg"

        if 'image' in request.files:
            file = request.files['image']
            image_bytes = file.read()
            mime_type = file.mimetype or "image/jpeg"
        elif request.is_json and 'image_base64' in request.json:
            b64_data = request.json['image_base64']
            if ',' in b64_data:
                header, b64_data = b64_data.split(',', 1)
                if 'image/png' in header:
                    mime_type = 'image/png'
                elif 'image/webp' in header:
                    mime_type = 'image/webp'
            image_bytes = base64.b64decode(b64_data)
        else:
            return jsonify({"error": "No image provided. Upload a file or pass image_base64."}), 400

        # Validate image
        try:
            img = Image.open(io.BytesIO(image_bytes))
            img.verify()
        except Exception as e:
            return jsonify({"error": f"Invalid image format: {str(e)}"}), 400

        # Call Gemini Vision model
        client = get_genai_client()
        
        # Prepare contents using google-genai SDK
        from google.genai import types
        
        response = client.models.generate_content(
            model="gemini-3.7-flash",
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                types.Part.from_text(text="Analyze this receipt photo. Perform OCR, identify the vendor, date, currency, total, and split all line items with accurate category classifications (e.g. Lego = Hobbies/Toys, Milk = Groceries). Return pure JSON.")
            ],
            config=types.GenerateContentConfig(
                system_instruction=RECEIPT_SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.1
            )
        )

        raw_text = response.text.strip()
        # Clean any accidental markdown wrap
        if raw_text.startswith("```"):
            lines = raw_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            raw_text = "\n".join(lines).strip()

        data = json.loads(raw_text)
        
        # Sanitize and ensure splits exist
        if "splits" not in data or not isinstance(data["splits"], list):
            data["splits"] = []

        # Validate splits sum
        total = float(data.get("total_amount", 0.0))
        splits_sum = sum(float(item.get("amount", 0.0)) for item in data["splits"])
        data["splits_sum"] = round(splits_sum, 2)
        data["is_balanced"] = abs(total - splits_sum) < 0.02

        return jsonify(data)

    except Exception as e:
        logger.exception("Failed to parse receipt")
        return jsonify({"error": f"Receipt parsing failed: {str(e)}"}), 500


@app.route("/api/firefly/test-connection", methods=["POST"])
def firefly_test():
    """Verify Firefly III connection and token permissions."""
    data = request.get_json(silent=True) or {}
    url = (data.get("firefly_url") or os.getenv("FIREFLY_URL") or FIREFLY_URL).rstrip("/")
    token = data.get("firefly_token") or os.getenv("FIREFLY_TOKEN") or FIREFLY_TOKEN

    if not url or not token:
        return jsonify({"error": "Firefly URL and Personal Access Token are required."}), 400

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "User-Agent": "Firefly-Receipt-Splitter/1.0"
    }

    try:
        # Test /api/v1/about endpoint
        resp = requests.get(f"{url}/api/v1/about", headers=headers, timeout=8, verify=False)
        if resp.status_code == 200:
            about_data = resp.json().get("data", {})
            return jsonify({
                "success": True,
                "version": about_data.get("version", "Unknown"),
                "php_version": about_data.get("php_version", "Unknown"),
                "os": about_data.get("os", "Unknown")
            })
        
        # Fallback test /api/v1/accounts
        resp2 = requests.get(f"{url}/api/v1/accounts?type=asset&limit=1", headers=headers, timeout=8, verify=False)
        if resp2.status_code == 200:
            return jsonify({"success": True, "version": "Firefly III Instance (Connected)"})
        
        return jsonify({
            "error": f"Firefly returned HTTP {resp.status_code}: {resp.text[:200]}"
        }), resp.status_code

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Connection to Firefly III failed: {str(e)}"}), 502


@app.route("/api/firefly/accounts", methods=["POST"])
def firefly_accounts():
    """Fetch user asset accounts from Firefly III."""
    data = request.get_json(silent=True) or {}
    url = (data.get("firefly_url") or os.getenv("FIREFLY_URL") or FIREFLY_URL).rstrip("/")
    token = data.get("firefly_token") or os.getenv("FIREFLY_TOKEN") or FIREFLY_TOKEN

    if not url or not token:
        return jsonify({"error": "Firefly URL and Personal Access Token are required."}), 400

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }

    try:
        resp = requests.get(f"{url}/api/v1/accounts?type=asset", headers=headers, timeout=10, verify=False)
        if resp.status_code != 200:
            return jsonify({"error": f"Failed to fetch accounts ({resp.status_code})"}), resp.status_code

        accounts_data = resp.json().get("data", [])
        accounts = []
        for acc in accounts_data:
            attrs = acc.get("attributes", {})
            accounts.append({
                "id": acc.get("id"),
                "name": attrs.get("name"),
                "type": attrs.get("type"),
                "currency_code": attrs.get("currency_code", "ZAR"),
                "current_balance": attrs.get("current_balance")
            })

        return jsonify({"accounts": accounts})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/firefly/submit", methods=["POST"])
def firefly_submit():
    """
    Submits the parsed receipt as a native Firefly III split transaction.
    Firefly III split transactions are formatted as a single transaction payload
    with an array of split items in the 'transactions' list.
    """
    payload = request.get_json(silent=True) or {}
    
    url = (payload.get("firefly_url") or os.getenv("FIREFLY_URL") or FIREFLY_URL).rstrip("/")
    token = payload.get("firefly_token") or os.getenv("FIREFLY_TOKEN") or FIREFLY_TOKEN
    
    receipt_data = payload.get("receipt_data")
    if not receipt_data:
        return jsonify({"error": "No receipt_data provided."}), 400

    if not url or not token:
        return jsonify({"error": "Firefly URL and Token must be provided or configured in environment."}), 400

    source_name = payload.get("source_account") or os.getenv("DEFAULT_SOURCE_ACCOUNT") or "Discovery"
    store_name = receipt_data.get("store_name") or "Retail Store"
    date_str = receipt_data.get("date") or datetime.today().strftime("%Y-%m-%d")
    currency = receipt_data.get("currency") or "ZAR"
    splits = receipt_data.get("splits", [])

    if not splits:
        # If no splits, create a single transaction item
        splits = [{
            "description": f"Purchase at {store_name}",
            "amount": float(receipt_data.get("total_amount", 0.0)),
            "category": "General Expenses",
            "destination_name": store_name
        }]

    # Build Firefly III Split Transaction JSON
    # Documentation: POST /api/v1/transactions
    # Body format: { "error_if_duplicate_hash": false, "apply_rules": true, "transactions": [ split1, split2, ... ] }
    firefly_splits = []
    
    for split in splits:
        amount = float(split.get("amount", 0.0))
        if amount <= 0:
            continue
            
        desc = split.get("description") or f"Item at {store_name}"
        category = split.get("category") or "Uncategorized"
        notes = split.get("notes") or f"Extracted by Gemini AI OCR. Qty: {split.get('quantity', 1)}"
        destination = split.get("destination_name") or store_name

        firefly_splits.append({
            "type": "withdrawal",
            "date": f"{date_str}T12:00:00+00:00" if "T" not in date_str else date_str,
            "amount": f"{amount:.2f}",
            "description": desc,
            "source_name": source_name,
            "destination_name": destination,
            "category_name": category,
            "currency_code": currency,
            "notes": notes,
            "tags": ["receipt-ai", "gemini-ocr", category.lower().replace(" ", "-")]
        })

    if not firefly_splits:
        return jsonify({"error": "No valid split amounts to submit."}), 400

    transaction_body = {
        "error_if_duplicate_hash": False,
        "apply_rules": True,
        "fire_webhooks": True,
        "transactions": firefly_splits
    }

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Firefly-Receipt-Splitter/1.0"
    }

    try:
        logger.info(f"Submitting split transaction ({len(firefly_splits)} splits) to Firefly III: {url}/api/v1/transactions")
        resp = requests.post(
            f"{url}/api/v1/transactions",
            headers=headers,
            json=transaction_body,
            timeout=15,
            verify=False
        )

        if resp.status_code in [200, 201]:
            resp_data = resp.json()
            trans_id = resp_data.get("data", {}).get("id", "N/A")
            return jsonify({
                "success": True,
                "message": f"Successfully created split transaction #{trans_id} in Firefly III with {len(firefly_splits)} splits!",
                "transaction_id": trans_id,
                "firefly_response": resp_data
            })
        else:
            logger.error(f"Firefly error response: {resp.status_code} - {resp.text}")
            return jsonify({
                "error": f"Firefly III rejected the transaction (HTTP {resp.status_code})",
                "details": resp.text
            }), resp.status_code

    except requests.exceptions.RequestException as e:
        logger.exception("Failed to contact Firefly III")
        return jsonify({"error": f"Failed to connect to Firefly III: {str(e)}"}), 502


HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Firefly III AI Receipt Splitter</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
    </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-4 md:p-8">
    <div class="max-w-4xl mx-auto space-y-6">
        <!-- Header -->
        <header class="flex items-center justify-between border-b border-slate-800 pb-4">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xl">
                    ⚡
                </div>
                <div>
                    <h1 class="text-xl font-bold tracking-tight text-white">Firefly III Receipt Splitter</h1>
                    <p class="text-xs text-slate-400">Gemini AI OCR &amp; Split Transaction Bridge</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span id="health-badge" class="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    Checking...
                </span>
            </div>
        </header>

        <!-- Main Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Left: Upload & Preview -->
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wider">1. Receipt Photo</h2>
                
                <div id="drop-zone" class="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-950/40">
                    <input type="file" id="file-input" accept="image/*" class="hidden" capture="environment">
                    <div id="upload-prompt" class="space-y-2">
                        <div class="w-12 h-12 rounded-full bg-slate-800 mx-auto flex items-center justify-center text-2xl">📸</div>
                        <p class="text-sm font-medium text-slate-300">Tap to take photo or choose file</p>
                        <p class="text-xs text-slate-500">Supports JPG, PNG, WEBP</p>
                    </div>
                    <img id="preview-img" class="hidden max-h-72 mx-auto rounded-lg shadow-lg object-contain" alt="Receipt preview">
                </div>

                <div class="flex gap-2">
                    <button id="scan-btn" disabled class="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2">
                        <span id="scan-spinner" class="hidden animate-spin">⏳</span>
                        <span>Extract &amp; Split with AI</span>
                    </button>
                    <button id="reset-btn" class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2.5 rounded-xl text-sm transition">
                        Reset
                    </button>
                </div>
            </div>

            <!-- Right: Firefly III Settings -->
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wider">2. Firefly III Destination</h2>
                
                <div class="space-y-3">
                    <div>
                        <label class="block text-xs font-medium text-slate-400 mb-1">Firefly III URL</label>
                        <input type="text" id="firefly-url" placeholder="https://firefly.yourdomain.com" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-slate-400 mb-1">Personal Access Token</label>
                        <input type="password" id="firefly-token" placeholder="ey..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-slate-400 mb-1">Source Asset Account</label>
                        <input type="text" id="source-account" value="{{ default_account }}" placeholder="Discovery" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
                    </div>
                    <button id="test-conn-btn" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2 rounded-xl text-xs transition border border-slate-700">
                        Test Connection
                    </button>
                    <div id="conn-result" class="text-xs"></div>
                </div>
            </div>
        </div>

        <!-- Parsed Results & Splits Editor -->
        <div id="results-panel" class="hidden bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                    <h2 class="text-base font-bold text-white flex items-center gap-2">
                        <span>Extracted Splits Breakdown</span>
                        <span id="balance-badge" class="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Balanced</span>
                    </h2>
                    <p class="text-xs text-slate-400 mt-0.5" id="store-date-label">Vendor &amp; Date</p>
                </div>
                <div class="text-right">
                    <span class="text-xs text-slate-400">Total</span>
                    <p class="text-lg font-bold text-emerald-400" id="total-amount-display">$0.00</p>
                </div>
            </div>

            <!-- Splits Table / Cards -->
            <div id="splits-list" class="space-y-3"></div>

            <div class="flex items-center justify-between pt-2">
                <button id="add-split-btn" class="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                    + Add Split Item
                </button>
                <div class="text-xs text-slate-400">
                    Splits Sum: <span id="splits-sum-display" class="font-mono text-slate-200">$0.00</span>
                </div>
            </div>

            <!-- Action buttons -->
            <div class="pt-4 border-t border-slate-800 flex gap-3">
                <button id="push-btn" class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2">
                    <span>🚀 Push Split Transaction to Firefly III</span>
                </button>
            </div>
            <div id="push-result" class="text-xs"></div>
        </div>
    </div>

    <script>
        let currentImageBase64 = null;
        let parsedData = null;

        // Elements
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const previewImg = document.getElementById('preview-img');
        const uploadPrompt = document.getElementById('upload-prompt');
        const scanBtn = document.getElementById('scan-btn');
        const scanSpinner = document.getElementById('scan-spinner');
        const resetBtn = document.getElementById('reset-btn');
        const resultsPanel = document.getElementById('results-panel');
        const splitsList = document.getElementById('splits-list');
        const pushBtn = document.getElementById('push-btn');
        const testConnBtn = document.getElementById('test-conn-btn');
        const connResult = document.getElementById('conn-result');
        const pushResult = document.getElementById('push-result');
        const healthBadge = document.getElementById('health-badge');

        // Check health on boot
        fetch('/api/health')
            .then(r => r.json())
            .then(data => {
                if (data.gemini_configured) {
                    healthBadge.textContent = 'Gemini Ready';
                    healthBadge.className = 'px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                } else {
                    healthBadge.textContent = 'No Gemini Key';
                    healthBadge.className = 'px-2.5 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30';
                }
                if (data.firefly_url) {
                    document.getElementById('firefly-url').value = data.firefly_url;
                }
            })
            .catch(() => {
                healthBadge.textContent = 'Offline';
            });

        // Dropzone & File selection
        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
            }
        });

        function handleFile(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                currentImageBase64 = e.target.result;
                previewImg.src = currentImageBase64;
                previewImg.classList.remove('hidden');
                uploadPrompt.classList.add('hidden');
                scanBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        }

        resetBtn.addEventListener('click', () => {
            currentImageBase64 = null;
            parsedData = null;
            previewImg.classList.add('hidden');
            uploadPrompt.classList.remove('hidden');
            scanBtn.disabled = true;
            resultsPanel.classList.add('hidden');
            fileInput.value = '';
        });

        // Scan with Gemini
        scanBtn.addEventListener('click', async () => {
            if (!currentImageBase64) return;
            scanBtn.disabled = true;
            scanSpinner.classList.remove('hidden');
            
            try {
                const res = await fetch('/api/parse-receipt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image_base64: currentImageBase64 })
                });
                
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Extraction failed');
                
                parsedData = data;
                renderSplits();
                resultsPanel.classList.remove('hidden');
            } catch (err) {
                alert('Scan failed: ' + err.message);
            } finally {
                scanBtn.disabled = false;
                scanSpinner.classList.add('hidden');
            }
        });

        function renderSplits() {
            if (!parsedData) return;
            document.getElementById('store-date-label').textContent = `${parsedData.store_name || 'Vendor'} • ${parsedData.date || 'Today'} (${parsedData.currency || 'ZAR'})`;
            document.getElementById('total-amount-display').textContent = `R${parseFloat(parsedData.total_amount || 0).toFixed(2)}`;

            splitsList.innerHTML = '';
            parsedData.splits.forEach((split, idx) => {
                const div = document.createElement('div');
                div.className = 'bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2';
                div.innerHTML = `
                    <div class="flex items-center justify-between gap-2">
                        <input type="text" value="${split.description || ''}" onchange="updateSplit(${idx}, 'description', this.value)" class="bg-transparent text-sm font-medium text-white border-b border-transparent hover:border-slate-700 focus:border-emerald-500 focus:outline-none flex-1">
                        <div class="flex items-center gap-1 font-mono text-emerald-400 text-sm">
                            <span>R</span>
                            <input type="number" step="0.01" value="${split.amount || 0}" onchange="updateSplit(${idx}, 'amount', parseFloat(this.value))" class="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 w-24 text-right text-emerald-300">
                        </div>
                        <button onclick="removeSplit(${idx})" class="text-slate-500 hover:text-rose-400 text-sm px-1">✕</button>
                    </div>
                    <div class="flex flex-wrap gap-2 text-xs">
                        <select onchange="updateSplit(${idx}, 'category', this.value)" class="bg-slate-900 text-slate-300 border border-slate-700 rounded px-2 py-1">
                            ${renderCategoryOptions(split.category)}
                        </select>
                        <input type="text" placeholder="Notes" value="${split.notes || ''}" onchange="updateSplit(${idx}, 'notes', this.value)" class="bg-slate-900 text-slate-400 border border-slate-700 rounded px-2 py-1 flex-1">
                    </div>
                `;
                splitsList.appendChild(div);
            });
            recalc();
        }

        const standardCategories = ["Groceries", "Hobbies & Entertainment", "Toys", "Electronics", "Household", "Pharmacy & Health", "Dining & Snacks", "Clothing", "Home Improvement", "Pets", "Taxes & Fees", "General Expenses"];
        function renderCategoryOptions(selected) {
            return standardCategories.map(c => `<option value="${c}" ${c === selected ? 'selected' : ''}>${c}</option>`).join('');
        }

        window.updateSplit = function(idx, field, val) {
            parsedData.splits[idx][field] = val;
            recalc();
        };

        window.removeSplit = function(idx) {
            parsedData.splits.splice(idx, 1);
            renderSplits();
        };

        document.getElementById('add-split-btn').addEventListener('click', () => {
            parsedData.splits.push({
                description: 'New item',
                amount: 0.00,
                category: 'General Expenses',
                notes: ''
            });
            renderSplits();
        });

        function recalc() {
            const sum = parsedData.splits.reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0);
            document.getElementById('splits-sum-display').textContent = `R${sum.toFixed(2)}`;
            const total = parseFloat(parsedData.total_amount) || 0;
            const diff = Math.abs(total - sum);
            const badge = document.getElementById('balance-badge');
            if (diff < 0.02) {
                badge.textContent = 'Balanced';
                badge.className = 'text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
            } else {
                badge.textContent = `Off by R${diff.toFixed(2)}`;
                badge.className = 'text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30';
            }
        }

        // Test Firefly Connection
        testConnBtn.addEventListener('click', async () => {
            connResult.innerHTML = '<span class="text-slate-400">Testing...</span>';
            try {
                const res = await fetch('/api/firefly/test-connection', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        firefly_url: document.getElementById('firefly-url').value,
                        firefly_token: document.getElementById('firefly-token').value
                    })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    connResult.innerHTML = `<span class="text-emerald-400 font-medium">✓ Connected: ${data.version}</span>`;
                } else {
                    connResult.innerHTML = `<span class="text-rose-400">✗ ${data.error || 'Connection failed'}</span>`;
                }
            } catch (e) {
                connResult.innerHTML = `<span class="text-rose-400">✗ Error: ${e.message}</span>`;
            }
        });

        // Submit to Firefly
        pushBtn.addEventListener('click', async () => {
            if (!parsedData) return;
            pushResult.innerHTML = '<span class="text-slate-400">Submitting to Firefly III...</span>';
            pushBtn.disabled = true;

            try {
                const res = await fetch('/api/firefly/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        firefly_url: document.getElementById('firefly-url').value,
                        firefly_token: document.getElementById('firefly-token').value,
                        source_account: document.getElementById('source-account').value,
                        receipt_data: parsedData
                    })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    pushResult.innerHTML = `<div class="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 font-medium">${data.message}</div>`;
                } else {
                    pushResult.innerHTML = `<div class="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300">${data.error || 'Submission failed'}</div>`;
                }
            } catch (e) {
                pushResult.innerHTML = `<div class="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300">Error: ${e.message}</div>`;
            } finally {
                pushBtn.disabled = false;
            }
        });
    </script>
</body>
</html>
"""

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")
    logger.info(f"Starting Firefly III AI Receipt Splitter on {host}:{port}")
    app.run(host=host, port=port, debug=False)
