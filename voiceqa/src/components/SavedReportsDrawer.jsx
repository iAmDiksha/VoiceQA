import React from 'react';
import { X, Trash2, ArrowUpRight, Clock, Bug } from 'lucide-react';

export default function SavedReportsDrawer({
  isOpen,
  onClose,
  reports,
  onSelectReport,
  onDeleteReport,
  currentReportId,
}) {
  if (!isOpen) return null;

  const formatDate = (isoString) => {
    if (!isoString) return 'Recent';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer-container" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title-row">
            <h3 className="drawer-title">Saved Reports</h3>
            <span className="badge-count">{reports.length}</span>
          </div>
          <button
            type="button"
            className="btn-icon-close"
            onClick={onClose}
            aria-label="Close saved reports"
          >
            <X size={18} />
          </button>
        </div>

        <div className="drawer-content">
          {reports.length === 0 ? (
            <div className="drawer-empty">
              <Bug size={32} className="text-dim" />
              <p>No saved reports yet.</p>
              <span className="text-dim text-sm">
                Generate and click "Save" to keep a local archive of your bug reports.
              </span>
            </div>
          ) : (
            <div className="drawer-list">
              {reports.map((rep) => {
                const isSelected = currentReportId === rep.id;
                return (
                  <div
                    key={rep.id}
                    className={`saved-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      onSelectReport(rep);
                      onClose();
                    }}
                  >
                    <div className="saved-card-header">
                      <span
                        className={`badge-severity-sm severity-${(rep.severity || 'medium').toLowerCase()}`}
                      >
                        {rep.severity || 'Medium'}
                      </span>
                      <span className="saved-time">
                        <Clock size={11} />
                        {formatDate(rep.createdAt || rep.updatedAt)}
                      </span>
                    </div>

                    <h4 className="saved-card-title">{rep.title || 'Untitled Bug Report'}</h4>

                    <div className="saved-card-meta">
                      <span className="meta-tag">{rep.component || 'General'}</span>
                      <span className="meta-tag">
                        {(rep.stepsToReproduce || []).length} steps
                      </span>
                    </div>

                    <div className="saved-card-actions">
                      <button
                        type="button"
                        className="btn-card-load"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectReport(rep);
                          onClose();
                        }}
                      >
                        <span>Open</span>
                        <ArrowUpRight size={13} />
                      </button>

                      <button
                        type="button"
                        className="btn-card-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteReport(rep.id);
                        }}
                        title="Delete report"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
