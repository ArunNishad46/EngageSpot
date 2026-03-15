import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userAPI, authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  FiX, FiUser, FiShield, FiEdit2, FiCamera,
  FiCheck, FiLogOut, FiEye, FiEyeOff, FiTrash2, FiAlertTriangle
} from 'react-icons/fi';

const SettingsModal = ({ onClose }) => {
  const { user, logout, updateUser } = useAuth();

  const [editProfile, setEditProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(user?.twoFactorEnabled || false);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassFields, setShowPassFields] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // ✅ NEW STATE
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileData.name.trim()) return toast.error('Name is required');
    try {
      setProfileLoading(true);
      const { data } = await userAPI.updateProfile(profileData);
      updateUser(data.user);
      toast.success('Profile updated');
      setEditProfile(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Update failed');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Select an image file');
    if (file.size > 5 * 1024 * 1024) return toast.error('Max 5MB allowed');
    try {
      setAvatarUploading(true);
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await userAPI.updateAvatar(formData);
      updateUser({ avatar: data.avatar });
      toast.success('Avatar updated');
    } catch {
      toast.error('Avatar upload failed');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleToggle2FA = async () => {
    try {
      setTwoFALoading(true);
      const { data } = await authAPI.toggle2FA();
      setTwoFAEnabled(data.twoFactorEnabled);
      updateUser({ twoFactorEnabled: data.twoFactorEnabled });
      toast.success(data.message);
    } catch {
      toast.error('Failed to toggle 2FA');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordData;
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    if (newPassword.length < 8) return toast.error('Min 8 characters required');
    try {
      setPasswordLoading(true);
      const { data } = await userAPI.changePassword({ currentPassword, newPassword });
      toast.success(data.message);
      setShowPassFields(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePassword) return toast.error('Please enter your password');

    setDeleteLoading(true);
    try {
      await userAPI.deleteAccount(deletePassword);
      toast.success('Account deleted successfully');
      onClose();
      setTimeout(() => {
        logout(false); // This will redirect to login
      }, 500)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete account');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button onClick={onClose} className="btn-ghost">
            <FiX size={20} />
          </button>
        </div>

        <div className="modal-body space-y-6">
          {/* ── Profile Section ── */}
          <section>
            <div className="section-header">
              <FiUser size={14} />
              Profile
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-4 mb-5">
              <div className="relative group shrink-0">
                <img
                  src={user?.avatar?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=0284c7&color=fff&size=80`}
                  alt={user?.name}
                  className="avatar-xl rounded-2xl ring-2 ring-dark-200"
                />
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 cursor-pointer transition-default">
                  {avatarUploading ? (
                    <div className="spinner spinner-sm" />
                  ) : (
                    <FiCamera size={22} className="text-white" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    disabled={avatarUploading}
                  />
                </label>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white truncate">{user?.name}</p>
                <p className="text-sm text-dark-400 truncate">{user?.email}</p>
              </div>
            </div>

            {/* Edit Profile */}
            {editProfile ? (
              <form onSubmit={handleUpdateProfile} className="space-y-3">
                <div>
                  <label className="text-sm text-dark-400 mb-1.5 block">Name</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData((p) => ({ ...p, name: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-dark-400 mb-1.5 block">Bio</label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData((p) => ({ ...p, bio: e.target.value }))}
                    rows={3}
                    maxLength={200}
                    className="input-field resize-none"
                  />
                  <p className="text-xs text-dark-400 mt-1 text-right">
                    {profileData.bio.length}/200
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={profileLoading} className="btn-primary">
                    {profileLoading ? (
                      <div className="spinner spinner-sm" />
                    ) : (
                      <><FiCheck size={14} /> Save</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditProfile(false);
                      setProfileData({ name: user?.name || '', bio: user?.bio || '' });
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <p className="text-dark-500 text-sm mb-3">
                  {user?.bio || 'No bio set'}
                </p>
                <button onClick={() => setEditProfile(true)} className="btn-secondary">
                  <FiEdit2 size={14} />
                  Edit Profile
                </button>
              </div>
            )}
          </section>

          <div className="dropdown-divider" />

          {/* ── Security Section ── */}
          <section>
            <div className="section-header">
              <FiShield size={14} />
              Security
            </div>

            {/* 2FA Toggle */}
            <div className="flex items-center justify-between p-4 card mb-4">
              <div>
                <p className="font-medium text-white text-sm">
                  Two-Factor Authentication
                </p>
                <p className="text-xs text-dark-400 mt-0.5">
                  Extra security for your account
                </p>
              </div>
              <button
                onClick={handleToggle2FA}
                disabled={twoFALoading}
                className={`toggle ${twoFAEnabled ? 'toggle-on' : 'toggle-off'}`}
                role="switch"
                aria-checked={twoFAEnabled}
                aria-label="Toggle two-factor authentication"
              >
                {twoFALoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="spinner spinner-sm" />
                  </div>
                ) : (
                  <span className="toggle-knob" />
                )}
              </button>
            </div>

            {/* Change Password */}
            {showPassFields ? (
              <form onSubmit={handleChangePassword} className="space-y-3">
                {['currentPassword', 'newPassword', 'confirmPassword'].map((field) => (
                  <div key={field}>
                    <label className="text-sm text-dark-400 mb-1.5 block capitalize">
                      {field.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData[field]}
                      onChange={(e) =>
                        setPasswordData((p) => ({ ...p, [field]: e.target.value }))
                      }
                      className="input-field"
                      required
                      minLength={field !== 'currentPassword' ? 8 : undefined}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors-fast"
                >
                  {showPassword ? <FiEyeOff size={12} /> : <FiEye size={12} />}
                  {showPassword ? 'Hide' : 'Show'} passwords
                </button>
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={passwordLoading} className="btn-primary">
                    {passwordLoading ? (
                      <div className="spinner spinner-sm" />
                    ) : (
                      'Update Password'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPassFields(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowPassFields(true)}
                className="btn-secondary w-full"
              >
                Change Password
              </button>
            )}
          </section>

          <div className="dropdown-divider" />

          {/* Logout */}
          <button onClick={logout} className="btn-danger w-full">
            <FiLogOut size={18} />
            Sign Out
          </button>

          {/* Delete Account */}
          <div className="pt-6 border-t border-dark-200/50">
            <h3 className="text-red-500 font-semibold mb-2">Danger Zone</h3>
            <p className="text-xs text-dark-400 mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-danger w-full flex items-center justify-center gap-2"
            >
              <FiTrash2 size={16} /> Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* ─── DELETE CONFIRMATION MODAL (Nested Overlay) ─── */}
      {showDeleteConfirm && (
        <div className="modal-overlay z-[60]" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content max-w-sm border-red-500/30" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiAlertTriangle size={32} className="text-red-500" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">Delete Account?</h3>
              <p className="text-dark-400 text-sm mb-6">
                Enter your password to confirm. <br/>
                <span className="text-red-400 font-medium">This action cannot be undone.</span>
              </p>

              <form onSubmit={handleDeleteAccount} className="space-y-4">
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field border-red-500/30 focus:border-red-500"
                  autoFocus
                  required
                />
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn-secondary flex-1"
                    disabled={deleteLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deleteLoading}
                    className="btn-danger flex-1 bg-red-600 hover:bg-red-700 text-white border-none"
                  >
                    {deleteLoading ? (
                      <div className="spinner spinner-sm" />
                    ) : (
                      'Delete Forever'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsModal;