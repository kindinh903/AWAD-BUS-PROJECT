import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  /**
   * Polling interval in milliseconds
   * @default 5000
   */
  interval?: number;
  /**
   * Whether to start polling immediately
   * @default true
   */
  enabled?: boolean;
  /**
   * Whether to run the callback immediately on mount
   * @default false
   */
  runImmediately?: boolean;
  /**
   * Callback to execute on each poll
   */
  onPoll: () => void | Promise<void>;
}

/**
 * Hook to poll a function at regular intervals
 * Automatically cleans up on unmount
 */
export function usePolling({
  interval = 5000,
  enabled = true,
  runImmediately = false,
  onPoll,
}: UsePollingOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onPollRef = useRef(onPoll);

  // Keep onPoll reference up to date
  useEffect(() => {
    onPollRef.current = onPoll;
  }, [onPoll]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return; // Already polling

    intervalRef.current = setInterval(async () => {
      try {
        await onPollRef.current();
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, interval);
  }, [interval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopPolling();
      return;
    }

    // Run immediately if requested
    if (runImmediately) {
      onPollRef.current();
    }

    // Start polling
    startPolling();

    // Cleanup on unmount or when dependencies change
    return () => {
      stopPolling();
    };
  }, [enabled, runImmediately, startPolling, stopPolling]);

  return { startPolling, stopPolling };
}
