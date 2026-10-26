import React, { useState } from 'react';
import {
  Bug,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Code,
  Copy,
  Check,
  FileText,
} from 'lucide-react';
import ExportToolbar from './ExportToolbar';

const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function ReportStudio({
  report,
  onUpdateReport,
  onSaveReport,
  isSaved,
}) {
  const [activeTab, setActiveTab] = useState('bug'); // 'bug' | 'testcase'
  const [copiedCode, setCopiedCode] = useState(false);

  if (!report) {
    return (
      <div className="panel report-studio-panel empty-studio">
        <div className="empty-state-card">
          <div className="empty-icon-box">
            <Bug size={36} className="text-accent" />
          </div>
          <h3 className="empty-title">QA Workbench Ready</h3>
          <p className="empty-text">
            Speak or enter a bug description on the left. Voice QA will transform it into
            a structured, editable Jira/GitHub bug report and ready-to-use test case.
          </p>
          <div className="empty-checklist">
            <div className="check-item">
              <CheckCircle2 size={16} className="text-success" />
              <span>Converts messy English & Hinglish into QA standards</span>
            </div>
            <div className="check-item">
              <CheckCircle2 size={16} className="text-success" />
              <span>Extracts steps, expected vs actual, and severity</span>
            </div>
            <div className="check-item">
              <CheckCircle2 size={16} className="text-success" />
              <span>Generates automated Playwright test case</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Field change handlers
  const handleFieldChange = (field, value) => {
    onUpdateReport({ ...report, [field]: value });
  };

  const handleStepChange = (index, value) => {
    const updated = [...(report.stepsToReproduce || [])];
    updated[index] = value;
    handleFieldChange('stepsToReproduce', updated);
  };

  const handleAddStep = () => {
    const updated = [...(report.stepsToReproduce || []), ''];
    handleFieldChange('stepsToReproduce', updated);
  };

  const handleRemoveStep = (index) => {
    const updated = (report.stepsToReproduce || []).filter((_, i) => i !== index);
    handleFieldChange('stepsToReproduce', updated);
  };

  const handleTestCaseChange = (field, value) => {
    const updatedTestCase = { ...(report.testCase || {}), [field]: value };
    handleFieldChange('testCase', updatedTestCase);
  };

  const handleCopyAutomationSnippet = () => {
    if (report.testCase?.automationSnippet) {
      navigator.clipboard.writeText(report.testCase.automationSnippet);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="panel report-studio-panel">
      {/* Top action bar with Export and Save */}
      <div className="studio-topbar">
        <div className="tab-pill-group">
          <button
            type="button"
            className={`tab-pill ${activeTab === 'bug' ? 'active' : ''}`}
            onClick={() => setActiveTab('bug')}
          >
            <Bug size={16} />
            <span>Bug Report</span>
          </button>
          <button
            type="button"
            className={`tab-pill ${activeTab === 'testcase' ? 'active' : ''}`}
            onClick={() => setActiveTab('testcase')}
          >
            <FileText size={16} />
            <span>Test Case Suite</span>
          </button>
        </div>

        <ExportToolbar report={report} onSave={onSaveReport} isSaved={isSaved} />
      </div>

      {activeTab === 'bug' ? (
        <div className="studio-content-body">
          {/* Header Info: Title & Severity */}
          <div className="report-header-section">
            <div className="field-group flex-1">
              <label className="field-label">Bug Title</label>
              <input
                type="text"
                className="input-title"
                value={report.title || ''}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder="Enter concise bug title"
              />
            </div>

            <div className="meta-badge-row">
              <div className="field-group">
                <label className="field-label">Severity</label>
                <select
                  className={`select-severity severity-${(report.severity || 'Medium').toLowerCase()}`}
                  value={report.severity || 'Medium'}
                  onChange={(e) => handleFieldChange('severity', e.target.value)}
                >
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label className="field-label">Component</label>
                <input
                  type="text"
                  className="input-component"
                  value={report.component || 'General'}
                  onChange={(e) => handleFieldChange('component', e.target.value)}
                  placeholder="e.g. Checkout, Auth"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="field-group">
            <label className="field-label">Description & Impact</label>
            <textarea
              className="textarea-description"
              value={report.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              rows={3}
              placeholder="Detailed description of defect"
            />
          </div>

          {/* Steps to Reproduce */}
          <div className="field-group">
            <div className="steps-header">
              <label className="field-label">Steps to Reproduce</label>
              <button
                type="button"
                className="btn-text-sm"
                onClick={handleAddStep}
              >
                <Plus size={14} />
                <span>Add Step</span>
              </button>
            </div>

            <div className="steps-list">
              {(report.stepsToReproduce || []).map((step, idx) => (
                <div key={idx} className="step-row">
                  <span className="step-number">{idx + 1}</span>
                  <input
                    type="text"
                    className="step-input"
                    value={step}
                    onChange={(e) => handleStepChange(idx, e.target.value)}
                    placeholder={`Step ${idx + 1}`}
                  />
                  <button
                    type="button"
                    className="btn-step-delete"
                    onClick={() => handleRemoveStep(idx)}
                    title="Remove step"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Expected vs Actual */}
          <div className="results-grid">
            <div className="field-group">
              <label className="field-label field-label-expected">
                <CheckCircle2 size={14} />
                <span>Expected Result</span>
              </label>
              <textarea
                className="textarea-result"
                value={report.expectedResult || ''}
                onChange={(e) => handleFieldChange('expectedResult', e.target.value)}
                rows={3}
                placeholder="What should have happened"
              />
            </div>

            <div className="field-group">
              <label className="field-label field-label-actual">
                <AlertCircle size={14} />
                <span>Actual Result</span>
              </label>
              <textarea
                className="textarea-result"
                value={report.actualResult || ''}
                onChange={(e) => handleFieldChange('actualResult', e.target.value)}
                rows={3}
                placeholder="What actually occurred (errors, crashes)"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Test Case Suite Tab */
        <div className="studio-content-body">
          <div className="report-header-section">
            <div className="field-group flex-1">
              <label className="field-label">Test Case ID & Title</label>
              <div className="tc-title-row">
                <span className="tc-badge">{report.testCase?.id || 'TC-001'}</span>
                <input
                  type="text"
                  className="input-title flex-1"
                  value={report.testCase?.title || ''}
                  onChange={(e) => handleTestCaseChange('title', e.target.value)}
                  placeholder="Test Case Title"
                />
              </div>
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Preconditions</label>
            <input
              type="text"
              className="input-preconditions"
              value={report.testCase?.preconditions || ''}
              onChange={(e) => handleTestCaseChange('preconditions', e.target.value)}
              placeholder="Prerequisites needed before executing test"
            />
          </div>

          <div className="field-group">
            <label className="field-label">Verification Steps</label>
            <div className="tc-steps-box">
              {(report.testCase?.testSteps || report.stepsToReproduce || []).map(
                (step, idx) => (
                  <div key={idx} className="tc-step-item">
                    <span className="tc-bullet">•</span>
                    <span>{step}</span>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Expected Outcome / Assertion</label>
            <input
              type="text"
              className="input-outcome"
              value={report.testCase?.expectedOutcome || report.expectedResult || ''}
              onChange={(e) => handleTestCaseChange('expectedOutcome', e.target.value)}
              placeholder="Assertion criteria"
            />
          </div>

          {/* Automated Playwright / Cypress Snippet */}
          <div className="automation-snippet-wrapper">
            <div className="snippet-header">
              <div className="snippet-title-row">
                <Code size={15} className="text-accent" />
                <span className="snippet-title">Automated Playwright Test Script</span>
              </div>
              <button
                type="button"
                className="btn-copy-code"
                onClick={handleCopyAutomationSnippet}
              >
                {copiedCode ? (
                  <>
                    <Check size={14} className="text-success" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy Script</span>
                  </>
                )}
              </button>
            </div>
            <pre className="code-block">
              <code>{report.testCase?.automationSnippet || '// No script generated'}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
