import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, RotateCcw, Zap } from 'lucide-react';

const SAMPLE_PROMPTS = [
  {
    label: 'Payment 500 (Hinglish)',
    text: 'Checkout page pe jab hum proceed to payment click karte hain toh app crash ho jata hai aur 500 internal server error aata hai, cart reset nahi hota.',
  },
  {
    label: 'Login Spinner (Hinglish)',
    text: 'Login screen me invalid password daalne ke baad error message nahi dikhta aur submit button pe spinner ghoomta rehta hai indefinitely.',
  },
  {
    label: 'Profile Upload (Hinglish)',
    text: 'User profile me avatar photo upload karte hi blank white screen ho jati hai aur console me undefined reading avatar error aata hai.',
  },
  {
    label: 'Session Expiry (English)',
    text: 'When clicking renew subscription after session timeout, user is not redirected to login page and state remains locked.',
  },
];

export default function DictationPanel({
  transcript,
  onTranscriptChange,
  isListening,
  onToggleListening,
  onGenerate,
  isGenerating,
  speechSupported,
}) {
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (isListening) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setRecordingSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening]);

  const handleToggle = () => {
    if (!isListening) {
      setRecordingSeconds(0);
    }
    onToggleListening();
  };

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleApplySample = (sampleText) => {
    onTranscriptChange(sampleText);
  };

  const handleClear = () => {
    onTranscriptChange('');
  };

  return (
    <div className="panel dictation-panel">
      <div className="panel-header">
        <div className="panel-title-wrapper">
          <div className="mic-status-indicator">
            <span className={`status-orb ${isListening ? 'orb-listening' : 'orb-idle'}`}></span>
          </div>
          <div>
            <h2 className="panel-title">Voice Dictation Deck</h2>
            <p className="panel-description">
              Describe the bug in plain English or Hinglish. Wispr Flow or Web Speech supported.
            </p>
          </div>
        </div>

        <div className="handsfree-tag" title="Hands-free keyboard shortcuts enabled">
          <Zap size={14} />
          <span>No-Hands Mode</span>
        </div>
      </div>

      <div className="mic-hero-container">
        <button
          type="button"
          className={`btn-mic-hero ${isListening ? 'recording' : ''}`}
          onClick={handleToggle}
          aria-label={isListening ? 'Stop recording' : 'Start voice recording'}
        >
          {isListening ? (
            <div className="mic-active-inner">
              <MicOff size={28} className="mic-hero-icon" />
              <div className="pulse-ring ring-1"></div>
              <div className="pulse-ring ring-2"></div>
            </div>
          ) : (
            <div className="mic-idle-inner">
              <Mic size={28} className="mic-hero-icon" />
            </div>
          )}
        </button>

        <div className="mic-status-meta">
          {isListening ? (
            <div className="listening-meta">
              <span className="live-pill">REC {formatTimer(recordingSeconds)}</span>
              <p className="mic-prompt-text text-accent">Listening... Speak naturally in English or Hinglish</p>
            </div>
          ) : (
            <div className="idle-meta">
              <p className="mic-prompt-text">
                {speechSupported
                  ? 'Click microphone to speak or type directly below'
                  : 'Speech API unavailable; dictation can be typed or pasted via Wispr Flow'}
              </p>
              <div className="shortcut-hints">
                <span className="kbd-shortcut">Space</span> to toggle mic &nbsp;·&nbsp;
                <span className="kbd-shortcut">Ctrl + Enter</span> to generate
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spoken / dictated transcript editor */}
      <div className="transcript-box-wrapper">
        <div className="transcript-box-header">
          <span className="box-title">Spoken Transcript & Input</span>
          <div className="box-actions">
            {transcript && (
              <button
                type="button"
                className="btn-text-sm"
                onClick={handleClear}
                title="Clear transcript"
              >
                <RotateCcw size={12} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        <textarea
          className="transcript-textarea"
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          placeholder="E.g., 'Checkout page pe jab apply coupon click kiya toh app freeze ho gaya aur 500 error aa gaya...'"
          rows={5}
        />
      </div>

      {/* Quick Hinglish & English sample chips */}
      <div className="sample-prompts-section">
        <span className="sample-label">Quick Scenarios:</span>
        <div className="sample-chips-grid">
          {SAMPLE_PROMPTS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              className="sample-chip"
              onClick={() => handleApplySample(sample.text)}
              title="Load sample Hinglish scenario"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="dictation-footer">
        <button
          type="button"
          className="btn-primary-generate"
          onClick={onGenerate}
          disabled={!transcript.trim() || isGenerating}
        >
          {isGenerating ? (
            <>
              <span className="spinner-sm"></span>
              <span>Structuring Bug Report & Test Case...</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>Generate Bug Report & Test Case</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
