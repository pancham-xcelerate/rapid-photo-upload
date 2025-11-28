import { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

// Use full URL for WebSocket (SockJS needs full URL, not relative)
// In development, connect directly to backend; in production, use env variable
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws/photo-status';

/**
 * Custom hook for WebSocket connection to receive real-time photo status updates.
 * Automatically reconnects on disconnect.
 */
export function useWebSocket(onMessage) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const stompClientRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const onMessageRef = useRef(onMessage);

  // Keep onMessage ref updated
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    let socket = null;
    let client = null;

    const connect = () => {
      try {
        console.log('🔌 Attempting WebSocket connection to:', WS_URL);
        // Create SockJS connection
        socket = new SockJS(WS_URL);
        client = Stomp.over(socket);

        // Enable debug temporarily to see connection issues
        client.debug = (str) => {
          console.log('STOMP:', str);
        };

        // Connection callback
        client.connect({}, 
          () => {
            // Successfully connected
            setConnected(true);
            setError(null);
            console.log('✅ WebSocket connected successfully to:', WS_URL);

            // Subscribe to all photo status updates
            const subscription = client.subscribe('/topic/photo-status/all', (message) => {
              try {
                const data = JSON.parse(message.body);
                console.log('📨 Received WebSocket message:', data);
                if (onMessageRef.current) {
                  onMessageRef.current(data);
                }
              } catch (err) {
                console.error('Error parsing WebSocket message:', err);
              }
            });
            
            console.log('✅ Subscribed to /topic/photo-status/all');
          },
          (error) => {
            // Connection error
            console.error('❌ WebSocket connection error:', error);
            console.error('Connection URL was:', WS_URL);
            setConnected(false);
            setError(error);
            
            // Attempt reconnect after 3 seconds
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('🔄 Attempting to reconnect WebSocket...');
              connect();
            }, 3000);
          }
        );

        stompClientRef.current = client;
      } catch (err) {
        console.error('Error creating WebSocket connection:', err);
        setError(err);
        setConnected(false);
        
        // Attempt reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      }
    };

    // Initial connection
    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (client && client.connected) {
        client.disconnect();
      }
      if (socket) {
        socket.close();
      }
      setConnected(false);
    };
  }, []); // Only run on mount/unmount

  // Subscribe to specific photo updates
  const subscribeToPhoto = (photoId, callback) => {
    if (!stompClientRef.current || !stompClientRef.current.connected) {
      console.warn('WebSocket not connected');
      return null;
    }

    const subscription = stompClientRef.current.subscribe(
      `/topic/photo-status/${photoId}`,
      (message) => {
        try {
          const data = JSON.parse(message.body);
          callback(data);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      }
    );

    return subscription;
  };

  return {
    connected,
    error,
    subscribeToPhoto,
  };
}

