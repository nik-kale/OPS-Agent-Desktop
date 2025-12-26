import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Mission, MissionStatus } from '../types/mission';
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

  const socketRef = useRef<Socket | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const usePollingFallback = useRef(false);

  const fetchMissionStream = useCallback(async () => {
    if (!missionId) return;

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
    if (!missionId) return;

    // Get auth token from localStorage
    const token = localStorage.getItem('authToken');

    if (!token) {
      console.warn('No auth token found, using polling fallback');
      usePollingFallback.current = true;
      return;
    }

    // Initialize Socket.IO connection
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
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
      console.log('WebSocket connected:', socket.id);
      setConnectionStatus(ConnectionStatus.CONNECTED);
      usePollingFallback.current = false;

      // Subscribe to mission updates
      socket.emit('mission:subscribe', missionId);

      // Fetch initial state
      fetchMissionStream();
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setConnectionStatus(ConnectionStatus.DISCONNECTED);

      // If server initiated disconnect, fall back to polling
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        usePollingFallback.current = true;
      }
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err.message);
      setConnectionStatus(ConnectionStatus.ERROR);
      setError('WebSocket connection failed, falling back to polling');

      // Fall back to polling after connection errors
      usePollingFallback.current = true;
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      setConnectionStatus(ConnectionStatus.CONNECTED);
      setError(null);
      usePollingFallback.current = false;

      // Resubscribe to mission
      socket.emit('mission:subscribe', missionId);
    });

    socket.on('reconnect_attempt', () => {
      setConnectionStatus(ConnectionStatus.RECONNECTING);
    });

    socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed, using polling fallback');
      setConnectionStatus(ConnectionStatus.ERROR);
      usePollingFallback.current = true;
    });

    // Mission event handlers
    socket.on('mission:update', (data) => {
      console.log('Received mission update:', data);
      setMission(data);
    });

    socket.on('mission:step', (step) => {
      console.log('Received mission step:', step);
      setMission((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          steps: [...prev.steps, step],
          updatedAt: new Date(),
        };
      });

      // Update screenshot if step has one
      if (step.screenshotPath) {
        setLatestScreenshot(`/screenshots/${step.screenshotPath}`);
      }
    });

    socket.on('mission:status', ({ status }) => {
      console.log('Received mission status:', status);
      setMission((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status,
          updatedAt: new Date(),
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

  // Polling fallback when WebSocket is unavailable
  useEffect(() => {
    if (!missionId) return;

    // Start polling if fallback is enabled and no active interval
    if (usePollingFallback.current && !pollingIntervalRef.current) {
      console.log('Using polling fallback mode');

      // Initial fetch
      setIsLoading(true);
      fetchMissionStream().finally(() => setIsLoading(false));

      // Poll every 2 seconds
      pollingIntervalRef.current = setInterval(() => {
        fetchMissionStream();
      }, 2000);
    }

    // Stop polling if WebSocket is connected
    if (!usePollingFallback.current && pollingIntervalRef.current) {
      console.log('WebSocket connected, stopping polling');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [missionId, fetchMissionStream]);

  // Stop polling when mission is completed or failed
  useEffect(() => {
    if (
      mission?.status === MissionStatus.COMPLETED ||
      mission?.status === MissionStatus.FAILED
    ) {
      // Unsubscribe from WebSocket
      if (socketRef.current?.connected) {
        socketRef.current.emit('mission:unsubscribe', missionId || '');
      }

      // Stop polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [mission?.status, missionId]);

  return {
    mission,
    latestScreenshot,
    error,
    isLoading,
    connectionStatus,
    isConnected: connectionStatus === ConnectionStatus.CONNECTED,
    isUsingPolling: usePollingFallback.current,
    refetch: fetchMissionStream,
  };
}
