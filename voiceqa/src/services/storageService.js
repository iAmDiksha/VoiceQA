// Local storage service for Voice QA reports and user preferences
// Note: API keys are NEVER stored here to ensure strict security.

const STORAGE_KEYS = {
  REPORTS: 'voiceqa_saved_reports_v1',
  SETTINGS: 'voiceqa_settings_v1',
};

export const defaultSettings = {
  model: 'gemini-1.5-flash', // 'gemini-1.5-flash' | 'gemini-2.0-flash' | 'gemini-1.5-pro'
  language: 'en-IN', // 'en-IN' | 'en-US' | 'hi-IN'
  autoGenerateOnStop: false,
};

export function getSavedReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REPORTS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to read saved reports from localStorage:', err);
    return [];
  }
}

export function saveReport(report) {
  try {
    const reports = getSavedReports();
    const existingIndex = reports.findIndex((r) => r.id === report.id);
    let updated;
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      updated = [...reports];
      updated[existingIndex] = { ...report, updatedAt: now };
    } else {
      const newReport = {
        ...report,
        id: report.id || `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: report.createdAt || now,
        updatedAt: now,
      };
      updated = [newReport, ...reports];
    }

    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save report to localStorage:', err);
    throw err;
  }
}

export function deleteReport(id) {
  try {
    const reports = getSavedReports();
    const updated = reports.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to delete report:', err);
    return [];
  }
}

export function getSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw);
    // Explicitly delete any legacy client-side apiKey to preserve security
    if ('apiKey' in parsed) {
      delete parsed.apiKey;
    }
    return { ...defaultSettings, ...parsed };
  } catch (err) {
    console.error('Failed to read settings:', err);
    return defaultSettings;
  }
}

export function saveSettings(settings) {
  try {
    const sanitized = { ...defaultSettings, ...settings };
    if ('apiKey' in sanitized) {
      delete sanitized.apiKey;
    }
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(sanitized));
    return sanitized;
  } catch (err) {
    console.error('Failed to save settings:', err);
    return defaultSettings;
  }
}
