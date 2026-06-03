import { useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { hubUrl, NGROK_HEADERS } from '../config';

export function useSignalR(onReconnect?: () => void) {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl(), {
        headers: NGROK_HEADERS as Record<string, string>,
      })
      .withAutomaticReconnect()
      .build();

    connectionRef.current = connection;

    connection.onreconnected(() => {
      connection.invoke('JoinSession');
      onReconnectRef.current?.();
    });

    connection
      .start()
      .then(() => connection.invoke('JoinSession'))
      .catch(console.error);

    return () => {
      connection.stop();
      connectionRef.current = null;
    };
  }, []);

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    const connection = connectionRef.current;
    if (!connection) return () => {};

    connection.on(event, handler);
    return () => connection.off(event, handler);
  }, []);

  return { on };
}
