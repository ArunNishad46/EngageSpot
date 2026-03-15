import { useState, useEffect } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { userAPI, chatAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiX, FiSearch, FiMessageSquare } from 'react-icons/fi';

const NewChatModal = ({ onClose, onChatCreated }) => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(null);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (!debouncedSearch.trim()) { setUsers([]); return; }
    const controller = new AbortController();
    const searchUsers = async () => {
      try {
        setLoading(true);
        const { data } = await userAPI.getUsers(debouncedSearch, controller.signal);
        setUsers(data.users);
      } catch (error) {
        if (error.name !== 'CanceledError') console.error(error);
      } finally {
        setLoading(false);
      }
    };
    searchUsers();
    return () => controller.abort();
  }, [debouncedSearch]);

  const handleStartChat = async (userId) => {
    try {
      setStarting(userId);
      const { data } = await chatAPI.accessChat(userId);
      onChatCreated(data.chat);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start chat');
    } finally {
      setStarting(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 className="text-lg font-bold text-white">New Conversation</h2>
          <button onClick={onClose} className="btn-ghost">
            <FiX size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-dark-200/50">
          <div className="relative">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="input-field pl-10"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto scrollbar-thin p-2">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="skeleton skeleton-avatar" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton skeleton-text w-3/4" />
                    <div className="skeleton skeleton-text skeleton-text-sm" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state py-10">
              <FiMessageSquare size={40} className="empty-state-icon" />
              <p className="text-sm">
                {search.trim() ? 'No users found' : 'Search for users to chat with'}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {users.map((u) => (
                <button
                  key={u._id}
                  onClick={() => handleStartChat(u._id)}
                  disabled={starting === u._id}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-dark-200/50 transition-default group disabled:opacity-50"
                >
                  <div className="relative shrink-0">
                    <img
                      src={u.avatar?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=0284c7&color=fff`}
                      alt={u.name}
                      className="avatar ring-2 ring-dark-200 group-hover:ring-primary-500/30 transition-default"
                    />
                    {u.isOnline && <span className="status-dot status-online" />}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-white text-sm truncate">{u.name}</p>
                    <p className="text-xs text-dark-400 truncate">{u.email}</p>
                  </div>
                  {starting === u._id ? (
                    <div className="spinner spinner-sm spinner-primary" />
                  ) : (
                    <FiMessageSquare
                      size={18}
                      className="text-dark-400 opacity-0 group-hover:opacity-100 transition-default"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;