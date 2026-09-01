import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsers with large limits for high-res receipt images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini GenAI client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

const RECEIPT_OCR_SYSTEM_PROMPT = `You are a world-class financial OCR analyzer and personal accounting categorization engine.
Your task is to analyze receipt images with precision, extracting:
1. Store / Vendor Name (clean, readable title)
2. Date of transaction (YYYY-MM-DD format)
3. Time of transaction (HH:MM if visible, else null)
4. Currency (ZAR, USD, EUR, GBP, CAD, etc. - default to ZAR if symbol is R or R$)
5. Total transaction amount
6. Tax amount (if itemized)
7. Payment method (e.g. Visa, Mastercard, Cash, Apple Pay)
8. Line-item split breakdown:
   - Identify every single distinct purchased item or service.
   - Clean up obscure cash-register abbreviated names into clear, human-readable item descriptions.
   - Intelligently assign an accurate Firefly III financial category to EACH line item.
   - CRITICAL REQUIREMENT: Separate distinct spending categories! For example, if a department or warehouse store (like Costco, Target, Walmart, Meijer) sells groceries AND toys/hobbies (like Lego sets, board games, crafts, video games), you MUST classify the Lego as 'Hobbies & Entertainment' or 'Toys', and food items as 'Groceries'.
   - Household paper/cleaning products go to 'Household'.
   - Medicines/vitamins go to 'Pharmacy & Health'.
   - Tools/hardware go to 'Tools & Hardware' or 'Home Improvement'.
   - Clothing goes to 'Clothing & Apparel'.
   - Ensure the sum of split amounts equals the total_amount. If discounts exist, apply them or list as negative split. If sales tax is not itemized inside items, add a 'Taxes & Fees' split item.

Output strictly valid JSON matching the specified schema without any markdown wrapping.`;

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Health endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    gemini_configured: Boolean(process.env.GEMINI_API_KEY),
    firefly_url: process.env.FIREFLY_URL || "",
    default_source_account: process.env.DEFAULT_SOURCE_ACCOUNT || "Checking Account",
  });
});

