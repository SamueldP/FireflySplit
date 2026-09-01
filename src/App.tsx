import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ReceiptScanner } from './components/ReceiptScanner';
import { SplitTransactionEditor } from './components/SplitTransactionEditor';
import { FireflyConfigPanel } from './components/FireflyConfigPanel';
import { PayloadInspector } from './components/PayloadInspector';
import { PortainerHub } from './components/PortainerHub';
import { ParsedReceipt, FireflyConfig } from './types';
import { SAMPLE_RECEIPTS } from './data/samples';
import { ArrowRight, CheckCircle2, RefreshCw, Sparkles, Shield, Receipt } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'config' | 'portainer' | 'payload'>('scanner');
  
  // Default with the first sample (Costco Lego + Groceries) for instant out-of-the-box exploration!
  const defaultSample = SAMPLE_RECEIPTS[0];
  const [currentReceipt, setCurrentReceipt] = useState<ParsedReceipt | null>(defaultSample.sample_data);
  const [currentImage, setCurrentImage] = useState<string | null>(defaultSample.image_url);
  const [isProcessing, setIsProcessing] = useState(false);

  // Firefly configuration state
  const [config, setConfig] = useState<FireflyConfig>({
    url: 'http://192.168.101.225:8585',
    token: '728776fe917fa53f83467441756c29db',
    source_account: 'Discovery',
    apply_rules: true,
    fire_webhooks: true,
  });

  const [fireflyConnected, setFireflyConnected] = useState(false);
  const [geminiReady, setGeminiReady] = useState(true);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const [fireflyCategories, setFireflyCategories] = useState<string[]>([]);

  // Load configuration from local storage or server defaults
  useEffect(() => {
    const savedConfig = localStorage.getItem('firefly_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig((prev) => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to parse saved config:', e);
      }
    }

    // Check backend health
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        setGeminiReady(Boolean(data.gemini_configured));
        if (data.firefly_url && !config.url) {
          setConfig((prev) => ({ ...prev, url: data.firefly_url }));
        }
      })
      .catch((err) => console.warn('Health check warning:', err));
  }, []);

  // Save config changes to localStorage
  useEffect(() => {
    if (config.url || config.token) {
      localStorage.setItem('firefly_config', JSON.stringify(config));
    }
  }, [config]);

  // Fetch categories when config is ready
  useEffect(() => {
    if (config.url && config.token) {
      fetch('/api/firefly/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firefly_url: config.url, firefly_token: config.token }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.categories) {
            setFireflyCategories(data.categories);
            setFireflyConnected(true);
          }
        })
        .catch((err) => console.warn('Failed to fetch categories:', err));
    }
  }, [config.url, config.token]);

  const handleParsed = (data: ParsedReceipt, imagePreview: string | null) => {
    setCurrentReceipt(data);
    if (imagePreview) setCurrentImage(imagePreview);
  };

  const handleSuccessSubmit = (txId: string) => {
    setLastTxId(txId);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-200 selection:text-blue-900">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        fireflyConnected={fireflyConnected}
        geminiReady={geminiReady}
        splitsCount={currentReceipt?.splits.length || 0}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Tab 1: Receipt Scanner & Split Transaction Editor */}
        {activeTab === 'scanner' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Image Scanner & Photo Input */}
            <div className="lg:col-span-5 space-y-6">
              <ReceiptScanner
                onParsed={handleParsed}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
                currentImage={currentImage}
                setCurrentImage={setCurrentImage}
                categories={fireflyCategories}
              />
            </div>

            {/* Right Column: Split Transaction Editor & Category Breakdown */}
            <div className="lg:col-span-7 space-y-6">
              {currentReceipt ? (
                <SplitTransactionEditor
                  receipt={currentReceipt}
                  onChange={setCurrentReceipt}
                  onProceedToSync={() => setActiveTab('config')}
                  onViewPayload={() => setActiveTab('payload')}
                />
              ) : (
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-white border border-slate-200 shadow-sm rounded-xl text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <Receipt className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">No Receipt Loaded</h3>
                  <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
                    Upload a receipt photo, snap a picture, or select one of the preloaded test samples on the left to extract line-item splits with Gemini AI.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Firefly III Connection & Split Push */}
        {activeTab === 'config' && (
          <FireflyConfigPanel
            config={config}
            setConfig={setConfig}
            receipt={currentReceipt}
            onSuccessSubmit={handleSuccessSubmit}
            fireflyConnected={fireflyConnected}
            setFireflyConnected={setFireflyConnected}
          />
        )}

        {/* Tab 3: JSON Payload Inspector */}
        {activeTab === 'payload' && (
          <PayloadInspector receipt={currentReceipt} config={config} />
        )}

        {/* Tab 4: Portainer & Podman Stack Hub */}
        {activeTab === 'portainer' && <PortainerHub />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-5 px-4 sm:px-8 mt-auto text-sm text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Firefly III AI Receipt Splitter</span>
            <span>&bull;</span>
            <span>Gemini Multimodal OCR Engine</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>Podman &bull; Portainer Stack &bull; Rocky Linux</span>
            <button
              onClick={() => setActiveTab('portainer')}
              className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
            >
              Deployment Files &rarr;
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
