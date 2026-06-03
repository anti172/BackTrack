import { useEffect, useRef } from 'react';
import { useSignalR } from './useSignalR';

/** SignalR + periodikus poll — órán megbízhatóbb ngrok mellett is */
export function useLiveSession(
  refresh: () => void | Promise<void>,
  pollIntervalMs = 2500,
) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const signalR = useSignalR(() => {
    void refreshRef.current();
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshRef.current();
    }, pollIntervalMs);
    return () => window.clearInterval(id);
  }, [pollIntervalMs]);

  return signalR;
}
