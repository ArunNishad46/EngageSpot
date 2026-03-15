import { useState } from 'react';
import ChatList from '../ChatList';
import SettingsModal from '../modals/SettingsModal';
import NewChatModal from '../modals/NewChatModal';
import NewGroupModal from '../modals/NewGroupModal';
import {
  FiSettings, FiPlus, FiUsers,
  FiMessageSquare, FiSearch, FiX,
} from 'react-icons/fi';

const Sidebar = ({
  chats, selectedChat, loading, currentUser,
  onSelectChat, onNewChat, onClose, isMobile,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [chatSearch, setChatSearch] = useState('');

  const filteredChats = chats.filter((chat) => {
    if (!chatSearch.trim()) return true;
    const q = chatSearch.toLowerCase();
    if (chat.isGroupChat) return chat.chatName?.toLowerCase().includes(q);
    const other = chat.users.find((u) => u._id !== currentUser._id);
    return other?.name?.toLowerCase().includes(q) || other?.email?.toLowerCase().includes(q);
  });

  return (
    <>
      <div
        className={`
          ${isMobile ? 'w-full' : 'w-80 xl:w-92'}
          bg-dark-100 border-r border-dark-200/50 flex flex-col h-full
          transition-slow
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-dark-200/50 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className='flex items-center gap-1'>
              <div 
                className="w-6 h-6 rounded-md gradient-primary flex items-center justify-center shadow-glow-primary"
              >
                <FiMessageSquare size={15} className="text-white animate-pulse" />
              </div>
              <h1 className="text-xl font-bold gradient-text-primary">
                EngageSpot
              </h1>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings(true)}
                className="btn-ghost"
                aria-label="Settings"
                data-tooltip="Settings"
              >
                <FiSettings size={20} />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewChat(true)}
              className="btn-primary flex-1 py-2.5 text-sm"
            >
              <FiPlus size={16} />
              New Chat
            </button>
            <button
              onClick={() => setShowNewGroup(true)}
              className="btn-secondary flex-1 py-2.5 text-sm"
            >
              <FiUsers size={16} />
              New Group
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400"
              size={16}
            />
            <input
              type="text"
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              placeholder="Search conversations..."
              className="input-field pl-9 pr-8"
            />
            {chatSearch && (
              <button
                onClick={() => setChatSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors-fast"
              >
                <FiX size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="skeleton skeleton-avatar" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton skeleton-text w-3/4" />
                    <div className="skeleton skeleton-text skeleton-text-sm" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="empty-state">
              <FiMessageSquare className="empty-state-icon" />
              <p className="font-medium text-sm">
                {chatSearch ? 'No results found' : 'No chats yet'}
              </p>
              <p className="text-xs mt-1">
                {chatSearch ? 'Try a different search' : 'Start a new conversation'}
              </p>
            </div>
          ) : (
            <ChatList
              chats={filteredChats}
              selectedChat={selectedChat}
              onSelectChat={onSelectChat}
              currentUser={currentUser}
            />
          )}
        </div>

        {/* User Profile Footer */}
        <div className="p-1 border-t border-dark-200/50 shrink-0">
          <button
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-dark-200/50 transition-default"
          >
            <div className="relative shrink-0">
              <img
                src={currentUser?.avatar?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'U')}&background=0284c7&color=fff`}
                alt={currentUser?.name}
                className="avatar ring-2 ring-dark-200"
              />
              <span className="status-dot status-online" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="font-medium text-white text-sm truncate">
                {currentUser?.name}
              </p>
              <p className="text-xs text-dark-400 truncate">
                {currentUser?.email}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Modals */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onChatCreated={onNewChat}
        />
      )}
      {showNewGroup && (
        <NewGroupModal
          onClose={() => setShowNewGroup(false)}
          onGroupCreated={onNewChat}
        />
      )}
    </>
  );
};

export default Sidebar;