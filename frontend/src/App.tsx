import { useState, useCallback } from 'react';
import { CommandConsole } from './components/CommandConsole';
import { LiveView } from './components/LiveView';
import { useMission } from './hooks/useMission';
import { api } from './services/api';
import './App.css';

function App() {
  const [currentMissionId, setCurrentMissionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { mission, latestScreenshot, error } = useMission(currentMissionId);

  const handleSubmitMission = useCallback(async (prompt: string) => {
    setIsSubmitting(true);
    try {
      const response = await api.createMission(prompt);
      setCurrentMissionId(response.missionId);
    } catch (err) {
      console.error('Failed to create mission:', err);
      alert('Failed to create mission. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🚀 Ops-Agent-Desktop</h1>
          <p className="subtitle">
            Visual Mission Control for AI-Powered SRE & Support Agents
          </p>
        </div>
      </header>

      <main className="app-main">
        <div className="panel-container">
          <div className="panel left-panel">
            <CommandConsole
              mission={mission}
              onSubmitMission={handleSubmitMission}
              isSubmitting={isSubmitting}
            />
          </div>

          <div className="panel right-panel">
            <LiveView mission={mission} latestScreenshot={latestScreenshot} />
          </div>
        </div>
      </main>

      {error && (
        <div className="error-toast">
          <span>⚠️ {error}</span>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      <footer className="app-footer">
        <span>
          Part of the Autonomous Operations ecosystem:{' '}
          <a
            href="https://github.com/nik-kale/AutoRCA-Core"
            target="_blank"
            rel="noopener noreferrer"
          >
            AutoRCA-Core
          </a>
          {' • '}
          <a
            href="https://github.com/nik-kale/Secure-MCP-Gateway"
            target="_blank"
            rel="noopener noreferrer"
          >
            Secure-MCP-Gateway
          </a>
          {' • '}
          <a
            href="https://github.com/nik-kale/awesome-autonomous-ops"
            target="_blank"
            rel="noopener noreferrer"
          >
            awesome-autonomous-ops
          </a>
        </span>
      </footer>
    </div>
  );
}

export default App;
