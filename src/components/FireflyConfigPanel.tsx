import React, { useState, useEffect } from 'react';
import {
  Server,
  Key,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  Check,
  Copy,
  Coins,
  ChevronDown,
  ChevronUp,
  Bug,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FireflyConfig, FireflyAccount, FireflyCurrency, ParsedReceipt } from '../types';

interface FireflyConfigPanelProps {
  config: FireflyConfig;
  setConfig: React.Dispatch<React.SetStateAction<FireflyConfig>>;
  receipt: ParsedReceipt | null;
  onSuccessSubmit: (transactionId: string) => void;
  fireflyConnected: boolean;
  setFireflyConnected: (val: boolean) => void;
}

interface ErrorDetails {
  title: string;
  message: string;
  status?: number;
  fieldErrors?: Record<string, string[]>;
  rawResponse?: any;
  payloadSent?: any;
}

export const FireflyConfigPanel: React.FC<FireflyConfigPanelProps> = ({
  config,
  setConfig,
  receipt,
  onSuccessSubmit,
  fireflyConnected,
  setFireflyConnected,
}) => {
  const [showToken, setShowToken] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    version?: string;
  } | null>(null);
  const [accounts, setAccounts] = useState<FireflyAccount[]>([]);
  const [currencies, setCurrencies] = useState<FireflyCurrency[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<ErrorDetails | null>(null);
  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);
  const [simulationMode, setSimulationMode] = useState(false);
  const [showRawError, setShowRawError] = useState(true);
  const [copiedErrorJson, setCopiedErrorJson] = useState(false);
  const [copiedPayloadJson, setCopiedPayloadJson] = useState(false);

  // Auto-fetch accounts & currencies if config exists
  useEffect(() => {
    if (config.url && config.token) {
      fetchAccounts();
      fetchCurrencies();
    }
  }, [config.url, config.token]);

  // Test Firefly connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setSubmitError(null);

    try {
      const res = await fetch('/api/firefly/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firefly_url: config.url,
          firefly_token: config.token,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({
          success: true,
          version: data.version || 'Connected',
          message: 'Successfully reached Firefly III instance!',
        });
        setFireflyConnected(true);
        fetchAccounts();
        fetchCurrencies();
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Connection failed.',
        });
        setFireflyConnected(false);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error contacting Firefly III.',
      });
      setFireflyConnected(false);
    } finally {
      setIsTesting(false);
    }
  };

  // Fetch accounts from Firefly
  const fetchAccounts = async () => {
    if (!config.url || !config.token) return;
    setIsLoadingAccounts(true);

    try {
      const res = await fetch('/api/firefly/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firefly_url: config.url,
          firefly_token: config.token,
        }),
      });

      const data = await res.json();
      if (res.ok && data.accounts) {
        setAccounts(data.accounts);
      }
    } catch (err) {
      console.warn('Could not fetch accounts:', err);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  // Fetch currencies from Firefly
  const fetchCurrencies = async () => {
    if (!config.url || !config.token) return;
    setIsLoadingCurrencies(true);

    try {
      const res = await fetch('/api/firefly/currencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firefly_url: config.url,
          firefly_token: config.token,
        }),
      });

      const data = await res.json();
      if (res.ok && data.currencies) {
        setCurrencies(data.currencies);
      }
    } catch (err) {
      console.warn('Could not fetch currencies:', err);
    } finally {
      setIsLoadingCurrencies(false);
    }
  };

  // Submit split transaction to Firefly III
  const handleSubmitTransaction = async () => {
    if (!receipt || receipt.splits.length === 0) {
      setSubmitError({
        title: 'No splits to submit',
        message: 'No receipt splits available to submit. Please scan a receipt first.',
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setLastSubmittedId(null);

    // Simulation / Dry-Run Mode
    if (simulationMode) {
      setTimeout(() => {
        const mockId = Math.floor(1000 + Math.random() * 9000).toString();
        setLastSubmittedId(mockId);
        setIsSubmitting(false);
        onSuccessSubmit(mockId);
        triggerConfetti();
      }, 750);
      return;
    }

    if (!config.url || !config.token) {
      setSubmitError({
        title: 'Missing Configuration',
        message: 'Firefly URL and Personal Access Token are required. Please configure below or enable Simulation Mode.',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/firefly/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firefly_url: config.url,
          firefly_token: config.token,
          source_account: config.source_account,
          currency_code: config.currency_code,
          receipt_data: receipt,
          apply_rules: config.apply_rules,
          fire_webhooks: config.fire_webhooks,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setLastSubmittedId(data.transaction_id || 'OK');
        onSuccessSubmit(data.transaction_id || 'OK');
        triggerConfetti();
      } else {
        const fieldErrors = data.errors || data.firefly_response?.errors || undefined;
        const msg = data.message || data.error || data.details || 'Failed to create transaction in Firefly III.';
        
        setSubmitError({
          title: `Firefly III Rejected Transaction (HTTP ${res.status})`,
          message: typeof msg === 'string' ? msg : JSON.stringify(msg),
          status: res.status,
          fieldErrors: fieldErrors,
          rawResponse: data.firefly_response || data,
          payloadSent: data.payload_sent,
        });
      }
    } catch (err: any) {
      setSubmitError({
        title: 'Communication Error',
        message: err.message || 'Error communicating with Firefly III server.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  const handleCopyErrorJson = () => {
    if (!submitError?.rawResponse) return;
    navigator.clipboard.writeText(JSON.stringify(submitError.rawResponse, null, 2));
    setCopiedErrorJson(true);
    setTimeout(() => setCopiedErrorJson(false), 2000);
  };

  const handleCopyPayloadJson = () => {
    if (!submitError?.payloadSent) return;
    navigator.clipboard.writeText(JSON.stringify(submitError.payloadSent, null, 2));
    setCopiedPayloadJson(true);
    setTimeout(() => setCopiedPayloadJson(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Status & Action */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight">
                Firefly III Instance Integration
              </h2>
              <p className="text-xs text-slate-500">
                Direct POST to <code className="text-blue-600 font-mono">/api/v1/transactions</code> with native split lines
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={simulationMode}
                onChange={(e) => setSimulationMode(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700 font-medium">Dry Run / Simulation Mode</span>
            </label>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Firefly URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Firefly III Base URL
            </label>
            <div className="relative">
              <input
                type="text"
                value={config.url}
                onChange={(e) => setConfig((prev) => ({ ...prev, url: e.target.value }))}
                placeholder="https://firefly.yourdomain.com"
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400 shadow-sm transition"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Your self-hosted instance URL (HTTPS or local LAN IP/port)
            </p>
          </div>

          {/* Personal Access Token */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Personal Access Token (PAT)
              </label>
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="text-[11px] text-blue-600 hover:underline"
              >
                {showToken ? 'Hide' : 'Show Token'}
              </button>
            </div>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={config.token}
                onChange={(e) => setConfig((prev) => ({ ...prev, token: e.target.value }))}
                placeholder="ey..."
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400 shadow-sm transition"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Created in Firefly under <span className="text-slate-700 font-medium">Profile &rarr; OAuth &rarr; Personal Access Tokens</span>
            </p>
          </div>

          {/* Source Account */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                Source Asset Account
              </label>
              {accounts.length > 0 && (
                <span className="text-[10px] text-blue-600 font-medium">
                  {accounts.length} accounts found
                </span>
              )}
            </div>

            {accounts.length > 0 ? (
              <select
                value={config.source_account}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, source_account: e.target.value }))
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.name}>
                    {acc.name} ({acc.currency_code} {acc.current_balance || '0.00'})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={config.source_account}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, source_account: e.target.value }))
                }
                placeholder="Discovery"
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition"
              />
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              Asset account that paid for the receipt (e.g. Discovery, Checking, Visa)
            </p>
          </div>

          {/* Currency Preference */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-slate-400" />
                Firefly Currency Code
              </label>
              {currencies.length > 0 && (
                <span className="text-[10px] text-emerald-600 font-medium">
                  {currencies.filter(c => c.enabled).length} active currencies
                </span>
              )}
            </div>

            <select
              value={config.currency_code || 'auto'}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, currency_code: e.target.value }))
              }
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition"
            >
              <option value="auto">
                Auto-detect from receipt (Currently: {receipt?.currency || 'ZAR'})
              </option>
              {currencies.map((curr) => (
                <option key={curr.id} value={curr.code}>
                  {curr.code} - {curr.name} ({curr.symbol}) {curr.primary ? '★ Primary' : ''}
                </option>
              ))}
              <option value="ZAR">ZAR - South African Rand (R)</option>
              <option value="USD">USD - US Dollar ($)</option>
              <option value="EUR">EUR - Euro (€)</option>
              <option value="GBP">GBP - British Pound (£)</option>
              <option value="none">Omit currency_code (Use Firefly Account Default)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Select an enabled currency code in your Firefly III or omit to use account default
            </p>
          </div>

          {/* Quick Options */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Transaction Rules &amp; Hooks
            </label>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.apply_rules}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, apply_rules: e.target.checked }))
                  }
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Apply Firefly Automated Rules</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.fire_webhooks}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, fire_webhooks: e.target.checked }))
                  }
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Fire Configured Webhooks</span>
              </label>
            </div>
          </div>
        </div>

        {/* Test Connection Button & Result */}
        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-200">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-test-firefly"
              onClick={handleTestConnection}
              disabled={isTesting || (!config.url && !config.token)}
              className="px-4 py-2 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-sm flex items-center gap-1.5 transition"
            >
              {isTesting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              )}
              <span>{isTesting ? 'Testing Ping...' : 'Test Connection'}</span>
            </button>

            {config.url && config.token && (
              <>
                <button
                  onClick={fetchAccounts}
                  disabled={isLoadingAccounts}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition"
                >
                  {isLoadingAccounts ? 'Fetching...' : 'Refresh Accounts'}
                </button>
                <button
                  onClick={fetchCurrencies}
                  disabled={isLoadingCurrencies}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition"
                >
                  {isLoadingCurrencies ? 'Fetching...' : 'Refresh Currencies'}
                </button>
              </>
            )}
          </div>

          {/* Test Status Indicator */}
          {testResult && (
            <div
              className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{testResult.message} {testResult.version && `(${testResult.version})`}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Submission Card for Current Receipt */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm">Submit Split Transaction</h3>
          </div>

          {receipt && (
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-full">
              {receipt.splits.length} splits &bull; {receipt.currency || 'ZAR'} {receipt.total_amount.toFixed(2)}
            </span>
          )}
        </div>

        {receipt ? (
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <p className="text-sm font-bold text-slate-800">{receipt.store_name}</p>
                <p className="text-xs text-slate-500">{receipt.date} &bull; {receipt.splits.length} split categories</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Total Withdrawal</p>
                <p className="text-base font-mono font-bold text-slate-900">
                  {receipt.currency} {receipt.total_amount.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 text-xs pr-1">
              {receipt.splits.map((s, idx) => (
                <div
                  key={s.id || idx}
                  className="flex items-center justify-between p-2 rounded-md bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-slate-400 w-4">#{idx + 1}</span>
                    <span className="text-slate-800 font-medium truncate">{s.description}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-mono">
                      {s.category}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-700 shrink-0">
                    {receipt.currency} {Number(s.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-lg space-y-2">
            <Info className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs text-slate-500">
              No receipt loaded. Upload a receipt or select a test sample in the Receipt Scanner tab.
            </p>
          </div>
        )}

        {/* Detailed Submission Error Banner & JSON Inspector */}
        {submitError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3.5 text-slate-800 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-red-900 text-sm">{submitError.title}</h4>
                  <p className="text-xs text-red-700 mt-0.5">{submitError.message}</p>
                </div>
              </div>
              {submitError.status && (
                <span className="px-2 py-0.5 rounded bg-red-200 text-red-800 font-mono text-xs font-bold">
                  HTTP {submitError.status}
                </span>
              )}
            </div>

            {/* Field-by-Field Error List */}
            {submitError.fieldErrors && Object.keys(submitError.fieldErrors).length > 0 && (
              <div className="bg-white/80 border border-red-200 rounded-lg p-3 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-red-800 font-semibold">
                  <Bug className="w-4 h-4 text-red-600" />
                  <span>Firefly Validation Details ({Object.keys(submitError.fieldErrors).length} issues):</span>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(submitError.fieldErrors).map(([field, messages]) => (
                    <div key={field} className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 p-2 rounded bg-red-50/60 border border-red-100">
                      <code className="font-mono text-[11px] font-bold text-red-800 bg-red-100 px-1.5 py-0.5 rounded shrink-0">
                        {field}
                      </code>
                      <span className="text-red-700 font-medium text-xs">
                        {Array.isArray(messages) ? messages.join(' ') : String(messages)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actionable Suggestions based on common Firefly errors */}
            {submitError.fieldErrors && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold">
                  <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>How to fix this:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-amber-800 text-[11px] pl-1">
                  {JSON.stringify(submitError.fieldErrors).includes('currency_code') && (
                    <li>
                      <strong>Invalid Currency:</strong> Your Firefly III instance does not have <code>{receipt?.currency || 'ZAR'}</code> enabled. Select one of your enabled currencies from the <strong>Firefly Currency Code</strong> dropdown above, or choose <em>"Omit currency_code"</em>.
                    </li>
                  )}
                  {JSON.stringify(submitError.fieldErrors).includes('source_name') && (
                    <li>
                      <strong>Invalid Source Account:</strong> The account name <code>{config.source_account}</code> was not found as an active Asset account. Click <em>"Refresh Accounts"</em> above and pick your exact asset account from the dropdown.
                    </li>
                  )}
                  {JSON.stringify(submitError.fieldErrors).includes('category_name') && (
                    <li>
                      <strong>Invalid Category:</strong> A category name format was rejected. Firefly III automatically creates categories unless restricted by role.
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Toggleable Raw JSON Inspector */}
            <div className="border-t border-red-200 pt-2.5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowRawError(!showRawError)}
                  className="text-xs font-semibold text-red-800 hover:text-red-900 flex items-center gap-1"
                >
                  {showRawError ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{showRawError ? 'Hide Raw JSON Response' : 'Show Raw JSON Response'}</span>
                </button>

                <div className="flex items-center gap-2">
                  {submitError.payloadSent && (
                    <button
                      type="button"
                      onClick={handleCopyPayloadJson}
                      className="text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200 flex items-center gap-1 transition"
                    >
                      {copiedPayloadJson ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedPayloadJson ? 'Copied Payload!' : 'Copy Payload Sent'}</span>
                    </button>
                  )}
                  {submitError.rawResponse && (
                    <button
                      type="button"
                      onClick={handleCopyErrorJson}
                      className="text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200 flex items-center gap-1 transition"
                    >
                      {copiedErrorJson ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedErrorJson ? 'Copied JSON!' : 'Copy Firefly Response'}</span>
                    </button>
                  )}
                </div>
              </div>

              {showRawError && submitError.rawResponse && (
                <div className="mt-2 space-y-2">
                  <div className="relative">
                    <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto max-h-56 select-all">
                      {JSON.stringify(submitError.rawResponse, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Success Confirmation Banner */}
        {lastSubmittedId && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-emerald-900 text-sm">
                  Split Transaction Successfully Logged!
                </p>
                <p className="text-emerald-700">
                  Transaction ID #{lastSubmittedId} created with {receipt?.splits.length} split items.
                </p>
              </div>
            </div>
            {config.url && !simulationMode && (
              <a
                href={`${config.url.replace(/\/$/, '')}/transactions/show/${lastSubmittedId}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 transition whitespace-nowrap"
              >
                <span>Open in Firefly</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Action Button */}
        <button
          id="btn-push-firefly"
          onClick={handleSubmitTransaction}
          disabled={isSubmitting || !receipt}
          className="w-full py-3.5 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-200"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Transmitting Splits to Firefly III...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>
                {simulationMode
                  ? 'Simulate Firefly III Split Push'
                  : 'Push Split Transaction to Firefly III'}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

