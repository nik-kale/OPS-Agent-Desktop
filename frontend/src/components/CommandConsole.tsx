import { useState, useCallback, useMemo, memo } from 'react';
import { Mission, MissionStepType, MissionStatus } from '../types/mission';
import { ConnectionStatus } from './ConnectionStatus';
import { ConnectionStatus as Status } from '../hooks/useMission';
import './CommandConsole.css';

interface CommandConsoleProps {
  mission: Mission | null;
  onSubmitMission: (prompt: string) => void;
  isSubmitting: boolean;
  connectionStatus?: Status;
  isUsingPolling?: boolean;
}

export const CommandConsole = memo(function CommandConsole({
  mission,
  onSubmitMission,
  isSubmitting,
  connectionStatus = Status.DISCONNECTED,
  isUsingPolling = false,
}: CommandConsoleProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (prompt.trim() && !isSubmitting) {
        onSubmitMission(prompt.trim());
        setPrompt('');
      }
    },
    [prompt, isSubmitting, onSubmitMission]
  );

  const getStepIcon = useCallback((type: MissionStepType): string => {
    switch (type) {
      case MissionStepType.OBSERVATION:
        return '👁️';
      case MissionStepType.ACTION:
        return '⚡';
      case MissionStepType.RCA:
        return '🔍';
      case MissionStepType.REMEDIATION:
        return '🔧';
      default:
        return '•';
    }
  }, []);

  const getStatusBadge = useCallback((status: MissionStatus) => {
    const badges = {
      [MissionStatus.PENDING]: { label: 'PENDING', className: 'pending' },
      [MissionStatus.RUNNING]: { label: 'RUNNING', className: 'running' },
      [MissionStatus.COMPLETED]: { label: 'COMPLETED', className: 'completed' },
      [MissionStatus.FAILED]: { label: 'FAILED', className: 'failed' },
      [MissionStatus.AWAITING_APPROVAL]: {
        label: 'AWAITING APPROVAL',
        className: 'awaiting',
      },
    };

    const badge = badges[status] || { label: status, className: '' };

    return <span className={`status-badge ${badge.className}`}>{badge.label}</span>;
  }, []);

  const formatTimestamp = useCallback((timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }, []);

  // Memoize sorted/processed steps to avoid recalculation on every render
  const sortedSteps = useMemo(() => {
    if (!mission || !mission.steps) return [];
    return [...mission.steps].sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return aTime - bTime;
    });
  }, [mission?.steps]);

  return (
    <div className="command-console">
      <div className="console-header">
        <h2>🎯 Command Console</h2>
        <div className="console-header-right">
          <ConnectionStatus status={connectionStatus} isUsingPolling={isUsingPolling} />
          {mission && getStatusBadge(mission.status)}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mission-form">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter mission prompt (e.g., 'Diagnose 500 errors on checkout service')"
          rows={3}
          disabled={isSubmitting}
          className="mission-input"
        />
        <button
          type="submit"
          disabled={isSubmitting || !prompt.trim()}
          className="run-mission-button"
        >
          {isSubmitting ? '🚀 Running Mission...' : '▶️ Run Mission'}
        </button>
      </form>

      {mission && (
        <div className="mission-info">
          <div className="mission-prompt">
            <strong>Mission:</strong> {mission.prompt}
          </div>
          <div className="mission-meta">
            <span>ID: {mission.id.slice(0, 8)}</span>
            <span>Started: {formatTimestamp(mission.createdAt)}</span>
          </div>
        </div>
      )}

      <div className="timeline-container">
        <h3>Mission Timeline</h3>
        <div className="timeline">
          {sortedSteps.length > 0 ? (
            sortedSteps.map((step) => (
              <div key={step.id} className={`timeline-step ${step.type.toLowerCase()}`}>
                <div className="step-icon">{getStepIcon(step.type)}</div>
                <div className="step-content">
                  <div className="step-header">
                    <span className={`step-type ${step.type.toLowerCase()}`}>
                      {step.type}
                    </span>
                    <span className="step-timestamp">
                      {formatTimestamp(step.timestamp)}
                    </span>
                  </div>
                  <div className="step-message">{step.message}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="timeline-empty">
              No active mission. Enter a prompt above to begin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
