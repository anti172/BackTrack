import { useEffect, useRef, useCallback, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { hubUrl, NGROK_HEADERS } from '../config';

type Handler = (...args: unknown[]) => void;

export function useSignalR(onReconnect?: () => void) {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const handlersRef = useRef<Map<string, Set<Handler>>>(new Map());
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerHandlers = useCallback((connection: signalR.HubConnection) => {
    handlersRef.current.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        connection.off(event, handler);
        connection.on(event, handler);
      });
    });
  }, []);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl(), {
        headers: NGROK_HEADERS as Record<string, string>,
        skipNegotiation: false,
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.ServerSentEvents |
          signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    connection.onreconnected(async () => {
      try {
        await connection.invoke('JoinSession');
      } catch {
        /* OnConnectedAsync already adds to group */
      }
      registerHandlers(connection);
      onReconnectRef.current?.();
    });

    connection.onclose(() => setConnected(false));

    connection
      .start()
      .then(async () => {
        try {
          await connection.invoke('JoinSession');
        } catch {
          /* hub OnConnectedAsync handles group */
        }
        registerHandlers(connection);
        setConnected(true);
        setError(null);
      })
      .catch((err) => {
        console.error('SignalR connection failed:', err);
        setConnected(false);
        setError(err instanceof Error ? err.message : 'SignalR hiba');
      });

    return () => {
      connection.stop();
      connectionRef.current = null;
      setConnected(false);
    };
  }, [registerHandlers]);

  const on = useCallback(
    (event: string, handler: Handler) => {
      if (!handlersRef.current.has(event)) {
        handlersRef.current.set(event, new Set());
      }
      handlersRef.current.get(event)!.add(handler);

      const connection = connectionRef.current;
      if (connection?.state === signalR.HubConnectionState.Connected) {
        connection.on(event, handler);
      }

      return () => {
        handlersRef.current.get(event)?.delete(handler);
        connectionRef.current?.off(event, handler);
      };
    },
    [],
  );

  return { on, connected, error };
}
