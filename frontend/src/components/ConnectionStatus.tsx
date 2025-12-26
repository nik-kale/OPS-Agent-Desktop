/**
 * ConnectionStatus Component
 * Displays real-time WebSocket connection status
 */
import { ConnectionStatus as Status } from '../hooks/useMission';
import './ConnectionStatus.css';

interface ConnectionStatusProps {
  status: Status;
  isUsingPolling: boolean;
}

export const ConnectionStatus = ({ status, isUsingPolling }: ConnectionStatusProps) => {
  const getStatusInfo = () => {
    if (isUsingPolling) {
      return {
        className: 'status-polling',
        label: 'Polling',
        description: 'Using HTTP polling (fallback mode)',
      };
    }

    switch (status) {
      case Status.CONNECTED:
        return {
          className: 'status-connected',
          label: 'Connected',
          description: 'Real-time WebSocket connection active',
        };
      case Status.CONNECTING:
        return {
          className: 'status-connecting',
          label: 'Connecting',
          description: 'Establishing WebSocket connection...',
        };
      case Status.RECONNECTING:
        return {
          className: 'status-reconnecting',
          label: 'Reconnecting',
          description: 'Reconnecting to WebSocket server...',
        };
      case Status.DISCONNECTED:
        return {
          className: 'status-disconnected',
          label: 'Disconnected',
          description: 'WebSocket connection closed',
        };
      case Status.ERROR:
        return {
          className: 'status-error',
          label: 'Connection Error',
          description: 'Failed to establish WebSocket connection',
        };
      default:
        return {
          className: 'status-unknown',
          label: 'Unknown',
          description: 'Connection status unknown',
        };
    }
  };

  const { className, label, description } = getStatusInfo();

  return (
    <div className={`connection-status ${className}`} title={description}>
      <div className="status-indicator" />
      <span className="status-label">{label}</span>
    </div>
  );
};