// Parse Receipt endpoint
app.post("/api/parse-receipt", async (req, res) => {
  try {
    const { image_base64, mime_type = "image/jpeg", additional_context, categories } = req.body;

    if (!image_base64 && !additional_context) {
      return res.status(400).json({ error: "Missing image_base64 or additional_context in request body." });
    }

    const parts: any[] = [];

    if (image_base64) {
      // Clean base64 string if data URL prefix exists
      let cleanBase64 = image_base64;
      let actualMime = mime_type;
      if (image_base64.includes(",")) {
        const urlParts = image_base64.split(",");
        const match = urlParts[0].match(/:(.*?);/);
        if (match) actualMime = match[1];
        cleanBase64 = urlParts[1];
      }

      parts.push({
        inlineData: {
          mimeType: actualMime,
          data: cleanBase64,
        },
      });
    }

    let textPrompt = "Analyze this receipt. Extract store name, date, currency, total amount, taxes, and all itemized line items into intelligent split categories (e.g. Lego/Toys vs Groceries vs Household). Return strict JSON.";
    
    if (additional_context) {
      textPrompt += `\n\nAdditional User Context/Manual Entry:\n"${additional_context}"\n(Incorporate this info into the extraction. If it's a manual list of items, extract them. If it specifies the store, use it.)`;
    }

    if (categories && Array.isArray(categories) && categories.length > 0) {
      textPrompt += `\n\nCRITICAL: You MUST classify each line item into one of the following exact Firefly III categories provided by the user:\n[${categories.join(", ")}]\nIf an exact match isn't perfect, choose the closest available category from this list. Do not invent new categories.`;
    }

    parts.push({ text: textPrompt });

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: { parts },
      config: {
        systemInstruction: RECEIPT_OCR_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            store_name: { type: Type.STRING, description: "Name of the merchant or store" },
            date: { type: Type.STRING, description: "Transaction date in YYYY-MM-DD format" },
            time: { type: Type.STRING, description: "Transaction time in HH:MM format (optional)" },
            currency: { type: Type.STRING, description: "ISO Currency code e.g. ZAR, USD, EUR" },
            total_amount: { type: Type.NUMBER, description: "Final total paid on the receipt" },
            tax_amount: { type: Type.NUMBER, description: "Total tax paid if visible" },
            payment_method: { type: Type.STRING, description: "Payment method used e.g. Visa 1234" },
            splits: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING, description: "Clean item name" },
                  amount: { type: Type.NUMBER, description: "Item amount or subtotal" },
                  category: { type: Type.STRING, description: "Intelligent category e.g. Groceries, Hobbies & Entertainment, Household" },
                  quantity: { type: Type.NUMBER, description: "Item quantity if shown" },
                  unit_price: { type: Type.NUMBER, description: "Unit price if shown" },
                  notes: { type: Type.STRING, description: "Helpful notes about this item" },
                  destination_name: { type: Type.STRING, description: "Merchant or department name" },
                },
                required: ["description", "amount", "category"],
              },
            },
          },
          required: ["store_name", "date", "currency", "total_amount", "splits"],
        },
      },
    });

    const rawText = response.text || "{}";
    const parsed = JSON.parse(rawText);

    // Calculate splits sum & balance status
    const splits = (parsed.splits || []).map((s: any, i: number) => ({
      id: `split-${Date.now()}-${i}`,
      description: s.description || "Item",
      amount: typeof s.amount === "number" ? Number(s.amount.toFixed(2)) : 0,
      category: s.category || "General Expenses",
      quantity: s.quantity || 1,
      unit_price: s.unit_price || s.amount,
      notes: s.notes || "",
      destination_name: s.destination_name || parsed.store_name || "Store",
      tags: ["receipt-ai", (s.category || "").toLowerCase().replace(/\s+/g, "-")],
    }));

    const total = typeof parsed.total_amount === "number" ? Number(parsed.total_amount.toFixed(2)) : 0;
    const splitsSum = Number(splits.reduce((acc: number, cur: any) => acc + cur.amount, 0).toFixed(2));
    const isBalanced = Math.abs(total - splitsSum) < 0.05;

    res.json({
      store_name: parsed.store_name || "Merchant",
      date: parsed.date || new Date().toISOString().split("T")[0],
      time: parsed.time || "",
      currency: parsed.currency || "ZAR",
      total_amount: total,
      tax_amount: parsed.tax_amount || 0,
      payment_method: parsed.payment_method || "",
      splits,
      splits_sum: splitsSum,
      is_balanced: isBalanced,
    });
  } catch (error: any) {
    console.error("Receipt parsing error:", error);
    res.status(500).json({
      error: "Failed to parse receipt with Gemini AI",
      details: error.message || String(error),
    });
  }
});

