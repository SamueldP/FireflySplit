import React, { useState } from 'react';
import { Code2, Copy, Check, Download, Terminal, Info } from 'lucide-react';
import { ParsedReceipt, FireflyConfig, FireflyTransactionPayload } from '../types';

interface PayloadInspectorProps {
  receipt: ParsedReceipt | null;
  config: FireflyConfig;
}

export const PayloadInspector: React.FC<PayloadInspectorProps> = ({ receipt, config }) => {
  const [copied, setCopied] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Construct Firefly III API payload
  const buildPayload = (): FireflyTransactionPayload => {
    if (!receipt) {
      return {
        error_if_duplicate_hash: false,
        apply_rules: true,
        fire_webhooks: true,
        transactions: [],
      };
    }

    const sourceName = config.source_account || 'Checking Account';
    const storeName = receipt.store_name || 'Retail Store';
    const dateStr = receipt.date || new Date().toISOString().split('T')[0];
    const selectedCurrency = config.currency_code && config.currency_code !== 'auto'
      ? config.currency_code
      : (receipt.currency || 'ZAR');

    const transactions = receipt.splits.map((split) => {
      const isRefund = split.amount < 0;
      const tx: any = {
        type: (isRefund ? 'deposit' : 'withdrawal') as 'withdrawal' | 'deposit',
        date: dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00+00:00`,
        amount: Math.abs(split.amount).toFixed(2),
        description: split.description || `Item at ${storeName}`,
        source_name: sourceName,
        destination_name: split.destination_name || storeName,
        category_name: split.category || 'General Expenses',
        notes: split.notes || `Extracted by Gemini AI OCR (Qty: ${split.quantity || 1})`,
        tags: [
          'receipt-ai',
          'gemini-ocr',
          (split.category || '').toLowerCase().replace(/[^a-z0-9]/g, '-'),
        ],
      };

      if (selectedCurrency && selectedCurrency !== 'none') {
        tx.currency_code = selectedCurrency;
      }

      return tx;
    });

    return {
      error_if_duplicate_hash: false,
      apply_rules: config.apply_rules ?? true,
      fire_webhooks: config.fire_webhooks ?? true,
      transactions,
    };
  };

  const payload = buildPayload();
  const jsonString = JSON.stringify(payload, null, 2);

  const curlCommand = `curl -X POST "${(config.url || 'https://firefly.yourdomain.com').replace(/\/$/, '')}/api/v1/transactions" \\
  -H "Authorization: Bearer ${config.token || 'YOUR_PERSONAL_ACCESS_TOKEN'}" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" \\
  -d '${jsonString.replace(/'/g, "'\\''")}'`;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `firefly_split_${receipt?.store_name.replace(/\s+/g, '_') || 'transaction'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-bold">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight">
                Firefly III API Payload Inspector
              </h2>
              <p className="text-xs text-slate-500">
                Endpoint: <code className="text-blue-600 font-mono">POST /api/v1/transactions</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 border border-slate-300 shadow-sm transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied JSON' : 'Copy JSON'}</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 border border-slate-300 shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .json</span>
            </button>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <span>
            Firefly III handles single receipts with multiple categories using its native{' '}
            <strong className="text-slate-800">Split Transactions</strong> architecture. In this payload, the root object represents one logged receipt event, while the <code className="text-blue-600 font-mono">transactions</code> array holds each individually categorized line item.
          </span>
        </div>
      </div>

      {/* JSON Viewer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-800 px-4 py-2.5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-400"></span>
            <span className="w-3 h-3 rounded-full bg-amber-400"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
            <span className="text-xs font-mono text-slate-300 ml-2">firefly_split_payload.json</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {payload.transactions.length} split objects
          </span>
        </div>

        <pre className="p-4 sm:p-6 text-xs sm:text-sm font-mono text-blue-300 overflow-x-auto max-h-[460px] leading-relaxed scrollbar-thin">
          <code>{jsonString}</code>
        </pre>
      </div>

      {/* cURL Command Helper */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              CLI / cURL Command
            </h3>
          </div>
          <button
            onClick={handleCopyCurl}
            className="px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs flex items-center gap-1.5 transition border border-slate-200"
          >
            {copiedCurl ? <Check className="w-3 h-3 text-blue-600" /> : <Copy className="w-3 h-3" />}
            <span>{copiedCurl ? 'Copied' : 'Copy cURL'}</span>
          </button>
        </div>

        <pre className="p-3.5 rounded-lg bg-slate-50 text-xs font-mono text-slate-700 overflow-x-auto border border-slate-200 leading-relaxed">
          <code>{curlCommand}</code>
        </pre>
      </div>
    </div>
  );
};
