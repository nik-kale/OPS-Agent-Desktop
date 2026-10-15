import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Mission, MissionStatus, MissionStep } from '../types/mission';
import { api } from '../services/api';

/**
 * WebSocket connection states
 */
export enum ConnectionStatus {
  CONNECTED = 'connected',
  CONNECTING = 'connecting',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

interface ServerToClientEvents {
  'mission:update': (mission: Mission) => void;
  'mission:step': (step: MissionStep) => void;
  'mission:status': (payload: { missionId: string; status: MissionStatus }) => void;
}

interface ClientToServerEvents {
  'mission:subscribe': (missionId: string) => void;
  'mission:unsubscribe': (missionId: string) => void;
}

type MissionSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const POLL_INTERVAL_MS = 2000;

const isFinished = (status?: MissionStatus) =>
  status === MissionStatus.COMPLETED || status === MissionStatus.FAILED;

/**
 * Custom hook for managing mission state with WebSocket real-time updates.
 * Falls back to polling if WebSocket connection fails.
 */
export function useMission(missionId: string | null) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [latestScreenshot, setLatestScreenshot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    ConnectionStatus.DISCONNECTED
  );
  // State rather than a ref: switching to polling must re-run the polling effect.
  const [isUsingPolling, setIsUsingPolling] = useState(false);

  const socketRef = useRef<MissionSocket | null>(null);

  const fetchMissionStream = useCallback(async () => {
    if (!missionId) {
      return;
    }

    try {
      const response = await api.getMissionStream(missionId);
      setMission(response.mission);
      if (response.latestScreenshot) {
        setLatestScreenshot(response.latestScreenshot);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [missionId]);

  // Setup WebSocket connection
  useEffect(() => {
    if (!missionId) {
      return;
    }

    // Get auth token from localStorage
    const token = localStorage.getItem('authToken');

    if (!token) {
      console.warn('No auth token found, using polling fallback');
      setIsUsingPolling(true);
      return;
    }

    setIsUsingPolling(false);
    setConnectionStatus(ConnectionStatus.CONNECTING);

    // Initialize Socket.IO connection
    const socket: MissionSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      setConnectionStatus(ConnectionStatus.CONNECTED);
      setError(null);
      setIsUsingPolling(false);

      // Subscribe to mission updates (also re-subscribes after a reconnect)
      socket.emit('mission:subscribe', missionId);

      // Fetch initial state
      void fetchMissionStream();
    });

    socket.on('disconnect', (reason) => {
      setConnectionStatus(ConnectionStatus.DISCONNECTED);

      // If server initiated disconnect, fall back to polling
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        setIsUsingPolling(true);
      }
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err.message);
      setConnectionStatus(ConnectionStatus.ERROR);
      setError('WebSocket connection failed, falling back to polling');

      // Fall back to polling after connection errors
      setIsUsingPolling(true);
    });

    // Reconnection events are emitted by the Manager, not the socket.
    socket.io.on('reconnect_attempt', () => {
      setConnectionStatus(ConnectionStatus.RECONNECTING);
    });

    socket.io.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed, using polling fallback');
      setConnectionStatus(ConnectionStatus.ERROR);
      setIsUsingPolling(true);
    });

    // Mission event handlers
    socket.on('mission:update', (data) => {
      setMission(data);
    });

    socket.on('mission:step', (step) => {
      setMission((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          steps: [...prev.steps, step],
          updatedAt: new Date().toISOString(),
        };
      });

      // Update screenshot if step has one
      if (step.screenshotPath) {
        setLatestScreenshot(`/screenshots/${step.screenshotPath}`);
      }
    });

    socket.on('mission:status', ({ status }) => {
      setMission((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          status,
          updatedAt: new Date().toISOString(),
        };
      });
    });

    // Cleanup on unmount
    return () => {
      if (socket.connected) {
        socket.emit('mission:unsubscribe', missionId);
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [missionId, fetchMissionStream]);

  const missionFinished = isFinished(mission?.status);

  // Polling fallback when WebSocket is unavailable; stops once the mission ends
  useEffect(() => {
    if (!missionId || !isUsingPolling || missionFinished) {
      return;
    }

    setIsLoading(true);
    void fetchMissionStream().finally(() => setIsLoading(false));

    const interval = setInterval(() => {
      void fetchMissionStream();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [missionId, isUsingPolling, missionFinished, fetchMissionStream]);

  // Unsubscribe from WebSocket updates when the mission is completed or failed
  useEffect(() => {
    if (missionFinished && missionId && socketRef.current?.connected) {
      socketRef.current.emit('mission:unsubscribe', missionId);
    }
  }, [missionFinished, missionId]);

  return {
    mission,
    latestScreenshot,
    error,
    isLoading,
    connectionStatus,
    isConnected: connectionStatus === ConnectionStatus.CONNECTED,
    isUsingPolling,
    refetch: fetchMissionStream,
  };
}
