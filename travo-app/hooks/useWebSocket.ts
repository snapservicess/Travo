import { useEffect, useRef, useState, useCallback } from 'react';
import { webSocketClient, WebSocketCallbacks, LocationUpdate, EmergencyAlert, DashboardData } from '../services/WebSocketClient';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  serverUrl?: string;
  callbacks?: WebSocketCallbacks;
}

interface WebSocketHookReturn {
  isConnected: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  sendLocationUpdate: (location: LocationUpdate) => boolean;
  sendEmergencyAlert: (alert: Omit<EmergencyAlert, 'userId' | 'timestamp'>) => boolean;
  joinDashboard: () => boolean;
  leaveDashboard: () => boolean;
  error: string | null;
}

/**
 * React hook for WebSocket functionality
 */
export const useWebSocket = (options: UseWebSocketOptions = {}): WebSocketHookReturn => {
  const {
    autoConnect = true,
    serverUrl = 'http://localhost:3001',
    callbacks = {}
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callbacksRef = useRef(callbacks);
  const hasConnectedRef = useRef(false);

  // Update callbacks ref when callbacks change
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const connect = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const success = await webSocketClient.connect(serverUrl);
      setIsConnected(success);
      return success;
    } catch (err: any) {
      setError(err?.message || 'Failed to connect');
      return false;
    }
  }, [serverUrl]);

  const disconnect = useCallback(() => {
    webSocketClient.disconnect();
    setIsConnected(false);
  }, []);

  // Setup WebSocket callbacks with state updates
  useEffect(() => {
    const wsCallbacks: WebSocketCallbacks = {
      onConnection: () => {
        setIsConnected(true);
        setError(null);
        callbacksRef.current.onConnection?.();
      },
      onDisconnection: () => {
        setIsConnected(false);
        callbacksRef.current.onDisconnection?.();
      },
      onError: (err) => {
        setError(err?.message || 'WebSocket error');
        callbacksRef.current.onError?.(err);
      },
      onLocationUpdate: callbacksRef.current.onLocationUpdate,
      onEmergencyAlert: callbacksRef.current.onEmergencyAlert,
      onEmergencyResponse: callbacksRef.current.onEmergencyResponse,
      onDashboardUpdate: callbacksRef.current.onDashboardUpdate,
      onSafetyScoreUpdate: callbacksRef.current.onSafetyScoreUpdate,
      onGeofenceAlert: callbacksRef.current.onGeofenceAlert,
    };

    webSocketClient.setCallbacks(wsCallbacks);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && !hasConnectedRef.current) {
      hasConnectedRef.current = true;
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  const sendLocationUpdate = useCallback((location: LocationUpdate): boolean => {
    return webSocketClient.sendLocationUpdate(location);
  }, []);

  const sendEmergencyAlert = useCallback((alert: Omit<EmergencyAlert, 'userId' | 'timestamp'>): boolean => {
    return webSocketClient.sendEmergencyAlert(alert);
  }, []);

  const joinDashboard = useCallback((): boolean => {
    return webSocketClient.joinDashboard();
  }, []);

  const leaveDashboard = useCallback((): boolean => {
    return webSocketClient.leaveDashboard();
  }, []);

  return {
    isConnected,
    connect,
    disconnect,
    sendLocationUpdate,
    sendEmergencyAlert,
    joinDashboard,
    leaveDashboard,
    error,
  };
};

/**
 * Hook specifically for location tracking
 */
export const useLocationTracking = (enabled: boolean = true) => {
  const [lastUpdate, setLastUpdate] = useState<LocationUpdate | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  const { isConnected, sendLocationUpdate } = useWebSocket({
    callbacks: {
      onLocationUpdate: (update) => {
        setLastUpdate(update);
        setUpdateCount(prev => prev + 1);
      }
    }
  });

  const sendLocation = useCallback((location: LocationUpdate) => {
    if (enabled && isConnected) {
      const success = sendLocationUpdate(location);
      if (success) {
        setLastUpdate(location);
        setUpdateCount(prev => prev + 1);
      }
      return success;
    }
    return false;
  }, [enabled, isConnected, sendLocationUpdate]);

  return {
    isConnected,
    lastUpdate,
    updateCount,
    sendLocation,
  };
};

/**
 * Hook for emergency alerts
 */
export const useEmergencyAlerts = () => {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [responses, setResponses] = useState<any[]>([]);

  const { isConnected, sendEmergencyAlert } = useWebSocket({
    callbacks: {
      onEmergencyAlert: (alert) => {
        setAlerts(prev => [alert, ...prev].slice(0, 50)); // Keep last 50 alerts
      },
      onEmergencyResponse: (response) => {
        setResponses(prev => [response, ...prev].slice(0, 20)); // Keep last 20 responses
      }
    }
  });

  const sendAlert = useCallback((alert: Omit<EmergencyAlert, 'userId' | 'timestamp'>) => {
    return sendEmergencyAlert(alert);
  }, [sendEmergencyAlert]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const clearResponses = useCallback(() => {
    setResponses([]);
  }, []);

  return {
    isConnected,
    alerts,
    responses,
    sendAlert,
    clearAlerts,
    clearResponses,
  };
};

/**
 * Hook for dashboard functionality
 */
export const useDashboard = (autoJoin: boolean = false) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isJoined, setIsJoined] = useState(false);

  const { isConnected, joinDashboard, leaveDashboard } = useWebSocket({
    callbacks: {
      onDashboardUpdate: (data) => {
        setDashboardData(data);
      },
      onConnection: () => {
        if (autoJoin) {
          setTimeout(() => {
            const success = joinDashboard();
            setIsJoined(success);
          }, 1000);
        }
      },
      onDisconnection: () => {
        setIsJoined(false);
      }
    }
  });

  const joinRoom = useCallback(() => {
    if (isConnected) {
      const success = joinDashboard();
      setIsJoined(success);
      return success;
    }
    return false;
  }, [isConnected, joinDashboard]);

  const leaveRoom = useCallback(() => {
    const success = leaveDashboard();
    setIsJoined(false);
    return success;
  }, [leaveDashboard]);

  return {
    isConnected,
    isJoined,
    dashboardData,
    joinRoom,
    leaveRoom,
  };
};

export default useWebSocket;