import { useState, useEffect } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { userAPI, chatAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiX, FiSearch, FiPlus, FiUsers, FiArrowLeft } from 'react-icons/fi';

const NewGroupModal = ({ onClose, onGroupCreated }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (!debouncedSearch.trim()) { setUsers([]); return; }
    const controller = new AbortController();
    const searchUsers = async () => {
      try {
        setSearchLoading(true);
        const { data } = await userAPI.getUsers(debouncedSearch, controller.signal);
        setUsers(data.users.filter((u) => !selectedUsers.find((s) => s._id === u._id)));
      } catch (error) {
        if (error.name !== 'CanceledError') console.error(error);
      } finally {
        setSearchLoading(false);
      }
    };
    searchUsers();
    return () => controller.abort();
  }, [debouncedSearch, selectedUsers]);

  const handleCreate = async () => {
    if (!name.trim()) return toast.error('Group name required');
    if (selectedUsers.length < 1) return toast.error('select at least 1 member');
    try {
      setCreating(true);
      const { data } = await chatAPI.createGroupChat({
        name: name.trim(),
        description: description.trim(),
        users: selectedUsers.map((u) => u._id),
      });
      toast.success('Group created!');
      onGroupCreated(data.chat);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create group');
    } finally {
      setCreating(false);
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
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button onClick={() => setStep(1)} className="btn-ghost p-1.5">
                <FiArrowLeft size={18} />
              </button>
            )}
            <h2 className="text-lg font-bold text-white">
              {step === 1 ? 'Create Group' : 'Add Members'}
            </h2>
          </div>
          <button onClick={onClose} className="btn-ghost">
            <FiX size={20} />
          </button>
        </div>

        <div className="modal-body space-y-4">
          {step === 1 ? (
            <>
              {/* Group Name */}
              <div>
                <label className="text-sm text-dark-400 mb-1.5 block">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter group name"
                  className="input-field"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm text-dark-400 mb-1.5 block">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this group about?"
                  rows={2}
                  className="input-field resize-none"
                />
              </div>

              <button
                onClick={() => name.trim() ? setStep(2) : toast.error('Enter a group name')}
                className="btn-primary w-full"
              >
                Next — Add Members
              </button>
            </>
          ) : (
            <>
              {/* Selected Users Chips */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedUsers.map((u) => (
                    <span
                      key={u._id}
                      className="badge badge-primary gap-1.5 pl-1 pr-2 py-1 text-xs"
                    >
                      <img
                        src={u.avatar?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&size=20&background=0284c7&color=fff`}
                        alt=""
                        className="avatar-xs rounded-full"
                      />
                      {u.name}
                      <button
                        onClick={() =>
                          setSelectedUsers((p) => p.filter((s) => s._id !== u._id))
                        }
                        className="hover:text-white/80 transition-colors-fast"
                      >
                        <FiX size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Search Users */}
              <div className="relative">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users to add..."
                  className="input-field pl-10"
                />
              </div>

              {/* User Results */}
              {search.trim() && (
                <div className="max-h-48 overflow-y-auto scrollbar-thin card">
                  {searchLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="spinner spinner-lg spinner-primary" />
                    </div>
                  ) : users.length === 0 ? (
                    <p className="text-center text-dark-400 py-6 text-sm">
                      No users found
                    </p>
                  ) : (
                    <div className="divide-y divide-dark-200/50">
                      {users.map((u) => (
                        <button
                          key={u._id}
                          onClick={() => {
                            setSelectedUsers((p) => [...p, u]);
                            setSearch('');
                          }}
                          className="dropdown-item w-full"
                        >
                          <img
                            src={u.avatar?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&size=32&background=0284c7&color=fff`}
                            alt=""
                            className="avatar-sm rounded-full"
                          />
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-medium truncate">{u.name}</p>
                            <p className="text-xs text-dark-400 truncate">{u.email}</p>
                          </div>
                          <FiPlus className="text-primary-400" size={16} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Create Button */}
              <button
                onClick={handleCreate}
                disabled={creating || selectedUsers.length < 1}
                className="btn-primary w-full"
              >
                {creating ? (
                  <div className="spinner spinner-sm" />
                ) : (
                  <>
                    <FiUsers size={16} />
                    Create Group ({selectedUsers.length} members)
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewGroupModal;