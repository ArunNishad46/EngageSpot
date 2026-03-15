import { memo, useMemo } from 'react';
import { useSocket } from '../context/SocketContext';
import { formatTime } from '../utils/formatTime';
import {
  FiUsers, FiCheck, FiCheckCircle, FiImage,
  FiVideo, FiMic, FiFile,
} from 'react-icons/fi';

const ChatListItem = memo(({ chat, isSelected, currentUser, onClick }) => {
  const { isUserOnline, typingUsers } = useSocket();

  const otherUser = useMemo(() => {
    if (chat.isGroupChat) return null;
    // Find the user that is NOT me
    const found = chat.users.find((u) => u._id !== currentUser._id);

    // If found is undefined (user deleted), return a placeholder
    return found || {
      name: "Deleted Account",
      avatar: { url: "https://ui-avatars.com/api/?name=Deleted&background=cbd5e1&color=fff" },
      _id: "deleted",
      isDeleted: true // Flag to disable clicking
    };
  }, [chat, currentUser._id]);

  const chatName = chat.isGroupChat ? chat.chatName : otherUser?.name;

  const avatarUrl = chat.isGroupChat
    ? chat.groupAvatar?.url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.chatName || 'G')}&background=334155&color=94a3b8`
    : otherUser?.avatar?.url;

  const isOnline = !chat.isGroupChat && !otherUser.isDeleted && otherUser._id && isUserOnline(otherUser._id);
  const isTyping = typingUsers[chat._id];

  const messagePreview = useMemo(() => {
    if (isTyping) {
      return (
        <span className="text-primary-400 italic">
          {chat.isGroupChat ? `${isTyping.userName} is typing...` : 'typing...'}
        </span>
      );
    }
    const msg = chat.latestMessage;
    if (!msg) return <span className="text-dark-400 italic">No messages yet</span>;
    if (msg.deletedForEveryone) return <span className="italic text-dark-400">Message deleted</span>;

    const prefix =
      msg.sender?._id === currentUser._id
        ? 'You: '
        : chat.isGroupChat && msg.sender?.name
        ? `${msg.sender.name.split(' ')[0]}: `
        : '';

    const typeIcons = {
      image: <><FiImage size={13} /> Photo</>,
      video: <><FiVideo size={13} /> Video</>,
      audio: <><FiMic size={13} /> Audio</>,
      file: <><FiFile size={13} /> {msg.file?.name || 'File'}</>,
    };

    if (typeIcons[msg.messageType]) {
      return <span className="flex items-center gap-1">{prefix}{typeIcons[msg.messageType]}</span>;
    }

    const text = msg.content || '';
    return prefix + (text.length > 35 ? text.slice(0, 35) + '…' : text);
  }, [chat, currentUser._id, isTyping]);

  const statusIcon = useMemo(() => {
    const msg = chat.latestMessage;
    if (!msg || msg.sender?._id !== currentUser._id) return null;
    if (msg.status === 'seen')
      return <FiCheckCircle size={13} className="text-primary-400" />;
    if (msg.status === 'delivered')
      return (
        <span className="flex">
          <FiCheck size={13} className="text-dark-400" />
          <FiCheck size={13} className="text-dark-400 -ml-1.5" />
        </span>
      );
    return <FiCheck size={13} className="text-dark-400" />;
  }, [chat.latestMessage, currentUser._id]);

  return (
    <button
      onClick={() => onClick(chat)}
      className={`
        w-full flex items-center gap-3 px-4 py-2 text-left transition-default group
        ${isSelected
          ? 'bg-primary-600/10 border-l-3 border-primary-500'
          : 'hover:bg-dark-200/30 border-l-3 border-transparent'
        }
      `}
      role="option"
      aria-selected={isSelected}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <img
          src={avatarUrl}
          alt={chatName}
          className={`avatar-lg transition-default rounded-full ${
            isSelected
              ? 'ring-2 ring-primary-500/50'
              : 'ring-2 ring-transparent group-hover:ring-dark-300/50'
          }`}
          loading="lazy"
        />
        {chat.isGroupChat ? (
          <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-dark-200 rounded-full flex items-center justify-center ring-2 ring-dark-100">
            <FiUsers size={10} className="text-dark-400" />
          </span>
        ) : isOnline ? (
          <span className="status-dot status-online" />
        ) : null}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h3
            className={`font-semibold text-sm truncate ${
              isSelected ? 'text-primary-300' : 'text-white'
            }`}
          >
            {chatName}
          </h3>
          <span className="text-[11px] text-dark-400 shrink-0 ml-2 font-medium">
            {chat.latestMessage?.createdAt
              ? formatTime(chat.latestMessage.createdAt)
              : formatTime(chat.createdAt)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-dark-400 truncate flex-1">
            {messagePreview}
          </p>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {statusIcon}
          </div>
        </div>
      </div>
    </button>
  );
});

ChatListItem.displayName = 'ChatListItem';

const ChatList = ({ chats, selectedChat, onSelectChat, currentUser }) => (
  <div className="divide-y divide-dark-200/30" role="listbox">
    {chats.map((chat) => (
      <ChatListItem
        key={chat._id}
        chat={chat}
        isSelected={selectedChat?._id === chat._id}
        currentUser={currentUser}
        onClick={onSelectChat}
      />
    ))}
  </div>
);

export default memo(ChatList);

