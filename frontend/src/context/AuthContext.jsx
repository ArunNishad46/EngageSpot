import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [require2FA, setRequire2FA] = useState(false);
  const [pending2FAUserId, setPending2FAUserId] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const { data } = await authAPI.getMe();
          setUser(data.user);
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const register = useCallback(async (formData) => {
    try {
      const { data } = await authAPI.register(formData);
      toast.success(data.message);
      return { success: true, userId: data.userId, requireVerification: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, message };
    }
  }, []);

  const login = useCallback(async (formData) => {
    try {
      const { data } = await authAPI.login(formData);
      if (data.require2FA) {
        setRequire2FA(true);
        setPending2FAUserId(data.userId);
        toast.success(data.message);
        return { success: true, require2FA: true, userId: data.userId };
      }
      if (data.requireVerification) {
        toast.error('Please verify your email first');
        return { success: true, requireVerification: true, userId: data.userId };
      }
      localStorage.setItem('token', data.token);
      setUser(data.user);
      toast.success(data.message);
      return { success: true, user: data.user };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, message };
    }
  }, []);

  const verify2FA = useCallback(async (code) => {
    try {
      const { data } = await authAPI.verify2FA({ userId: pending2FAUserId, code });
      localStorage.setItem('token', data.token);
      setUser(data.user);
      setRequire2FA(false);
      setPending2FAUserId(null);
      toast.success(data.message);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Verification failed';
      toast.error(message);
      return { success: false, message };
    }
  }, [pending2FAUserId]);

  const verifyEmail = useCallback(async (code, userId) => {
    try {
      const { data } = await authAPI.verifyEmail({ code, userId });
      localStorage.setItem('token', data.token);
      setUser(data.user);
      toast.success(data.message || 'Email verified!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Verification failed';
      toast.error(message);
      return { success: false, message };
    }
  }, []);

  const resendVerification = useCallback(async (userId) => {
    try {
      const { data } = await authAPI.resendVerification({ userId });
      toast.success(data.message || 'Code sent!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send code';
      toast.error(message);
      return { success: false, message };
    }
  }, []);

  const logout = useCallback(async (showToast = true) => {
    try { await authAPI.logout(); } catch {}
    finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      if(showToast) toast.success('Logged out successfully');
    }
  }, []);

  const updateUser = useCallback((userData) => {
    setUser((prev) => ({ ...prev, ...userData }));
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, require2FA, pending2FAUserId,
      register, login, verify2FA, verifyEmail, resendVerification,
      logout, updateUser, setRequire2FA,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

