import React, { useState } from 'react';
import { Copy, Download, Save, Check, FileJson } from 'lucide-react';

export default function ExportToolbar({ report, onSave, isSaved }) {
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const formatMarkdown = () => {
    if (!report) return '';
    const stepsList = (report.stepsToReproduce || [])
      .map((s, idx) => `${idx + 1}. ${s}`)
      .join('\n');

    return `## [BUG] ${report.title || 'Untitled Defect'}

**Severity:** ${report.severity || 'Medium'}  
**Component:** ${report.component || 'General'}  
**Reported Via:** Voice QA (No-Hands Studio)

### Description
${report.description || 'No description provided.'}

### Steps to Reproduce
${stepsList || '1. Observe issue'}

### Expected Result
${report.expectedResult || 'Expected system behavior.'}

### Actual Result
${report.actualResult || 'Observed failure.'}

---

### Test Case: ${report.testCase?.id || 'TC-001'} - ${report.testCase?.title || 'Automated Regression'}
**Preconditions:** ${report.testCase?.preconditions || 'System operational'}  
**Expected Outcome:** ${report.testCase?.expectedOutcome || report.expectedResult}  

\`\`\`typescript
${report.testCase?.automationSnippet || '// Test assertion'}
\`\`\`
`;
  };

  const handleCopyMarkdown = () => {
    const md = formatMarkdown();
    navigator.clipboard.writeText(md);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(report, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md = formatMarkdown();
    const safeTitle = (report.title || 'bug-report')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 35);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="export-toolbar">
      <button
        type="button"
        className={`btn-toolbar-save ${isSaved ? 'saved' : ''}`}
        onClick={onSave}
        title="Save to local history"
      >
        {isSaved ? (
          <>
            <Check size={14} className="text-success" />
            <span>Saved</span>
          </>
        ) : (
          <>
            <Save size={14} />
            <span>Save</span>
          </>
        )}
      </button>

      <button
        type="button"
        className="btn-toolbar"
        onClick={handleCopyMarkdown}
        title="Copy as GitHub / Jira Markdown"
      >
        {copiedMd ? (
          <>
            <Check size={14} className="text-success" />
            <span>Copied MD</span>
          </>
        ) : (
          <>
            <Copy size={14} />
            <span>Copy MD</span>
          </>
        )}
      </button>

      <button
        type="button"
        className="btn-toolbar"
        onClick={handleDownloadMarkdown}
        title="Download .md file"
      >
        <Download size={14} />
        <span>.MD File</span>
      </button>

      <button
        type="button"
        className="btn-toolbar"
        onClick={handleCopyJson}
        title="Copy structured JSON"
      >
        {copiedJson ? (
          <>
            <Check size={14} className="text-success" />
            <span>JSON Copied</span>
          </>
        ) : (
          <>
            <FileJson size={14} />
            <span>JSON</span>
          </>
        )}
      </button>
    </div>
  );
}
