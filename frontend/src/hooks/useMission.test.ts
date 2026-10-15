import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { Mission, MissionStatus } from '../types/mission';

type Handler = (...args: unknown[]) => void;

class FakeEmitter {
  handlers = new Map<string, Handler[]>();
  on(event: string, handler: Handler) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
    return this;
  }
  fire(event: string, ...args: unknown[]) {
    for (const handler of this.handlers.get(event) ?? []) {
      handler(...args);
    }
  }
}

class FakeSocket extends FakeEmitter {
  connected = false;
  io = new FakeEmitter();
  emit = vi.fn();
  disconnect = vi.fn();
}

const sockets = vi.hoisted(() => [] as unknown[]);

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => {
    const socket = new FakeSocket();
    sockets.push(socket);
    return socket;
  }),
}));

vi.mock('../services/api', () => ({
  api: {
    getMissionStream: vi.fn(),
  },
}));

import { useMission, ConnectionStatus } from './useMission';
import { api } from '../services/api';

const missionWithStatus = (status: MissionStatus): Mission => ({
  id: 'mission-1',
  prompt: 'Check dashboard',
  status,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  steps: [],
});

const lastSocket = () => sockets[sockets.length - 1] as FakeSocket;
const getMissionStream = vi.mocked(api.getMissionStream);

describe('useMission', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sockets.length = 0;
    getMissionStream.mockReset();
    getMissionStream.mockResolvedValue({ mission: missionWithStatus(MissionStatus.RUNNING) });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('polls when no auth token is stored', async () => {
    const { result } = renderHook(() => useMission('mission-1'));
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(result.current.isUsingPolling).toBe(true);
    expect(getMissionStream).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(getMissionStream).toHaveBeenCalledTimes(2);
  });

  it('falls back to polling after a WebSocket connection error', async () => {
    localStorage.setItem('authToken', 'token');
    const { result } = renderHook(() => useMission('mission-1'));
    expect(getMissionStream).not.toHaveBeenCalled();

    act(() => lastSocket().fire('connect_error', new Error('refused')));
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(result.current.isUsingPolling).toBe(true);
    expect(result.current.connectionStatus).toBe(ConnectionStatus.ERROR);
    expect(getMissionStream).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(4000));
    expect(getMissionStream).toHaveBeenCalledTimes(3);
  });

  it('listens for reconnection events on the Socket.IO manager', async () => {
    localStorage.setItem('authToken', 'token');
    const { result } = renderHook(() => useMission('mission-1'));

    act(() => lastSocket().io.fire('reconnect_attempt'));
    expect(result.current.connectionStatus).toBe(ConnectionStatus.RECONNECTING);

    act(() => lastSocket().io.fire('reconnect_failed'));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current.isUsingPolling).toBe(true);
    expect(getMissionStream).toHaveBeenCalled();
  });

  it('stops polling once the mission has completed', async () => {
    getMissionStream.mockResolvedValue({ mission: missionWithStatus(MissionStatus.COMPLETED) });
    const { result } = renderHook(() => useMission('mission-1'));
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(result.current.mission?.status).toBe(MissionStatus.COMPLETED);
    const calls = getMissionStream.mock.calls.length;

    await act(() => vi.advanceTimersByTimeAsync(6000));
    expect(getMissionStream).toHaveBeenCalledTimes(calls);
  });
});
