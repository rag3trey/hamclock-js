import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook for WebSocket connections with auto-reconnect and subscription management
 * 
 * Usage:
 *   const { sendMessage, isConnected } = useWebSocket({
 *     onMessage: (data) => console.log('Received:', data),
 *     channels: ['dx_spots', 'satellites']
 *   });
 */
export const useWebSocket = ({ onMessage, channels = [], reconnectInterval = 3000, maxReconnectAttempts = 5 } = {}) => {
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  
  const [isConnected, setIsConnected] = useState(false);
  const [subscriptions, setSubscriptions] = useState(new Set(channels));

  // Construct WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // This will use the dev server host with proxy
    return `${protocol}//${host}/ws`;
  }, []);

  // Send a message to the server
  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
    }
  }, []);

  // Subscribe to a channel
  const subscribe = useCallback((channel) => {
    if (!subscriptions.has(channel)) {
      sendMessage({
        action: 'subscribe',
        channel: channel
      });
      setSubscriptions(prev => new Set([...prev, channel]));
    }
  }, [subscriptions, sendMessage]);

  // Unsubscribe from a channel
  const unsubscribe = useCallback((channel) => {
    if (subscriptions.has(channel)) {
      sendMessage({
        action: 'unsubscribe',
        channel: channel
      });
      setSubscriptions(prev => {
        const newSet = new Set(prev);
        newSet.delete(channel);
        return newSet;
      });
    }
  }, [subscriptions, sendMessage]);

  // Handle incoming messages
  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'subscribed') {
        console.log(`✅ Subscribed to ${data.channel}`);
      } else if (data.type === 'unsubscribed') {
        console.log(`🔇 Unsubscribed from ${data.channel}`);
      } else if (data.type === 'pong') {
        // Ignore pong responses
      } else if (onMessage) {
        onMessage(data);
      }
    } catch (err) {
      console.error('Error parsing WebSocket message:', err);
    }
  }, [onMessage]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      const url = getWebSocketUrl();
      console.log(`🔌 Connecting to WebSocket: ${url}`);
      
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        
        // Subscribe to initial channels
        channels.forEach(channel => {
          sendMessage({
            action: 'subscribe',
            channel: channel
          });
        });
        
        // Send periodic ping to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            sendMessage({ action: 'ping' });
          }
        }, 30000); // Ping every 30 seconds
        
        ws.pingInterval = pingInterval;
      };
      
      ws.onmessage = handleMessage;
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setIsConnected(false);
      };
      
      ws.onclose = () => {
        console.log('❌ WebSocket disconnected');
        setIsConnected(false);
        
        // Clear ping interval
        if (ws.pingInterval) {
          clearInterval(ws.pingInterval);
        }
        
        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          console.log(`🔄 Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          console.error('❌ Max reconnection attempts reached');
        }
      };
      
      wsRef.current = ws;
    } catch (err) {
      console.error('Error connecting to WebSocket:', err);
      setIsConnected(false);
    }
  }, [channels, getWebSocketUrl, sendMessage, handleMessage, reconnectInterval, maxReconnectAttempts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Connect on mount or when channels change
  useEffect(() => {
    connect();
  }, []); // Only on mount

  return {
    isConnected,
    sendMessage,
    subscribe,
    unsubscribe,
    subscriptions: Array.from(subscriptions),
    ws: wsRef.current
  };
};

export default useWebSocket;
