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
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FireflyConfig, FireflyAccount, ParsedReceipt } from '../types';

interface FireflyConfigPanelProps {
  config: FireflyConfig;
  setConfig: React.Dispatch<React.SetStateAction<FireflyConfig>>;
  receipt: ParsedReceipt | null;
  onSuccessSubmit: (transactionId: string) => void;
  fireflyConnected: boolean;
  setFireflyConnected: (val: boolean) => void;
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
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);
  const [simulationMode, setSimulationMode] = useState(false);

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
        // Automatically fetch accounts upon successful connection
        fetchAccounts();
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

  // Submit split transaction to Firefly III
  const handleSubmitTransaction = async () => {
    if (!receipt || receipt.splits.length === 0) {
      setSubmitError('No receipt splits available to submit. Please scan a receipt first.');
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
      setSubmitError('Firefly URL and Personal Access Token are required. Please configure below or enable Simulation Mode.');
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
        setSubmitError(data.error || data.details || 'Failed to create transaction in Firefly III.');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Error communicating with Firefly III server.');
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
              Account that paid for the receipt (e.g. Checking, Visa, Cash)
            </p>
          </div>

          {/* Quick Options */}
          <div className="flex flex-col justify-between">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Transaction Rules &amp; Hooks
            </label>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
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
          <div className="flex items-center gap-2">
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
              <button
                onClick={fetchAccounts}
                disabled={isLoadingAccounts}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition"
              >
                {isLoadingAccounts ? 'Fetching...' : 'Fetch Accounts'}
              </button>
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
              {receipt.splits.length} splits &bull; R{receipt.total_amount.toFixed(2)}
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
                  R{receipt.total_amount.toFixed(2)} {receipt.currency}
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
                    R{Number(s.amount).toFixed(2)}
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

        {/* Submission Error Banner */}
        {submitError && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Submission failed</p>
              <p className="text-red-600 mt-0.5">{submitError}</p>
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