// Test Firefly III Connection
app.post("/api/firefly/test-connection", async (req, res) => {
  try {
    const { firefly_url, firefly_token } = req.body;
    const targetUrl = (firefly_url || process.env.FIREFLY_URL || "").trim().replace(/\/$/, "");
    const token = (firefly_token || process.env.FIREFLY_TOKEN || "").trim();

    if (!targetUrl || !token) {
      return res.status(400).json({
        error: "Firefly URL and Personal Access Token are required.",
      });
    }

    // Try fetching /api/v1/about
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${targetUrl}/api/v1/about`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": "Firefly-Receipt-Splitter/1.0",
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (response.ok) {
      const data = await response.json();
      const aboutData = data?.data?.attributes || data?.data || {};
      return res.json({
        success: true,
        version: aboutData.version || "Firefly III (Connected)",
        php_version: aboutData.php_version || "",
        os: aboutData.os || "",
      });
    }

    // Fallback: try /api/v1/accounts
    const accResponse = await fetch(`${targetUrl}/api/v1/accounts?type=asset&limit=1`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (accResponse.ok) {
      return res.json({
        success: true,
        version: "Firefly III Instance (Connected via Accounts API)",
      });
    }

    const errText = await response.text();
    return res.status(response.status).json({
      error: `Firefly III returned HTTP ${response.status}: ${errText.slice(0, 200)}`,
    });
  } catch (error: any) {
    res.status(502).json({
      error: `Unable to connect to Firefly III instance: ${error.message || String(error)}`,
    });
  }
});

// Fetch Firefly Asset Accounts
app.post("/api/firefly/accounts", async (req, res) => {
  try {
    const { firefly_url, firefly_token } = req.body;
    const targetUrl = (firefly_url || process.env.FIREFLY_URL || "").trim().replace(/\/$/, "");
    const token = (firefly_token || process.env.FIREFLY_TOKEN || "").trim();

    if (!targetUrl || !token) {
      return res.status(400).json({ error: "Missing Firefly URL or Token." });
    }

    const response = await fetch(`${targetUrl}/api/v1/accounts?type=asset`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch accounts from Firefly III" });
    }

    const data = await response.json();
    const accounts = (data.data || []).map((acc: any) => ({
      id: acc.id,
      name: acc.attributes?.name || "Unnamed Account",
      type: acc.attributes?.type || "asset",
      currency_code: acc.attributes?.currency_code || "ZAR",
      current_balance: acc.attributes?.current_balance || "0.00",
    }));

    res.json({ accounts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch Firefly Categories
app.post("/api/firefly/categories", async (req, res) => {
  try {
    const { firefly_url, firefly_token } = req.body;
    const targetUrl = (firefly_url || process.env.FIREFLY_URL || "").trim().replace(/\/$/, "");
    const token = (firefly_token || process.env.FIREFLY_TOKEN || "").trim();

    if (!targetUrl || !token) {
      return res.status(400).json({ error: "Missing Firefly URL or Token." });
    }

    const response = await fetch(`${targetUrl}/api/v1/categories`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch categories" });
    }

    const data = await response.json();
    const categories = (data.data || []).map((c: any) => c.attributes?.name).filter(Boolean);
    res.json({ categories });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Submit Split Transaction to Firefly III
app.post("/api/firefly/submit", async (req, res) => {
  try {
    const { firefly_url, firefly_token, source_account, receipt_data, apply_rules = true, fire_webhooks = true } = req.body;

    const targetUrl = (firefly_url || process.env.FIREFLY_URL || "").trim().replace(/\/$/, "");
    const token = (firefly_token || process.env.FIREFLY_TOKEN || "").trim();

    if (!receipt_data || !receipt_data.splits || receipt_data.splits.length === 0) {
      return res.status(400).json({ error: "No receipt split data provided to submit." });
    }

    if (!targetUrl || !token) {
      return res.status(400).json({ error: "Firefly URL and Token are required to submit." });
    }

    const sourceName = source_account || process.env.DEFAULT_SOURCE_ACCOUNT || "Discovery";
    const storeName = receipt_data.store_name || "Merchant";
    const dateStr = receipt_data.date || new Date().toISOString().split("T")[0];
    const currency = receipt_data.currency || "ZAR";

    // Build the split transactions list
    const transactions = receipt_data.splits
      .filter((split: any) => Number(split.amount) !== 0)
      .map((split: any) => {
        const amt = Math.abs(Number(split.amount)).toFixed(2);
        const isRefund = Number(split.amount) < 0;
        return {
          type: isRefund ? "deposit" : "withdrawal",
          date: dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00+00:00`,
          amount: amt,
          description: split.description || `Item at ${storeName}`,
          source_name: sourceName,
          destination_name: split.destination_name || storeName,
          category_name: split.category || "General Expenses",
          currency_code: currency,
          notes: split.notes || `Extracted by Gemini AI OCR (Qty: ${split.quantity || 1})`,
          tags: ["receipt-ai", "gemini-ocr", (split.category || "").toLowerCase().replace(/[^a-z0-9]/g, "-")],
        };
      });

    const fireflyPayload = {
      error_if_duplicate_hash: false,
      apply_rules: Boolean(apply_rules),
      fire_webhooks: Boolean(fire_webhooks),
      transactions,
    };

    console.log(`[Firefly API] Posting ${transactions.length} splits to ${targetUrl}/api/v1/transactions`);

    const response = await fetch(`${targetUrl}/api/v1/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Firefly-Receipt-Splitter/1.0",
      },
      body: JSON.stringify(fireflyPayload),
    });

    const respText = await response.text();
    let respJson: any;
    try {
      respJson = JSON.parse(respText);
    } catch {
      respJson = { raw: respText };
    }

    if (response.ok || response.status === 201) {
      const transactionId = respJson?.data?.id || "Created";
      return res.json({
        success: true,
        message: `Successfully logged split transaction #${transactionId} with ${transactions.length} splits in Firefly III!`,
        transaction_id: transactionId,
        firefly_data: respJson,
        payload_sent: fireflyPayload,
      });
    } else {
      return res.status(response.status).json({
        error: `Firefly III rejected transaction (HTTP ${response.status})`,
        details: respJson?.message || respJson?.errors || respText.slice(0, 300),
        payload_sent: fireflyPayload,
      });
    }
  } catch (error: any) {
    console.error("Firefly submit error:", error);
    res.status(502).json({
      error: `Failed to communicate with Firefly III: ${error.message || String(error)}`,
    });
  }
});

