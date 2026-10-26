import React, { useState, useEffect } from 'react';
import { X, Cpu, Check, ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import { checkBackendAIStatus } from '../services/aiService';

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) {
  const [model, setModel] = useState(settings?.model || 'gemini-1.5-flash');
  const [language, setLanguage] = useState(settings?.language || 'en-IN');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [backendStatus, setBackendStatus] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    const status = await checkBackendAIStatus();
    setBackendStatus(status);
    setIsTesting(false);
  };

  useEffect(() => {
    let active = true;
    if (isOpen) {
      checkBackendAIStatus().then((status) => {
        if (active) {
          setBackendStatus(status);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      model,
      language,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <Cpu size={18} className="text-accent" />
            <h3 className="modal-title">AI Engine & Environment Settings</h3>
          </div>
          <button
            type="button"
            className="btn-icon-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-body">
          {/* Security & Netlify status notice */}
          <div className="settings-notice security-notice">
            <ShieldCheck size={18} className="text-success flex-shrink-0" />
            <div className="notice-body">
              <strong>Secure Backend Proxy (Netlify Functions)</strong>
              <p>
                API keys are never stored in your browser or exposed to client-side code.
                All AI calls are securely proxied via Netlify serverless functions.
              </p>
            </div>
          </div>

          {/* Backend Connection Health Check */}
          <div className="backend-status-card">
            <div className="backend-status-header">
              <span className="field-label">Backend Function Status</span>
              <button
                type="button"
                className="btn-text-sm"
                onClick={handleTestConnection}
                disabled={isTesting}
              >
                <RefreshCw size={12} className={isTesting ? 'spinning' : ''} />
                <span>{isTesting ? 'Checking...' : 'Check Connection'}</span>
              </button>
            </div>

            <div className="backend-status-content">
              {backendStatus ? (
                backendStatus.online ? (
                  backendStatus.aiConfigured ? (
                    <div className="status-pill status-pill-success">
                      <Check size={14} />
                      <span>Netlify Function Active · GEMINI_API_KEY Configured</span>
                    </div>
                  ) : (
                    <div className="status-pill status-pill-warning">
                      <AlertTriangle size={14} />
                      <span>Netlify Function Active · Running in Fallback Mode (GEMINI_API_KEY not set)</span>
                    </div>
                  )
                ) : (
                  <div className="status-pill status-pill-warning">
                    <AlertTriangle size={14} />
                    <span>Backend offline: local rule-based engine will be used</span>
                  </div>
                )
              ) : (
                <div className="status-pill status-pill-neutral">Checking backend...</div>
              )}
            </div>

            <p className="field-hint">
              To activate Gemini AI: add <code>GEMINI_API_KEY</code> in Netlify Environment Variables
              (or in local <code>.env</code>).
            </p>
          </div>

          {/* AI Model Selection */}
          <div className="field-group">
            <label className="field-label">AI Model</label>
            <select
              className="select-lang-full"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast, Free Tier, Recommended)</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (Latest Next-Gen Generation)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning for Complex Cases)</option>
            </select>
            <span className="field-hint">
              Free API keys with generous limits can be obtained at <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="link-text">Google AI Studio</a>.
            </span>
          </div>

          {/* Speech Language Dialect */}
          <div className="field-group">
            <label className="field-label">Primary Speech Recognition Dialect</label>
            <select
              className="select-lang-full"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="en-IN">Indian English & Hinglish (en-IN) — Recommended</option>
              <option value="en-US">US English (en-US)</option>
              <option value="hi-IN">Hindi Native (hi-IN)</option>
            </select>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-modal-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-modal-save"
            >
              {savedSuccess ? (
                <>
                  <Check size={16} className="text-success" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Preferences</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
