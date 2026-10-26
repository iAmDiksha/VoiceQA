import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import DictationPanel from './components/DictationPanel';
import ReportStudio from './components/ReportStudio';
import SavedReportsDrawer from './components/SavedReportsDrawer';
import SettingsModal from './components/SettingsModal';
import { VoiceRecorder } from './services/speechRecognition';
import { generateBugReport } from './services/aiService';
import {
  getSavedReports,
  saveReport,
  deleteReport,
  getSettings,
  saveSettings,
} from './services/storageService';
import './App.css';

export default function App() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState(null);
  const [savedReports, setSavedReports] = useState(() => getSavedReports());
  const [settings, setSettings] = useState(getSettings());
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  const recorderRef = useRef(null);
  const speechSupported = VoiceRecorder.isSupported();

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  // Initialize Speech Recorder
  useEffect(() => {
    if (!speechSupported) return;

    const recorder = new VoiceRecorder({
      onResult: ({ finalText }) => {
        setTranscript((prev) => {
          // If we had text and final text arrives, append smoothly
          if (finalText) {
            return (prev ? prev.trim() + ' ' : '') + finalText.trim();
          }
          return prev;
        });
      },
      onError: (err) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
        if (err === 'not-allowed') {
          showToast('Microphone access denied. You can still type or paste text.');
        } else if (err !== 'no-speech') {
          showToast(`Microphone notice: ${err}`);
        }
      },
      onStatusChange: (listening) => {
        setIsListening(listening);
      },
    });

    recorder.setLanguage(settings.language || 'en-IN');
    recorderRef.current = recorder;

    return () => {
      recorder.stop();
    };
  }, [settings.language, showToast, speechSupported]);

  // Handle Voice Toggle
  const handleToggleListening = useCallback(() => {
    if (!speechSupported) {
      showToast('Browser Speech API not supported in this browser. You can type or paste via Wispr Flow.');
      return;
    }
    if (recorderRef.current) {
      recorderRef.current.toggle();
    }
  }, [speechSupported, showToast]);

  // Handle Generation
  const handleGenerate = useCallback(async () => {
    if (!transcript.trim()) {
      showToast('Please record or enter a bug description first.');
      return;
    }

    if (recorderRef.current && isListening) {
      recorderRef.current.stop();
    }

    setIsGenerating(true);
    setIsSaved(false);

    try {
      const generated = await generateBugReport(transcript, settings.model || 'gemini-1.5-flash');
      setReport(generated);
      if (generated._source === 'ai') {
        showToast(`✨ Generated with Gemini AI (${generated._model || '1.5 Flash'})!`);
      } else {
        showToast('⚡ Generated with Smart Fallback Engine (Backend API key not configured)');
      }
    } catch (err) {
      console.error('Generation failed:', err);
      showToast(`Error: ${err.message || 'Failed to generate report'}`);
    } finally {
      setIsGenerating(false);
    }
  }, [transcript, isListening, settings.model, showToast]);

  // Keyboard Shortcuts: Ctrl+Enter to generate, Space to toggle mic (when not in text input)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Enter or Cmd+Enter to generate
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGenerate();
        return;
      }

      // Spacebar toggles mic ONLY when not actively typing in an input or textarea
      if (
        e.code === 'Space' &&
        document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA' &&
        !isSettingsOpen &&
        !isSavedDrawerOpen
      ) {
        e.preventDefault();
        handleToggleListening();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGenerate, handleToggleListening, isSettingsOpen, isSavedDrawerOpen]);

  // Save report
  const handleSaveReport = () => {
    if (!report) return;
    const updated = saveReport(report);
    setSavedReports(updated);
    setIsSaved(true);
    showToast('Report saved to local workbench history!');
  };

  // Delete saved report
  const handleDeleteReport = (id) => {
    const updated = deleteReport(id);
    setSavedReports(updated);
    if (report && report.id === id) {
      setIsSaved(false);
    }
    showToast('Report deleted.');
  };

  // Select a saved report
  const handleSelectReport = (rep) => {
    setReport(rep);
    setIsSaved(true);
    showToast(`Loaded: "${rep.title?.slice(0, 30)}..."`);
  };

  // Update Settings
  const handleSaveSettings = (newSettings) => {
    const saved = saveSettings(newSettings);
    setSettings(saved);
    if (recorderRef.current && saved.language) {
      recorderRef.current.setLanguage(saved.language);
    }
    showToast('Settings saved successfully!');
  };

  const handleChangeLanguage = (newLang) => {
    const updated = { ...settings, language: newLang };
    handleSaveSettings(updated);
  };

  return (
    <div className="voiceqa-app">
      {/* Top Header */}
      <Header
        savedCount={savedReports.length}
        onOpenSaved={() => setIsSavedDrawerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        currentLanguage={settings.language || 'en-IN'}
        onChangeLanguage={handleChangeLanguage}
      />

      {/* Main Dual-Column Workbench */}
      <main className="workbench-container">
        {/* Left Column: Voice Input & Dictation Deck */}
        <section className="workbench-column column-left">
          <DictationPanel
            transcript={transcript}
            onTranscriptChange={(val) => {
              setTranscript(val);
              setIsSaved(false);
            }}
            isListening={isListening}
            onToggleListening={handleToggleListening}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            speechSupported={speechSupported}
          />
        </section>

        {/* Right Column: Interactive Bug Report & Test Case Studio */}
        <section className="workbench-column column-right">
          <ReportStudio
            report={report}
            onUpdateReport={(updated) => {
              setReport(updated);
              setIsSaved(false);
            }}
            onSaveReport={handleSaveReport}
            isSaved={isSaved}
          />
        </section>
      </main>

      {/* Slide-out Drawer for Saved Reports */}
      <SavedReportsDrawer
        isOpen={isSavedDrawerOpen}
        onClose={() => setIsSavedDrawerOpen(false)}
        reports={savedReports}
        onSelectReport={handleSelectReport}
        onDeleteReport={handleDeleteReport}
        currentReportId={report?.id}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