// Read and return project standalone files for Portainer / Podman hub
app.get("/api/project-files", (req, res) => {
  try {
    const files = [
      {
        name: "Python Application",
        filename: "app.py",
        language: "python",
        description: "Standalone Flask web app with Gemini Vision AI and Firefly III split transaction logic",
        content: fs.readFileSync(path.join(process.cwd(), "app.py"), "utf-8"),
      },
      {
        name: "Python Requirements",
        filename: "requirements.txt",
        language: "text",
        description: "Python dependencies (Flask, google-genai, requests, pillow, gunicorn)",
        content: fs.readFileSync(path.join(process.cwd(), "requirements.txt"), "utf-8"),
      },
      {
        name: "Containerfile (Podman)",
        filename: "Containerfile",
        language: "dockerfile",
        description: "Rootless Podman container build for Rocky Linux with unprivileged user",
        content: fs.readFileSync(path.join(process.cwd(), "Containerfile"), "utf-8"),
      },
      {
        name: "Dockerfile (Docker)",
        filename: "Dockerfile",
        language: "dockerfile",
        description: "Standard Docker container build for Portainer",
        content: fs.readFileSync(path.join(process.cwd(), "Dockerfile"), "utf-8"),
      },
      {
        name: "Docker Compose / Portainer Stack",
        filename: "docker-compose.yml",
        language: "yaml",
        description: "Portainer Stack compose configuration with environment variables and no socket mounts",
        content: fs.readFileSync(path.join(process.cwd(), "docker-compose.yml"), "utf-8"),
      },
      {
        name: "Environment Template",
        filename: ".env.example",
        language: "bash",
        description: "Environment variable template for Gemini API key, Firefly URL, and Token",
        content: fs.readFileSync(path.join(process.cwd(), ".env.example"), "utf-8"),
      },
      {
        name: "Deployment Guide",
        filename: "README.md",
        language: "markdown",
        description: "Step-by-step instructions for deploying to Portainer on Rocky Linux with Podman",
        content: fs.readFileSync(path.join(process.cwd(), "README.md"), "utf-8"),
      },
    ];

    res.json({ files });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to read project files", details: error.message });
  }
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving
// -------------------------------------------------------------
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`⚡ Firefly III Receipt Splitter server running on http://0.0.0.0:${PORT}`);
  });
}

start();
