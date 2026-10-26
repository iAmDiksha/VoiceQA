import React, { useState } from 'react';
import { X, Key, Check, Info } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) {
  const [apiKey, setApiKey] = useState(settings?.apiKey || '');
  const [language, setLanguage] = useState(settings?.language || 'en-IN');
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      apiKey: apiKey.trim(),
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
            <Key size={18} className="text-accent" />
            <h3 className="modal-title">Voice QA Engine Settings</h3>
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
          {/* Info notice about zero-config mode */}
          <div className="settings-notice">
            <Info size={16} className="text-accent flex-shrink-0" />
            <p>
              <strong>Zero-Config Smart Mode:</strong> If no API key is provided, Voice QA automatically
              uses its built-in rule and semantic parser for instant English & Hinglish parsing without any configuration.
            </p>
          </div>

          {/* Gemini API Key */}
          <div className="field-group">
            <label className="field-label">Google Gemini API Key (Optional)</label>
            <div className="input-password-wrapper">
              <input
                type={showKey ? 'text' : 'password'}
                className="input-key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                autoComplete="off"
              />
              <button
                type="button"
                className="btn-toggle-key"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <span className="field-hint">
              Stored securely in your browser's localStorage. Never sent to any third party.
            </span>
          </div>

          {/* Speech Language */}
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
