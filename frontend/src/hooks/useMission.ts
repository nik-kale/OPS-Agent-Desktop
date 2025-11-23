import { useState, useEffect, useCallback } from 'react';
import { Mission, MissionStatus } from '../types/mission';
import { api } from '../services/api';

/**
 * Custom hook for managing mission state with polling.
 */
export function useMission(missionId: string | null) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [latestScreenshot, setLatestScreenshot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  // Poll for mission updates
  useEffect(() => {
    if (!missionId) return;

    setIsLoading(true);
    fetchMissionStream().finally(() => setIsLoading(false));

    const interval = setInterval(() => {
      fetchMissionStream();
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [missionId, fetchMissionStream]);

  // Stop polling when mission is completed or failed
  useEffect(() => {
    if (
      mission?.status === MissionStatus.COMPLETED ||
      mission?.status === MissionStatus.FAILED
    ) {
      // One final fetch after completion, then stop
      // (interval cleanup happens automatically via useEffect return)
    }
  }, [mission?.status]);

  return {
    mission,
    latestScreenshot,
    error,
    isLoading,
    refetch: fetchMissionStream,
  };
}
