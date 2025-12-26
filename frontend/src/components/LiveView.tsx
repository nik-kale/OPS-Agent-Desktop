import { memo } from 'react';
import { Mission } from '../types/mission';
import './LiveView.css';

interface LiveViewProps {
  mission: Mission | null;
  latestScreenshot: string | null;
}

export const LiveView = memo(function LiveView({ mission, latestScreenshot }: LiveViewProps) {
  return (
    <div className="live-view">
      <div className="live-view-header">
        <h2>📺 Live Agent View</h2>
      </div>

      <div className="screenshot-container">
        {latestScreenshot ? (
          <img
            src={latestScreenshot}
            alt="Agent browser view"
            className="screenshot"
          />
        ) : (
          <div className="screenshot-placeholder">
            <div className="placeholder-icon">🖥️</div>
            <div className="placeholder-text">
              Browser view will appear here when mission starts
            </div>
          </div>
        )}
      </div>

      {mission && (
        <div className="analysis-panel">
          <h3>🔍 Analysis & Remediation</h3>

          {mission.rcaSummary && (
            <div className="analysis-section">
              <h4>Root Cause Analysis</h4>
              <div className="analysis-content">
                <pre>{mission.rcaSummary}</pre>
              </div>
            </div>
          )}

          {mission.remediationProposal && (
            <div className="analysis-section">
              <h4>Remediation Proposal</h4>
              <div className="analysis-content">
                <pre>{mission.remediationProposal}</pre>
              </div>
            </div>
          )}

          {!mission.rcaSummary && !mission.remediationProposal && (
            <div className="analysis-placeholder">
              Analysis results will appear here as the mission progresses...
            </div>
          )}

          <div className="integration-notes">
            <h4>🔌 Integrations</h4>
            <div className="integration-item">
              <span className="integration-icon">🤖</span>
              <div>
                <strong>AutoRCA-Core</strong>
                <p>Graph-based root cause analysis engine</p>
              </div>
            </div>
            <div className="integration-item">
              <span className="integration-icon">🛡️</span>
              <div>
                <strong>Secure-MCP-Gateway</strong>
                <p>Policy-based action approval and execution</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
