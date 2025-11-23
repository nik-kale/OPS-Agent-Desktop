import { useState } from 'react';
import './App.css';

type Page = 'dashboard' | 'logs';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [serviceRestarted, setServiceRestarted] = useState(false);

  const handleRestartService = () => {
    setServiceRestarted(true);
    setTimeout(() => setServiceRestarted(false), 3000);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🔧 Ops Dashboard</h1>
        <nav className="nav">
          <button
            className={currentPage === 'dashboard' ? 'active' : ''}
            onClick={() => setCurrentPage('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={currentPage === 'logs' ? 'active' : ''}
            onClick={() => setCurrentPage('logs')}
          >
            Logs
          </button>
        </nav>
      </header>

      <main className="main">
        {currentPage === 'dashboard' && (
          <DashboardPage
            serviceRestarted={serviceRestarted}
            onRestartService={handleRestartService}
          />
        )}
        {currentPage === 'logs' && <LogsPage />}
      </main>
    </div>
  );
}

interface DashboardPageProps {
  serviceRestarted: boolean;
  onRestartService: () => void;
}

function DashboardPage({ serviceRestarted, onRestartService }: DashboardPageProps) {
  return (
    <div className="dashboard">
      <h2>Service Health Overview</h2>

      <div className="metrics-grid">
        <MetricCard
          title="API Gateway"
          status="healthy"
          value="99.9%"
          label="Uptime"
        />
        <MetricCard
          title="Auth Service"
          status="healthy"
          value="142ms"
          label="Avg Response Time"
        />
        <MetricCard
          title="Checkout Service"
          status="critical"
          value="500 errors"
          label="15 errors/min"
        />
        <MetricCard
          title="Database Primary"
          status="warning"
          value="100/100"
          label="Connections Used"
        />
      </div>

      <div className="alert-section">
        <h3>🚨 Active Alerts</h3>
        <div className="alert critical">
          <div className="alert-header">
            <span className="alert-badge critical">CRITICAL</span>
            <span className="alert-time">14:28 UTC</span>
          </div>
          <div className="alert-title">High Error Rate on Checkout Service</div>
          <div className="alert-details">
            500 Internal Server Error - 15 errors/min detected. Users unable to
            complete purchases.
          </div>
        </div>
        <div className="alert warning">
          <div className="alert-header">
            <span className="alert-badge warning">WARNING</span>
            <span className="alert-time">14:25 UTC</span>
          </div>
          <div className="alert-title">Database Connection Pool Exhaustion</div>
          <div className="alert-details">
            checkout-db-primary: 100/100 connections in use. May impact service
            availability.
          </div>
        </div>
      </div>

      <div className="actions-section">
        <h3>Quick Actions</h3>
        <button
          className="action-button restart"
          onClick={onRestartService}
          disabled={serviceRestarted}
        >
          {serviceRestarted ? '✅ Service Restarted' : '🔄 Restart Service'}
        </button>
        <button className="action-button scale">⚡ Scale Up Replicas</button>
        <button className="action-button rollback">⏪ Rollback Deployment</button>
      </div>
    </div>
  );
}

function LogsPage() {
  const logs = [
    {
      timestamp: '2024-01-15 14:28:43',
      level: 'ERROR',
      service: 'checkout-service',
      message:
        'ConnectionPoolTimeoutException: Timeout waiting for connection from pool',
    },
    {
      timestamp: '2024-01-15 14:28:42',
      level: 'ERROR',
      service: 'checkout-service',
      message: 'Failed to execute SELECT query on orders table: Connection timeout',
    },
    {
      timestamp: '2024-01-15 14:28:41',
      level: 'ERROR',
      service: 'checkout-service',
      message: 'HTTP 500 Internal Server Error - POST /api/checkout/complete',
    },
    {
      timestamp: '2024-01-15 14:28:40',
      level: 'WARN',
      service: 'checkout-service',
      message: 'Slow query detected: SELECT * FROM orders WHERE user_id = ? (2.3s)',
    },
    {
      timestamp: '2024-01-15 14:28:35',
      level: 'ERROR',
      service: 'checkout-service',
      message:
        'Database connection pool exhausted: 100/100 connections active',
    },
    {
      timestamp: '2024-01-15 14:28:30',
      level: 'INFO',
      service: 'checkout-service',
      message: 'Processing checkout request for user_id=12345',
    },
    {
      timestamp: '2024-01-15 14:23:15',
      level: 'INFO',
      service: 'deployment',
      message: 'Successfully deployed checkout-service v2.3.1',
    },
    {
      timestamp: '2024-01-15 14:23:10',
      level: 'INFO',
      service: 'deployment',
      message: 'Starting deployment of checkout-service v2.3.1',
    },
  ];

  return (
    <div className="logs">
      <h2>Service Logs - Checkout Service</h2>
      <div className="logs-container">
        {logs.map((log, index) => (
          <div key={index} className={`log-entry ${log.level.toLowerCase()}`}>
            <span className="log-timestamp">{log.timestamp}</span>
            <span className={`log-level ${log.level.toLowerCase()}`}>
              {log.level}
            </span>
            <span className="log-service">[{log.service}]</span>
            <span className="log-message">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  status: 'healthy' | 'warning' | 'critical';
  value: string;
  label: string;
}

function MetricCard({ title, status, value, label }: MetricCardProps) {
  const statusEmoji = {
    healthy: '✅',
    warning: '⚠️',
    critical: '🔴',
  };

  return (
    <div className={`metric-card ${status}`}>
      <div className="metric-header">
        <span className="metric-title">{title}</span>
        <span className="metric-status">{statusEmoji[status]}</span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}

export default App;
