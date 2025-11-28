import { useEffect, useRef, useState } from 'react';
import { photoAPI } from '../services/api';

const POLL_INTERVAL = 2000; // 2 seconds

/**
 * Custom hook for polling photo status updates (fallback if WebSocket fails).
 * Automatically stops polling when all photos are in terminal states.
 */
export function usePhotoStatus(photoIds = [], enabled = true) {
  const [updates, setUpdates] = useState([]);
  const [lastTimestamp, setLastTimestamp] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!enabled || photoIds.length === 0) {
      return;
    }

    setIsPolling(true);

    const poll = async () => {
      try {
        const response = await photoAPI.getPhotoStatusUpdates(
          lastTimestamp,
          photoIds
        );

        if (response.updatedPhotos && response.updatedPhotos.length > 0) {
          setUpdates((prev) => [...prev, ...response.updatedPhotos]);
        }

        // Update timestamp for next poll
        if (response.timestamp) {
          setLastTimestamp(response.timestamp);
        }

        // Check if all photos are in terminal states
        const terminalStates = ['COMPLETED', 'FAILED'];
        const allTerminal = response.updatedPhotos.every((photo) =>
          terminalStates.includes(photo.status)
        );

        if (allTerminal && response.updatedPhotos.length === photoIds.length) {
          // All photos are done, stop polling
          setIsPolling(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        }
      } catch (error) {
        console.error('Error polling photo status:', error);
        // Continue polling even on error
      }
    };

    // Initial poll
    poll();

    // Set up interval
    intervalRef.current = setInterval(poll, POLL_INTERVAL);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setIsPolling(false);
    };
  }, [photoIds, enabled, lastTimestamp]);

  return {
    updates,
    isPolling,
    lastTimestamp,
  };
}

