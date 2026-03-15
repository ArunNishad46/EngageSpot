import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const { user } = useAuth();
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setOnlineUsers([]);
        setTypingUsers({});
        setConnectionStatus('disconnected');
      }
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
    setConnectionStatus('connecting');

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    newSocket.on('connect', () => {
      setConnectionStatus('connected');
      reconnectAttempts.current = 0;
    });

    newSocket.on('disconnect', () => setConnectionStatus('disconnected'));

    newSocket.on('connect_error', () => {
      reconnectAttempts.current += 1;
      setConnectionStatus(reconnectAttempts.current >= 10 ? 'error' : 'connecting');
    });

    newSocket.on('reconnect', () => setConnectionStatus('connected'));

    newSocket.on('userOnline', ({ userId }) => {
      setOnlineUsers((prev) => [...new Set([...prev, userId])]);
    });

    newSocket.on('userOffline', ({ userId }) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    newSocket.on('onlineUsersList', (users) => setOnlineUsers(users));

    newSocket.on('typing', ({ chatId, userId, userName }) => {
      setTypingUsers((prev) => ({ ...prev, [chatId]: { userId, userName, timestamp: Date.now() } }));
    });

    newSocket.on('stopTyping', ({ chatId }) => {
      setTypingUsers((prev) => { const u = { ...prev }; delete u[chatId]; return u; });
    });

    setSocket(newSocket);

    return () => { newSocket.removeAllListeners(); newSocket.disconnect(); };
  }, [user]);

  // Auto-clear stale typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        const updated = {};
        for (const [chatId, data] of Object.entries(prev)) {
          if (now - data.timestamp < 5000) updated[chatId] = data;
        }
        return Object.keys(updated).length !== Object.keys(prev).length ? updated : prev;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const joinChat = useCallback((chatId) => socket?.emit('joinChat', chatId), [socket]);
  const leaveChat = useCallback((chatId) => socket?.emit('leaveChat', chatId), [socket]);
  const emitTyping = useCallback((chatId) => socket?.emit('typing', { chatId }), [socket]);
  const emitStopTyping = useCallback((chatId) => socket?.emit('stopTyping', { chatId }), [socket]);
  const isUserOnline = useCallback((userId) => onlineUsers.includes(userId), [onlineUsers]);

  return (
    <SocketContext.Provider value={{
      socket, onlineUsers, typingUsers, connectionStatus,
      joinChat, leaveChat, emitTyping, emitStopTyping, isUserOnline,
    }}>
      {children}
    </SocketContext.Provider>
  );
};

