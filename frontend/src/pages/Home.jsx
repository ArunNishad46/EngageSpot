import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { chatAPI } from '../services/api';
import { useMediaQuery } from '../hooks/useMediaQuery';
import Sidebar from '../components/home/Sidebar';
import ChatBox from '../components/ChatBox';
import WelcomeScreen from '../components/home/WelcomeScreen';
import ConnectionStatus from '../components/home/ConnectionStatus';
import toast from 'react-hot-toast';

const Home = () => {
  const { user } = useAuth();
  const { socket, connectionStatus } = useSocket();
  const isMobile = useMediaQuery('(max-width: 1023px)');

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        setLoading(true);
        const { data } = await chatAPI.getChats();
        setChats(data.chats);
      } catch (error) {
        toast.error('Failed to load chats');
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      setChats((prev) => {
        const updated = prev.map((chat) =>
          chat._id === message.chat._id
            ? { ...chat, latestMessage: message, updatedAt: new Date().toISOString() }
            : chat
        );
        return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    };

    const handleChatCreated = (chat) => {
      setChats((prev) => {
        if (prev.find((c) => c._id === chat._id)) return prev;
        return [chat, ...prev];
      });
    };

    // ✅ NEW: Listen for chat deletion
    const handleChatDeleted = ({ chatId, deletedBy }) => {
      setChats((prev) => prev.filter((c) => c._id !== chatId));
      // If the deleted chat was open, close it
      if (selectedChat?._id === chatId) {
        setSelectedChat(null);
        
        if(deletedBy !== user._id){
          toast('Current chat was deleted');
        }
      }
    };

    const handleGroupUpdated = (updatedChat) => {
      setChats((prev) =>
        prev.map((c) => (c._id === updatedChat._id ? updatedChat : c))
      );
      // Update selected chat if it's the same
      if (selectedChat?._id === updatedChat._id) {
        setSelectedChat(updatedChat);
      }
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('chatCreated', handleChatCreated);
    socket.on('chatDeleted', handleChatDeleted); 
    socket.on('groupUpdated', handleGroupUpdated);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('chatCreated', handleChatCreated);
      socket.off('chatDeleted', handleChatDeleted);
      socket.off('groupUpdated', handleGroupUpdated);
    };
  }, [socket, selectedChat]);

  const handleSelectChat = useCallback((chat) => {
    setSelectedChat(chat);
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const handleBack = useCallback(() => {
    setSelectedChat(null);
    if (isMobile) setSidebarOpen(true);
  }, [isMobile]);

  const handleChatUpdate = useCallback((updatedChat) => {
    setChats((prev) => {
      const updated = prev.map((c) =>
        c._id === updatedChat._id ? updatedChat : c
      );
      return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    });

    // Update selectedChat if it's the same chat
    setSelectedChat((prev) => 
      prev?._id === updatedChat._id ? updatedChat : prev
    );
  }, []);

  const handleNewChatCreated = useCallback((chat) => {
    setChats((prev) => {
      if (prev.find((c) => c._id === chat._id)) return prev;
      return [chat, ...prev];
    });
    setSelectedChat(chat);
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  // ✅ NEW: Handler for starting chat from member profile
  const handleStartChat = useCallback((chat) => {
    setChats((prev) => {
      if (prev.find((c) => c._id === chat._id)) {
        return prev;
      }
      return [chat, ...prev];
    });
    setSelectedChat(chat);
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const showSidebar = isMobile ? sidebarOpen : true;
  const showChat = isMobile ? !sidebarOpen : true;

  return (
    <div className="h-screen flex bg-slate-900 relative overflow-hidden">
      <ConnectionStatus status={connectionStatus} />

      {showSidebar && (
        <Sidebar
          chats={chats}
          selectedChat={selectedChat}
          loading={loading}
          currentUser={user}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChatCreated}
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
        />
      )}

      {showChat && (
        <div className="flex-1 flex flex-col min-w-0">
          {selectedChat ? (
            <ChatBox
              chat={selectedChat}
              currentUser={user}
              onChatUpdate={handleChatUpdate}
              onBack={handleBack}
              onStartChat={handleStartChat}
            />
          ) : (
            <WelcomeScreen />
          )}
        </div>
      )}
    </div>
  );
};

export default Home;

