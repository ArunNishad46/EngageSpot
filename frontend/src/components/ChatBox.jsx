import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSocket } from '../context/SocketContext';
import { messageAPI, chatAPI, userAPI } from '../services/api';
import Message from './Message';
import TypingIndicator from './TypingIndicator';
import MediaPreview from './MediaPreview';
import EmojiPickerComponent from './EmojiPickerComponent';
import { formatLastSeen } from '../utils/formatTime';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiMoreVertical, FiSend, FiPaperclip, 
  FiMic, FiSmile, FiX, FiPhone, FiVideo, FiUsers, FiInfo, FiChevronRight, 
  FiEdit2, FiLogOut, FiCheck, FiMail, FiCamera, FiTrash2, FiShield, FiUserMinus, FiUserPlus, FiMessageCircle, FiSearch,
  FiCalendar, FiClock,
} from 'react-icons/fi';

const getDateLabel = (dateStr) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

const shouldShowDate = (cur, prev) => {
  if (!prev) return true;
  return new Date(cur.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
};

const ChatBox = ({ chat, currentUser, onChatUpdate, onBack, onStartChat  }) => {
  const {
    socket, joinChat, leaveChat, emitTyping, emitStopTyping,
    typingUsers, isUserOnline,
  } = useSocket();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showComingSoon, setShowComingSoon] = useState(null); 
  const [contactDetails, setContactDetails] = useState(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [editGroupData, setEditGroupData] = useState({ name: '', description: '' });
  const [editGroupLoading, setEditGroupLoading] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [groupAvatarUploading, setGroupAvatarUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

   // Add Member Modal States
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingMember, setAddingMember] = useState(null);

    // Member Profile Modal States
  const [showMemberProfile, setShowMemberProfile] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberProfileLoading, setMemberProfileLoading] = useState(false);
  const [memberProfileData, setMemberProfileData] = useState(null);

  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const otherUser = useMemo(() => {
    if (chat.isGroupChat) return null;
    const found = chat.users.find((u) => u._id !== currentUser._id);

    // Fallback for deleted user
    return found || {
      name: "Deleted Account",
      email: "N/A",
      avatar: { url: "https://ui-avatars.com/api/?name=Deleted&background=cbd5e1&color=fff" },
      bio: "This account has been deleted.",
      _id: "deleted",
      isDeleted: true
    };
  }, [chat, currentUser._id]);

  const chatName = chat.isGroupChat ? chat.chatName : otherUser?.name;

  const chatAvatar = chat.isGroupChat
    ? chat.groupAvatar?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.chatName || 'G')}&background=334155&color=94a3b8`
    : otherUser?.avatar?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.name || 'U')}&background=0284c7&color=fff`;

  const isGroupAdmin = useMemo(() => {
    if (!chat.isGroupChat) return false;
    return chat.groupAdmins?.some(admin => 
      admin._id === currentUser._id || admin === currentUser._id
    );
  }, [chat, currentUser._id]);

  const isMemberAdmin = useCallback((memberId) => {
    return chat.groupAdmins?.some(admin => 
      admin._id === memberId || admin === memberId
    );
  }, [chat.groupAdmins]);

  useEffect(() => {
    if (!chat?._id) return;
    joinChat(chat._id);
    fetchMessages();
    markAsSeen();
    return () => leaveChat(chat._id);
  }, [chat?._id]);

  useEffect(() => {
    if (!socket) return;
    const handleNew = (msg) => {
      if (msg.chat._id === chat._id) {
        setMessages((p) => [...p, msg]);
        scrollToBottom();
        markAsSeen();

        if(msg.sender._id !== currentUser._id){
          socket.emit('messageSeen', {
            messageId: msg._id,
            chatId: chat._id,
            senderId: msg.sender._id
          });
        }
      }
    };
    const handleDeleted = ({ messageId }) => {
      setMessages((p) => p.map((m) =>
        m._id === messageId ? { ...m, deletedForEveryone: true, content: 'This message was deleted' } : m
      ));
    };
    const handleStatusUpdate = ({ messageId, status }) => {
      setMessages((p) => p.map((m) => m._id === messageId ? { ...m, status } : m));
    };

    const handleMessageSeen = ({ messageId }) => {
       setMessages((prev) => prev.map((msg) => 
         msg._id === messageId ? { ...msg, status: 'seen' } : msg
       ));
    };

    const handleChatSeen = ({ chatId }) => {
      if (chatId === chat._id) {
        setMessages((prev) => prev.map((msg) => {
          // If I sent the message and it's not seen yet, mark it seen
          if (msg.sender._id === currentUser._id && msg.status !== 'seen') {
            return { ...msg, status: 'seen' };
          }
          return msg;
        }));
      }
    };

    const handleSocketDelivered = ({ messageId }) => {
      setMessages((p) => p.map((m) => m._id === messageId ? { ...m, status: 'delivered' } : m));
    }

    socket.on('newMessage', handleNew);
    socket.on('messageDeleted', handleDeleted);
    socket.on('messageStatusUpdated', handleStatusUpdate);
    socket.on('chatSeen', handleChatSeen);
    socket.on('messageSeen', handleMessageSeen);
    socket.on('messageDelivered', handleSocketDelivered);
    return () => {
      socket.off('newMessage', handleNew);
      socket.off('messageDeleted', handleDeleted);
      socket.off('messageStatusUpdated', handleStatusUpdate);
      socket.off('chatSeen', handleChatSeen);
      socket.off('messageSeen', handleMessageSeen);
      socket.off('messageDelivered', handleSocketDelivered);
    };
  }, [socket, chat._id, currentUser._id]);

  useEffect(() => {
    if (typingUsers[chat._id]) {
      scrollToBottom();
    }
  }, [typingUsers[chat._id]]);

  // Search users for adding to group
  useEffect(() => {
    if (!showAddMember) {
      setSearchQuery('');
      setSearchResults([]);
      return;
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const { data } = await userAPI.getUsers(searchQuery);
        
        // Filter out users already in group
        const existingUserIds = chat.users.map(u => u._id.toString());
        const filteredResults = data.users.filter(
          user => !existingUserIds.includes(user._id.toString())
        );
        
        setSearchResults(filteredResults);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchQuery, showAddMember, chat.users]);

  const fetchMessages = async (pageNum = 1) => {
    try {
      pageNum === 1 ? setLoading(true) : setLoadingMore(true);
      const { data } = await messageAPI.getMessages(chat._id, pageNum);
      if (pageNum === 1) {
        setMessages(data.messages);
        setTimeout(scrollToBottom, 100);
      } else {
        const c = containerRef.current;
        const prevH = c?.scrollHeight || 0;
        setMessages((p) => [...data.messages, ...p]);
        requestAnimationFrame(() => { if (c) c.scrollTop = c.scrollHeight - prevH; });
      }
      setHasMore(data.page < data.pages);
      setPage(pageNum);
    } catch { toast.error('Failed to load messages'); }
    finally { setLoading(false); setLoadingMore(false); }
  };

  const handleScroll = () => {
    const c = containerRef.current;
    if (c && c.scrollTop < 50 && hasMore && !loadingMore) fetchMessages(page + 1);
  };

  const markAsSeen = async () => { try { await messageAPI.markChatAsSeen(chat._id); } catch {} };
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const handleTyping = () => {
    emitTyping(chat._id);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitStopTyping(chat._id), 2000);
  };

  const handleInputChange = (e) => { setMessage(e.target.value); handleTyping(); };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) return toast.error('Max 50MB allowed');
    setSelectedFile(file);
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFilePreview({ url: ev.target.result, type: file.type.startsWith('image/') ? 'image' : 'video', name: file.name, size: file.size });
        setShowMediaPreview(true);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview({ type: 'file', name: file.name, size: file.size });
      setShowMediaPreview(true);
    }
  };

  const handleEmojiSelect = (emoji) => { setMessage((p) => p + emoji.native); setShowEmojiPicker(false); };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if ((!message.trim() && !selectedFile) || sending) return;
    try {
      setSending(true);
      emitStopTyping(chat._id);
      const formData = new FormData();
      formData.append('chatId', chat._id);
      if (message.trim()) formData.append('content', message.trim());
      if (selectedFile) formData.append('file', selectedFile);
      const { data } = await messageAPI.sendMessage(formData);
      setMessages((p) => [...p, data.message]);
      setMessage('');
      setSelectedFile(null);
      setFilePreview(null);
      setShowMediaPreview(false);
      scrollToBottom();
      onChatUpdate?.({ ...chat, latestMessage: data.message, updatedAt: new Date().toISOString() });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send');
    } finally { setSending(false); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'voice-message.webm', { type: 'audio/webm' });
        setSelectedFile(file);
        setFilePreview({ type: 'audio', name: 'Voice Message', size: blob.size, url: URL.createObjectURL(blob) });
        setShowMediaPreview(true);
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(recordingIntervalRef.current);
        setRecordingTime(0);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      recordingIntervalRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch { toast.error('Microphone access denied'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setSelectedFile(null);
      setFilePreview(null);
      clearInterval(recordingIntervalRef.current);
      setRecordingTime(0);
    }
  };

  const cancelFileSelection = () => {
    setSelectedFile(null); setFilePreview(null); setShowMediaPreview(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteForMe = async (id) => {
    try { await messageAPI.deleteForMe(id); setMessages((p) => p.filter((m) => m._id !== id)); toast.success('Deleted'); }
    catch { toast.error('Delete failed'); }
  };

  const handleDeleteForEveryone = async (id) => {
    try {
      await messageAPI.deleteForEveryone(id);
      setMessages((p) => p.map((m) => m._id === id ? { ...m, deletedForEveryone: true, content: 'This message was deleted' } : m));
      toast.success('Deleted for everyone');
    } catch (e) { toast.error(e.response?.data?.message || 'Delete failed'); }
  };

  const handleLeaveGroup = async () => {
    try { 
      await chatAPI.removeFromGroup(chat._id, currentUser._id); 
      toast.success('Left group'); 
      onBack(); 
    }
    catch { 
      toast.error('Failed to leave group'); 
    }
  };

  const handleDeleteChat = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await chatAPI.deleteChat(chat._id);
      toast.success(chat.isGroupChat ? 'Group deleted' : 'Chat deleted');
      onBack();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete group');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const openChatInfo = async () => {
    setShowChatInfo(true);
    if (!chat.isGroupChat && otherUser?._id && !otherUser.isDeleted) {
      try {
        setContactLoading(true);
        const { data } = await userAPI.getUserById(otherUser._id);
        setContactDetails(data.user);
      } catch (error) {
        console.error('Failed to load contact details');
      } finally {
        setContactLoading(false);
      }
    }
  };
  
  const handleEditGroup = async (e) => {
    e.preventDefault();
    if (!editGroupData.name.trim()) return;
    try {
      setEditGroupLoading(true);
      const { data } = await chatAPI.updateGroupChat(chat._id, {
        name: editGroupData.name.trim(),
        description: editGroupData.description.trim(),
      });
      onChatUpdate?.({ ...chat, chatName: data.chat.chatName, description: data.chat.description });
      setShowEditGroup(false);
      toast.success('Group updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update group');
    } finally {
      setEditGroupLoading(false);
    }
  };

  const handleGroupAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Select an image file');
    if (file.size > 5 * 1024 * 1024) return toast.error('Max 5MB allowed');
  
    try {
      setGroupAvatarUploading(true);
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await chatAPI.updateGroupAvatar(chat._id, formData);
      onChatUpdate?.({ ...chat, groupAvatar: data.avatar });
      toast.success('Group avatar updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update avatar');
    } finally {
      setGroupAvatarUploading(false);
    }
  };

  const handlePromoteToAdmin = async (member) => {
    try {
      const { data } = await chatAPI.addAdmin(chat._id, member._id);
      onChatUpdate?.(data.chat);
      setMemberProfileData(prev => prev ? { ...prev } : null);
      toast.success(`${member.name} is now an admin`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to promote member');
    }
  };

  const handleDemoteAdmin = async (member) => {
    try {
      const { data } = await chatAPI.removeAdmin(chat._id, member._id);
      onChatUpdate?.(data.chat);
      setMemberProfileData(prev => prev ? { ...prev } : null);
      toast.success(`${member.name} is no longer an admin`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to demote admin');
    }
  };

  const handleAddMember = async (user) => {
    try {
      setAddingMember(user._id);
      const { data } = await chatAPI.addToGroup(chat._id, user._id);
      onChatUpdate?.(data.chat);
      toast.success(`${user.name} added to group`);
      setSearchResults(prev => prev.filter(u => u._id !== user._id));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add member');
    } finally {
      setAddingMember(null);
    }
  };

  const handleViewMemberProfile = async (member) => {
    try {
      setSelectedMember(member);
      setShowMemberProfile(true);
      setMemberProfileLoading(true);
      
      const { data } = await userAPI.getUserById(member._id);
      setMemberProfileData(data.user);
    } catch (error) {
      toast.error('Failed to load profile');
      setShowMemberProfile(false);
    } finally {
      setMemberProfileLoading(false);
    }
  };

  const handleStartConversation = async (member) => {
    try {
      if (member._id === currentUser._id) {
        toast.error("You can't message yourself");
        return;
      }

      const { data } = await chatAPI.accessChat(member._id);
      setShowMemberProfile(false);
      setShowChatInfo(false);
      
      if (onStartChat) {
        onStartChat(data.chat);
      }
      
      toast.success(`Chat with ${member.name}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start conversation');
    }
  };

  const handleRemoveMember = async (member) => {
    try {
      const { data } = await chatAPI.removeFromGroup(chat._id, member._id);
      onChatUpdate?.(data.chat);
      toast.success(`${member.name} removed from group`);
      setShowMemberProfile(false);
      setSelectedMember(null);
      setMemberProfileData(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove member');
    }
  };

  const chatStatus = useMemo(() => {
    if (chat.isGroupChat) return `${chat.users.length} members`;
    if (typingUsers[chat._id]) return 'typing...';
    if (otherUser && isUserOnline(otherUser._id)) return 'Online';
    if (otherUser?.lastSeen) return `Last seen ${formatLastSeen(otherUser.lastSeen)}`;
    return 'Offline';
  }, [chat, typingUsers, otherUser, isUserOnline]);

  const fmtRecTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-4 py-3 bg-dark-100 border-b border-dark-200/50 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="lg:hidden btn-ghost p-2" aria-label="Back">
            <FiArrowLeft size={20} />
          </button>
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={openChatInfo}
          >
            <div className="relative shrink-0">
              <img src={chatAvatar} alt={chatName} className="avatar ring-2 ring-dark-200" />
              {!chat.isGroupChat && isUserOnline(otherUser?._id) && (
                <span className="status-dot status-online" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-white text-sm">{chatName}</h2>
              <p className={`text-xs transition-colors-fast ${
                typingUsers[chat._id] ? 'text-primary-400'
                  : isUserOnline(otherUser?._id) ? 'text-green-400'
                  : 'text-dark-400'
              }`}>
                {chatStatus}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button 
            className="btn-ghost p-2" 
            aria-label="Voice call"
            onClick={() => setShowComingSoon('voice')}
          >
            <FiPhone size={18} />
          </button>
          <button 
            className="btn-ghost p-2" 
            aria-label="Video call"
            onClick={() => setShowComingSoon('video')}
          >
            <FiVideo size={18} />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="btn-ghost p-2"
              aria-label="Menu"
            >
              <FiMoreVertical size={18} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="dropdown-menu right-0 mt-2 w-52">
                  <button
                    onClick={() => { openChatInfo(); setShowMenu(false); }}
                    className="dropdown-item"
                  >
                    <FiInfo size={15} />
                    {chat.isGroupChat ? 'Group Info' : 'Contact Info'}
                  </button>

                  {chat.isGroupChat && isGroupAdmin && (
                    <button
                      onClick={() => { setShowAddMember(true); setShowMenu(false); }}
                      className="dropdown-item"
                    >
                      <FiUserPlus size={15} />
                      Add Members
                    </button>
                  )}

                  {!chat.isGroupChat && (
                    <>
                      <div className="dropdown-divider" />
                      <button
                        onClick={() => { handleDeleteChat(); setShowMenu(false); }}
                        className="dropdown-item dropdown-item-danger"
                      >
                        <FiTrash2 size={16} />
                        Delete Conversation
                      </button>
                    </>
                  )}

                  {isGroupAdmin && (
                    <button 
                      onClick={() => {
                        setEditGroupData({
                          name: chat.chatName || '',
                          description: chat.description || '',
                        });
                        openChatInfo();
                        setShowEditGroup(true);
                        setShowMenu(false);
                      }} 
                      className="dropdown-item"
                    >
                      <FiEdit2 size={15} />
                      Edit Group
                    </button>
                  )}
                  {chat.isGroupChat && (
                    <>
                      <div className="dropdown-divider" />
                      <button
                        onClick={() => { handleLeaveGroup(); setShowMenu(false); }}
                        className="dropdown-item dropdown-item-danger"
                      >
                        <FiLogOut size={15} />
                        Leave Group
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Messages ─── */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 pt-3 pb-2 space-y-1 scrollbar-thin chat-bg-pattern"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="spinner spinner-xl spinner-primary" />
          </div>
        ) : (
          <>
            {loadingMore && (
              <div className="flex justify-center py-3">
                <div className="spinner spinner-lg spinner-primary" />
              </div>
            )}

            {messages.length === 0 && (
              <div className="empty-state h-full">
                <p className="text-lg font-medium text-dark-400">No messages yet</p>
                <p className="text-sm mt-1">Send a message to start the conversation</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={msg._id}>
                {shouldShowDate(msg, messages[i - 1]) && (
                  <div className="chat-date-separator">
                    <span className="chat-date-label">
                      {getDateLabel(msg.createdAt)}
                    </span>
                  </div>
                )}
                <Message
                  message={msg}
                  isOwn={msg.sender?._id === currentUser._id}
                  showAvatar={chat.isGroupChat && msg.sender?._id !== currentUser._id}
                  previousMessage={messages[i - 1]}
                  onDeleteForMe={handleDeleteForMe}
                  onDeleteForEveryone={handleDeleteForEveryone}
                />
              </div>
            ))}

            {typingUsers[chat._id] && (
              <TypingIndicator userName={typingUsers[chat._id].userName} />
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Media Preview */}
      {showMediaPreview && filePreview && (
        <MediaPreview
          file={filePreview}
          onClose={cancelFileSelection}
          onSend={() => handleSendMessage()}
          sending={sending}
          message={message}
          onMessageChange={(e) => setMessage(e.target.value)}
        />
      )}

      {/* ─── Input ─── */}
      <div className="px-4 py-3 bg-dark-100 border-t border-dark-200/50 shrink-0 safe-bottom">
        {!chat.isGroupChat && otherUser?.isDeleted ? (
          <div className="p-3 bg-dark-200/50 rounded-xl text-center">
            <p className="text-sm text-dark-400">
              You cannot reply to this conversation because the account has been deleted.
            </p>
          </div>
        ) : isRecording ? (
          <div className="flex items-center gap-3 mb-3">
            <button onClick={cancelRecording} className="btn-ghost p-2.5 hover:!text-red-400">
              <FiX size={20} />
            </button>
            <div className="recording-bar flex-1">
              <span className="recording-dot" />
              <span className="text-sm text-red-400 font-medium font-mono">
                {fmtRecTime(recordingTime)}
              </span>
              <div className="flex-1 flex items-center gap-0.5">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="recording-wave"
                    style={{
                      height: `${Math.random() * 16 + 8}px`,
                      animationDelay: `${i * 50}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
            <button onClick={stopRecording} className="btn-primary p-2.5">
              <FiSend size={18} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-end gap-2 mb-3">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-ghost p-2.5"
              aria-label="Attach file"
            >
              <FiPaperclip size={20} />
            </button>

            <div className="flex-1 relative">
              <input
                type="text"
                value={message}
                onChange={handleInputChange}
                placeholder="Type a message..."
                className="input-field pr-10"
              />
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors-fast"
                aria-label="Emoji"
              >
                <FiSmile size={18} />
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-full -right-11 sm:right-0 mb-2 z-50">
                  <EmojiPickerComponent
                    onEmojiSelect={handleEmojiSelect}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                </div>
              )}
            </div>

            {message.trim() || selectedFile ? (
              <button
                type="submit"
                disabled={sending}
                className="btn-primary p-2.5"
                aria-label="Send"
              >
                {sending ? <div className="spinner spinner-sm" /> : <FiSend size={18} />}
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="btn-ghost p-2.5"
                aria-label="Record audio"
              >
                <FiMic size={20} />
              </button>
            )}
          </form>
        )}
      </div>

      {/* ─── Chat Info Modal ─── */}
      {showChatInfo && (
        <div className="modal-overlay" onClick={() => { setShowChatInfo(false); setContactDetails(null); setShowEditGroup(false); }}>
          <div
            className="modal-content max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="text-lg font-bold text-white">
                {showEditGroup ? 'Edit Group' : chat.isGroupChat ? 'Group Info' : 'Contact Info'}
              </h2>
              <button
                onClick={() => {
                  if (showEditGroup) {
                    setShowEditGroup(false);
                  } else {
                    setShowChatInfo(false);
                    setContactDetails(null);
                  }
                }}
                className="btn-ghost"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="modal-body">
              {showEditGroup ? (
                <form onSubmit={handleEditGroup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-500 mb-2">
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={editGroupData.name}
                      onChange={(e) => setEditGroupData((p) => ({ ...p, name: e.target.value }))}
                      className="input-field"
                      placeholder="Enter group name"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-500 mb-2">
                      Description
                    </label>
                    <textarea
                      value={editGroupData.description}
                      onChange={(e) => setEditGroupData((p) => ({ ...p, description: e.target.value }))}
                      className="input-field resize-none"
                      placeholder="Enter group description (optional)"
                      rows={3}
                      maxLength={200}
                    />
                    <p className="text-xs text-dark-400 mt-1 text-right">
                      {editGroupData.description.length}/200
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={editGroupLoading || !editGroupData.name.trim()}
                      className="btn-primary flex-1"
                    >
                      {editGroupLoading ? (
                        <div className="spinner spinner-sm" />
                      ) : (
                        <>
                          <FiCheck size={16} />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEditGroup(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="relative inline-block mb-4">
                      <img
                        src={chatAvatar}
                        alt={chatName}
                        className="avatar-2xl rounded-2xl ring-4 ring-dark-200"
                      />
                      {isGroupAdmin && chat.isGroupChat && (
                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 hover:opacity-100 cursor-pointer transition-default">
                          {groupAvatarUploading ? (
                            <div className="spinner spinner-sm" />
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <FiCamera size={20} className="text-white" />
                              <span className="text-[10px] text-white/80 font-medium">Change</span>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleGroupAvatarChange}
                            className="hidden"
                            disabled={groupAvatarUploading}
                          />
                        </label>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-white">{chatName}</h3>
                    {chat.isGroupChat ? (
                      <p className="text-dark-400 text-sm mt-1">
                        {chat.users.length} members • {chat.groupAdmins?.length || 1} admin{(chat.groupAdmins?.length || 1) !== 1 ? 's' : ''}
                      </p>
                    ) : (
                      <p className="text-dark-400 text-sm mt-1">{otherUser?.email}</p>
                    )}

                    {chat.isGroupChat && isGroupAdmin && (
                      <div className="flex justify-center gap-2 mt-4">
                        <button
                          onClick={() => {
                            setEditGroupData({
                              name: chat.chatName || '',
                              description: chat.description || '',
                            });
                            setShowEditGroup(true);
                          }}
                          className="btn-secondary text-sm"
                        >
                          <FiEdit2 size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => setShowAddMember(true)}
                          className="btn-primary text-sm"
                        >
                          <FiUserPlus size={14} />
                          Add Members
                        </button>
                      </div>
                    )}
                  </div>

                  {chat.isGroupChat ? (
                    chat.description && (
                      <div className="mb-6 p-4 card">
                        <div className="section-header mb-2">Description</div>
                        <p className="text-dark-500 text-sm">{chat.description}</p>
                      </div>
                    )
                  ) : (
                    <div className="mb-6 p-4 card">
                      <div className="section-header mb-2">Bio</div>
                      {contactLoading ? (
                        <div className="space-y-2">
                          <div className="skeleton skeleton-text w-full" />
                          <div className="skeleton skeleton-text w-3/4" />
                        </div>
                      ) : (
                        <p className="text-dark-500 text-sm">
                          {contactDetails?.bio || otherUser?.bio || 'No bio set'}
                        </p>
                      )}
                    </div>
                  )}

                  {!chat.isGroupChat && (
                    <>
                      <div className="mb-6 p-4 card">
                        <div className="section-header mb-3">Contact Details</div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
                              <FiMail size={14} className="text-primary-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-dark-400">Email</p>
                              <p className="text-sm text-white truncate">
                                {otherUser?.email || 'N/A'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                              <FiUsers size={14} className="text-green-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-dark-400">Status</p>
                              <p className={`text-sm font-medium ${
                                isUserOnline(otherUser?._id) ? 'text-green-400' : 'text-dark-400'
                              }`}>
                                {isUserOnline(otherUser?._id) ? 'Online' :
                                  otherUser?.lastSeen
                                    ? `Last seen ${formatLastSeen(otherUser.lastSeen)}`
                                    : 'Offline'
                                }
                              </p>
                            </div>
                          </div>
                          {contactLoading ? (
                            <div className="flex items-center gap-3">
                              <div className="skeleton w-8 h-8 rounded-lg" />
                              <div className="flex-1 space-y-1">
                                <div className="skeleton skeleton-text w-16" />
                                <div className="skeleton skeleton-text w-24" />
                              </div>
                            </div>
                          ) : contactDetails?.createdAt && (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                                <FiInfo size={14} className="text-purple-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-dark-400">Joined</p>
                                <p className="text-sm text-white">
                                  {new Date(contactDetails.createdAt).toLocaleDateString('en-US', {
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleDeleteChat();
                        }}
                        className="btn-danger w-full"
                      >
                        <FiTrash2 size={16} />
                        Delete Conversation
                      </button>
                    </>
                  )}

                  {/* ✅ UPDATED: Members list - Click to open profile */}
                  {chat.isGroupChat && (
                    <div>
                      <div className="section-header flex items-center justify-between">
                        <span>Members ({chat.users.length})</span>
                      </div>
                      <div className="space-y-0.5 max-h-64 overflow-y-auto scrollbar-thin">
                        {chat.users.map((member) => {
                          const memberIsAdmin = isMemberAdmin(member._id);
                          const isMe = member._id === currentUser._id;

                          return (
                            <div
                              key={member._id}
                              className={`flex items-center gap-3 p-2.5 rounded-xl transition-default ${
                                !isMe ? 'cursor-pointer hover:bg-dark-200/30' : ''
                              }`}
                              onClick={() => !isMe && handleViewMemberProfile(member)}
                            >
                              <div className="relative shrink-0">
                                <img
                                  src={member.avatar?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&size=40&background=0284c7&color=fff`}
                                  alt={member.name}
                                  className="avatar"
                                />
                                {isUserOnline(member._id) && (
                                  <span className="status-dot status-online" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-white text-sm truncate">
                                  {member.name}
                                  {isMe && <span className="text-dark-400 ml-1">(You)</span>}
                                </p>
                                {memberIsAdmin && (
                                  <span className="inline-flex items-center gap-1 text-xs text-primary-400 font-medium">
                                    <FiShield size={10} />
                                    Admin
                                  </span>
                                )}
                              </div>
                              {/* Arrow indicator for clickable members */}
                              {!isMe && (
                                <FiChevronRight size={16} className="text-dark-400" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {chat.isGroupChat && (
                    <div className="space-y-3 mt-6">
                      <button
                        onClick={() => {
                          setShowChatInfo(false);
                          handleLeaveGroup();
                        }}
                        className="btn-danger w-full"
                      >
                        <FiLogOut size={16} />
                        Leave Group
                      </button>

                      {isGroupAdmin && (
                        <button
                          onClick={() => {
                            setShowChatInfo(false);
                            handleDeleteChat();
                          }}
                          className="btn-danger w-full"
                        >
                          <FiTrash2 size={16} />
                          Delete Group
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW: Add Member Modal */}
      {showAddMember && (
        <div className="modal-overlay" onClick={() => setShowAddMember(false)}>
          <div
            className="modal-content max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="text-lg font-bold text-white">Add Members</h2>
              <button
                onClick={() => setShowAddMember(false)}
                className="btn-ghost"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Search Input */}
              <div className="relative mb-4">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users by name or email..."
                  className="input-field pl-10"
                  autoFocus
                />
              </div>

              {/* Search Results */}
              <div className="max-h-64 overflow-y-auto scrollbar-thin">
                {searchLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="spinner spinner-lg spinner-primary" />
                  </div>
                ) : searchQuery.trim() === '' ? (
                  <div className="text-center py-8">
                    <FiUsers className="mx-auto text-dark-400 mb-2" size={32} />
                    <p className="text-dark-400 text-sm">Search for users to add</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-dark-400 text-sm">No users found</p>
                    <p className="text-dark-500 text-xs mt-1">Try a different search term</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {searchResults.map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-dark-200/30 transition-default"
                      >
                        <div className="relative shrink-0">
                          <img
                            src={user.avatar?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=40&background=0284c7&color=fff`}
                            alt={user.name}
                            className="avatar"
                          />
                          {isUserOnline(user._id) && (
                            <span className="status-dot status-online" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm truncate">{user.name}</p>
                          <p className="text-xs text-dark-400 truncate">{user.email}</p>
                        </div>
                        <button
                          onClick={() => handleAddMember(user)}
                          disabled={addingMember === user._id}
                          className="btn-primary py-1.5 px-3 text-sm"
                        >
                          {addingMember === user._id ? (
                            <div className="spinner spinner-sm" />
                          ) : (
                            <>
                              <FiUserPlus size={14} />
                              Add
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Current Members Count */}
              <div className="mt-4 pt-4 border-t border-dark-200/50">
                <p className="text-xs text-dark-400 text-center">
                  Current members: {chat.users.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW: Member Profile Modal */}
      {showMemberProfile && selectedMember && (
        <div className="modal-overlay" onClick={() => { setShowMemberProfile(false); setSelectedMember(null); setMemberProfileData(null); }}>
          <div
            className="modal-content max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="text-lg font-bold text-white">Profile</h2>
              <button
                onClick={() => { setShowMemberProfile(false); setSelectedMember(null); setMemberProfileData(null); }}
                className="btn-ghost"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="modal-body">
              {memberProfileLoading ? (
                <div className="flex flex-col items-center py-8">
                  <div className="spinner spinner-xl spinner-primary mb-4" />
                  <p className="text-dark-400 text-sm">Loading profile...</p>
                </div>
              ) : memberProfileData ? (
                <>
                  {/* Profile Header */}
                  <div className="text-center mb-6">
                    <div className="relative inline-block mb-4">
                      <img
                        src={memberProfileData.avatar?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(memberProfileData.name)}&size=96&background=0284c7&color=fff`}
                        alt={memberProfileData.name}
                        className="w-24 h-24 rounded-2xl object-cover ring-4 ring-dark-200"
                      />
                      {isUserOnline(memberProfileData._id) && (
                        <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full ring-2 ring-dark-100" />
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white">{memberProfileData.name}</h3>
                    <p className="text-dark-400 text-sm mt-1">{memberProfileData.email}</p>
                    
                    {/* Admin badge */}
                    {isMemberAdmin(memberProfileData._id) && (
                      <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-primary-500/10 text-primary-400 rounded-full text-xs font-medium">
                        <FiShield size={12} />
                        Group Admin
                      </span>
                    )}
                  </div>

                  {/* Bio */}
                  <div className="mb-6 p-4 card">
                    <div className="section-header mb-2">Bio</div>
                    <p className="text-dark-500 text-sm">
                      {memberProfileData.bio || 'No bio set'}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="mb-6 p-4 card">
                    <div className="section-header mb-3">Details</div>
                    <div className="space-y-3">
                      {/* Status */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                          <FiClock size={14} className="text-green-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-dark-400">Status</p>
                          <p className={`text-sm font-medium ${
                            isUserOnline(memberProfileData._id) ? 'text-green-400' : 'text-dark-400'
                          }`}>
                            {isUserOnline(memberProfileData._id)
                              ? 'Online'
                              : memberProfileData.lastSeen
                                ? `Last seen ${formatLastSeen(memberProfileData.lastSeen)}`
                                : 'Offline'
                            }
                          </p>
                        </div>
                      </div>

                      {/* Email */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
                          <FiMail size={14} className="text-primary-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-dark-400">Email</p>
                          <p className="text-sm text-white truncate">{memberProfileData.email}</p>
                        </div>
                      </div>

                      {/* Joined */}
                      {memberProfileData.createdAt && (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                            <FiCalendar size={14} className="text-purple-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-dark-400">Joined</p>
                            <p className="text-sm text-white">
                              {new Date(memberProfileData.createdAt).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {/* Message Button */}
                    <button
                      onClick={() => handleStartConversation(memberProfileData)}
                      className="btn-primary w-full"
                    >
                      <FiMessageCircle size={16} />
                      Message {memberProfileData.name.split(' ')[0]}
                    </button>

                    {/* Admin Actions */}
                    {isGroupAdmin && memberProfileData._id !== currentUser._id && (
                      <>
                        {/* Divider */}
                        <div className="border-t border-dark-200/50 my-3" />
                        {isMemberAdmin(memberProfileData._id) ? (
                          chat.groupAdmins?.length > 1 && (
                            <button
                              onClick={() => {
                                handleDemoteAdmin(memberProfileData);
                                setShowMemberProfile(false);
                              }}
                              className="btn-secondary w-full !text-orange-400 hover:!bg-orange-500/10"
                            >
                              <FiUserMinus size={16} />
                              Remove as Admin
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => {
                              handlePromoteToAdmin(memberProfileData);
                              setShowMemberProfile(false);
                            }}
                            className="btn-secondary w-full !text-purple-400 hover:!bg-purple-500/10"
                          >
                            <FiShield size={16} />
                            Make Admin
                          </button>
                        )}

                        <button
                          onClick={() => handleRemoveMember(memberProfileData)}
                          className="btn-danger w-full"
                        >
                          <FiX size={16} />
                          Remove from Group
                        </button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-dark-400">Failed to load profile</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Coming Soon Modal ─── */}
      {showComingSoon && (
        <div
          className="modal-overlay"
          onClick={() => setShowComingSoon(null)}
        >
          <div
            className="modal-content max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 text-center">
              {/* Animated Icon */}
              <div className="relative w-20 h-20 mx-auto mb-6">
                {/* Pulse rings */}
                <div className="absolute inset-0 rounded-full bg-primary-500/20 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-primary-500/10 animate-pulse" />
                <div className="relative w-20 h-20 gradient-primary rounded-full flex items-center justify-center shadow-glow-primary">
                  {showComingSoon === 'voice' ? (
                    <FiPhone size={32} className="text-white" />
                  ) : (
                    <FiVideo size={32} className="text-white" />
                  )}
                </div>
              </div>
      
              {/* Title */}
              <h3 className="text-xl font-bold text-white mb-2">
                {showComingSoon === 'voice' ? 'Voice Calls' : 'Video Calls'}
              </h3>
              <p className="text-dark-400 text-sm mb-6 leading-relaxed">
                {showComingSoon === 'voice'
                  ? 'Crystal-clear voice calls are coming soon. Stay tuned for this exciting update!'
                  : 'Face-to-face video calls are coming soon. We\'re working hard to bring this to you!'}
              </p>
      
              {/* Feature Preview */}
              <div className="card p-4 mb-6 text-left space-y-3">
                <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  What to expect
                </p>
                {(showComingSoon === 'voice'
                  ? [
                      'HD voice quality',
                      'Group voice calls',
                      'Call recording option',
                    ]
                  : [
                      'HD video streaming',
                      'Screen sharing',
                      'Group video calls',
                    ]
                ).map((feature, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-primary-500/20 flex items-center justify-center shrink-0">
                      <FiCheck size={12} className="text-primary-400" />
                    </div>
                    <span className="text-sm text-dark-500">{feature}</span>
                  </div>
                ))}
              </div>
      
              {/* Progress indicator */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs text-dark-400 mb-1.5">
                  <span>Development Progress</span>
                  <span className="text-primary-400 font-semibold">
                    {showComingSoon === 'voice' ? '50%' : '25%'}
                  </span>
                </div>
                <div className="h-2 bg-dark-200 rounded-full overflow-hidden">
                  <div
                    className="h-full gradient-primary rounded-full transition-all duration-1000 ease-out"
                    style={{ width: showComingSoon === 'voice' ? '50%' : '25%' }}
                  />
                </div>
              </div>
      
              {/* Action */}
              <button
                onClick={() => setShowComingSoon(null)}
                className="btn-primary w-full py-3"
              >
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiTrash2 size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {chat.isGroupChat ? 'Delete Group?' : 'Delete Chat?'}
              </h3>
              <p className="text-dark-400 text-sm mb-6">
                Are you sure you want to delete this {chat.isGroupChat ? 'group' : 'conversation'}? 
                <br />
                <span className="font-semibold text-white">{chatName}</span>?
                <br /> 
                This action cannot be undone and all messages will be lost.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="btn-danger flex-1 bg-red-600 hover:bg-red-700 text-white border-none"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBox;


