import React from 'react';
import { Terminal, Settings, Archive } from 'lucide-react';

export default function Header({
  savedCount,
  onOpenSaved,
  onOpenSettings,
  currentLanguage,
  onChangeLanguage,
}) {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-icon-wrapper">
          <Terminal className="brand-icon" size={20} />
          <span className="brand-dot"></span>
        </div>
        <div className="brand-text">
          <div className="brand-title-row">
            <h1 className="brand-title">Voice QA</h1>
            <span className="badge-track">Builder Track</span>
          </div>
          <p className="brand-subtitle">
            Voice-to-Bug & Test Case Studio <span className="text-dim">· Wemakedevs × Wispr Flow</span>
          </p>
        </div>
      </div>

      <div className="header-actions">
        <div className="lang-selector-wrapper">
          <span className="lang-label">Dialect:</span>
          <select
            className="lang-select"
            value={currentLanguage}
            onChange={(e) => onChangeLanguage(e.target.value)}
            title="Speech Recognition Dialect"
          >
            <option value="en-IN">English / Hinglish (India)</option>
            <option value="en-US">English (US)</option>
            <option value="hi-IN">Hindi (India)</option>
          </select>
        </div>

        <button
          className="btn-header-secondary"
          onClick={onOpenSaved}
          title="View Saved Reports"
        >
          <Archive size={16} />
          <span>Saved Reports</span>
          {savedCount > 0 && <span className="badge-count">{savedCount}</span>}
        </button>

        <button
          className="btn-header-icon"
          onClick={onOpenSettings}
          title="Configure API & Preferences"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
