import React, { useState, useEffect } from 'react';
import {
  FileCode2,
  Copy,
  Check,
  Download,
  Terminal,
  Server,
  Layers,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { ProjectFile } from '../types';

export const PortainerHub: React.FC = () => {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeFile, setActiveFile] = useState<string>('app.py');
  const [copiedFile, setCopiedFile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/project-files')
      .then((res) => res.json())
      .then((data) => {
        if (data.files) {
          setFiles(data.files);
        }
      })
      .catch((err) => console.error('Failed to load project files:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const currentFile = files.find((f) => f.filename === activeFile) || files[0];

  const handleCopyCurrent = () => {
    if (!currentFile) return;
    navigator.clipboard.writeText(currentFile.content);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  const handleDownloadFile = (file: ProjectFile) => {
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    files.forEach((file) => {
      handleDownloadFile(file);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm font-bold">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight">
                Portainer Stack &amp; Podman Project Hub
              </h2>
              <p className="text-xs text-slate-500">
                Ready-to-deploy Python + Gemini AI container configuration for Rocky Linux &amp; Portainer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAll}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Project Files</span>
            </button>
          </div>
        </div>

        {/* Podman & Security Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-slate-800">No Docker Socket</p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Zero <code className="text-slate-700 font-mono">/var/run/docker.sock</code> mounts for rootless Podman security.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5 shadow-sm">
            <Layers className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-slate-800">Rocky Linux &amp; Podman</p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Uses unprivileged UID 1001 user &amp; standard OCI Containerfile.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5 shadow-sm">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-slate-800">Gemini 3.6 Vision API</p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                High-speed multimodal OCR and intelligent line-item split extraction.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Step-by-Step Portainer Stack Guide */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-600" />
          <span>Step-by-Step Deployment Guide (Portainer Stack)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 relative shadow-sm">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-mono font-bold text-xs">
              1
            </span>
            <p className="font-semibold text-xs text-slate-800">Create Stack in Portainer</p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Open Portainer &rarr; Select your Podman environment &rarr; Stacks &rarr; <span className="text-blue-600 font-medium">+ Add stack</span>.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 relative shadow-sm">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-mono font-bold text-xs">
              2
            </span>
            <p className="font-semibold text-xs text-slate-800">Paste docker-compose.yml</p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Name the stack <code className="text-slate-800 font-mono">firefly-receipt-splitter</code> and paste the compose file from below into the Web editor.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 relative shadow-sm">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-mono font-bold text-xs">
              3
            </span>
            <p className="font-semibold text-xs text-slate-800">Set Environment Variables</p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Add <code className="text-blue-600 font-mono">GEMINI_API_KEY</code>, <code className="text-blue-600 font-mono">FIREFLY_URL</code>, and <code className="text-blue-600 font-mono">FIREFLY_TOKEN</code> in Portainer variables.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 relative shadow-sm">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-mono font-bold text-xs">
              4
            </span>
            <p className="font-semibold text-xs text-slate-800">Deploy &amp; Scan Receipts</p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Click <strong className="text-blue-600">Deploy</strong>. Access your self-hosted mobile scanner at <code className="text-slate-800 font-mono">http://&lt;rocky-ip&gt;:8805</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Code Browser */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {/* Tab Navigation */}
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5">
            {files.map((file) => (
              <button
                key={file.filename}
                onClick={() => setActiveFile(file.filename)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeFile === file.filename
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>{file.filename}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyCurrent}
              className="px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-600 transition"
            >
              {copiedFile ? <Check className="w-3.5 h-3.5 text-blue-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFile ? 'Copied' : 'Copy File'}</span>
            </button>

            {currentFile && (
              <button
                onClick={() => handleDownloadFile(currentFile)}
                className="px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-600 transition"
                title="Download this file"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Save</span>
              </button>
            )}
          </div>
        </div>

        {/* Active File Description */}
        {currentFile && (
          <div className="px-5 py-2.5 bg-slate-800/50 border-b border-slate-700/80 flex items-center justify-between text-xs text-slate-400">
            <span>
              <strong className="text-slate-200">{currentFile.name}:</strong> {currentFile.description}
            </span>
            <span className="font-mono text-slate-400 uppercase">{currentFile.language}</span>
          </div>
        )}

        {/* Code Content */}
        <pre className="p-4 sm:p-6 text-xs sm:text-sm font-mono text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed scrollbar-thin">
          <code>{currentFile ? currentFile.content : 'Loading files...'}</code>
        </pre>
      </div>
    </div>
  );
};
