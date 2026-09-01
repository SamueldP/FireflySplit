import React from 'react';
import { Receipt, Server, FileCode2, Code2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface NavbarProps {
  activeTab: 'scanner' | 'config' | 'portainer' | 'payload';
  setActiveTab: (tab: 'scanner' | 'config' | 'portainer' | 'payload') => void;
  fireflyConnected: boolean;
  geminiReady: boolean;
  splitsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  fireflyConnected,
  geminiReady,
  splitsCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm text-white font-black text-xl border border-blue-700">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-slate-900">Firefly III</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-medium">
                  AI Splitter
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Receipt OCR &bull; Intelligent Categorization &bull; Split Transactions
              </p>
            </div>
          </div>

          {/* Status Badges on Mobile */}
          <div className="flex sm:hidden items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                geminiReady ? 'bg-blue-500 animate-pulse' : 'bg-amber-400'
              }`}
              title={geminiReady ? 'Gemini AI Ready' : 'Gemini AI Pending'}
            />
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                fireflyConnected ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
              title={fireflyConnected ? 'Firefly Connected' : 'Firefly Standby'}
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl w-full sm:w-auto overflow-x-auto scrollbar-none text-xs sm:text-sm font-medium">
          <button
            id="nav-tab-scanner"
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'scanner'
                ? 'bg-white text-blue-700 shadow-sm font-semibold border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Receipt Scanner</span>
            {splitsCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'scanner'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {splitsCount} splits
              </span>
            )}
          </button>

          <button
            id="nav-tab-config"
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'config'
                ? 'bg-white text-blue-700 shadow-sm font-semibold border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Firefly Sync</span>
            {fireflyConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>

          <button
            id="nav-tab-payload"
            onClick={() => setActiveTab('payload')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'payload'
                ? 'bg-white text-blue-700 shadow-sm font-semibold border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>JSON Payload</span>
          </button>

          <button
            id="nav-tab-portainer"
            onClick={() => setActiveTab('portainer')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'portainer'
                ? 'bg-white text-blue-700 shadow-sm font-semibold border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>Portainer / Podman</span>
          </button>
        </nav>

        {/* Desktop Status Indicators */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-slate-600">Gemini 3.6 Vision</span>
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          </div>

          <div
            className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs transition-colors ${
              fireflyConnected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            {fireflyConnected ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{fireflyConnected ? 'Firefly Online' : 'Firefly Standby'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
