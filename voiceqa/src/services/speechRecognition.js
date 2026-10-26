// Web Speech API wrapper for Voice QA

export class VoiceRecorder {
  constructor({ onResult, onError, onStatusChange }) {
    this.onResult = onResult || (() => {});
    this.onError = onError || (() => {});
    this.onStatusChange = onStatusChange || (() => {});
    this.recognition = null;
    this.isListening = false;
    this.language = 'en-IN'; // Default Indian English (excels at Hinglish)
    this.manualStop = false;

    this.init();
  }

  static isSupported() {
    return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }

  init() {
    if (!VoiceRecorder.isSupported()) {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = this.language;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.manualStop = false;
      this.onStatusChange(true);
    };

    this.recognition.onend = () => {
      // If stopped naturally but user didn't hit stop, restart if active
      if (this.isListening && !this.manualStop) {
        try {
          this.recognition.start();
          return;
        } catch {
          // Ignore start during active transition
        }
      }
      this.isListening = false;
      this.onStatusChange(false);
    };

    this.recognition.onerror = (event) => {
      // 'no-speech' is harmless, user was silent
      if (event.error === 'no-speech') {
        return;
      }
      console.warn('Speech recognition event error:', event.error);
      this.onError(event.error);
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      this.onResult({
        finalText: finalTranscript,
        interimText: interimTranscript,
      });
    };
  }

  setLanguage(langCode) {
    this.language = langCode;
    if (this.recognition) {
      this.recognition.lang = langCode;
      if (this.isListening) {
        // Restart with new language
        this.stop();
        setTimeout(() => this.start(), 200);
      }
    }
  }

  start() {
    if (!this.recognition) {
      this.onError('unsupported');
      return;
    }

    if (this.isListening) return;

    try {
      this.manualStop = false;
      this.recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      this.onError(err.message || 'permission_denied');
    }
  }

  stop() {
    if (!this.recognition) return;
    this.manualStop = true;
    this.isListening = false;
    try {
      this.recognition.stop();
    } catch {
      // Ignore stop errors
    }
    this.onStatusChange(false);
  }

  toggle() {
    if (this.isListening) {
      this.stop();
    } else {
      this.start();
    }
  }
}
