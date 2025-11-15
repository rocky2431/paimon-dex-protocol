/**
 * Socket.IO Context Provider.
 *
 * Manages WebSocket connection to backend for real-time notifications.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAccount } from 'wagmi';

// Notification types from backend
export interface Notification {
  type: 'task_completed' | 'liquidation_warning' | 'reward_distributed';
  title: string;
  message: string;
  data: any;
  timestamp: string;
}

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  clearNotifications: () => void;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, isConnected: isWalletConnected } = useAccount();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Initialize Socket.IO connection when wallet is connected
  useEffect(() => {
    if (!isWalletConnected || !address) {
      // Disconnect socket if wallet disconnected
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Create socket connection with user authentication
    const newSocket = io(SOCKET_URL, {
      auth: {
        user_address: address.toLowerCase(),
      },
      transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('[Socket.IO] Connected to server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[Socket.IO] Connection error:', error);
      setIsConnected(false);
    });

    // Listen for notifications
    newSocket.on('notification', (notification: Notification) => {
      console.log('[Socket.IO] Received notification:', notification);
      setNotifications((prev) => [notification, ...prev].slice(0, 50)); // Keep last 50
    });

    setSocket(newSocket);

    // Cleanup on unmount or address change
    return () => {
      newSocket.disconnect();
    };
  }, [address, isWalletConnected]);

  const addNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => [notification, ...prev].slice(0, 50));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value: SocketContextValue = {
    socket,
    isConnected,
    notifications,
    addNotification,
    clearNotifications,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

// Custom hook to use Socket.IO context
export const useSocket = (): SocketContextValue => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

// Custom hook for notifications with auto-dismiss
export const useNotifications = () => {
  const { notifications, clearNotifications } = useSocket();
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // When new notification arrives, show it
    if (notifications.length > 0 && notifications[0] !== visibleNotifications[0]) {
      setVisibleNotifications(notifications.slice(0, 3)); // Show max 3 at once

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setVisibleNotifications((prev) => prev.slice(1));
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notifications]);

  return {
    notifications: visibleNotifications,
    clearAll: clearNotifications,
  };
};
