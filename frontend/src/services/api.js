import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 
    'Content-Type': 'application/json' 
  },
  timeout: 30000,
});

let isRedirecting = false;

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject({
        ...error,
        message: 'Network error. Please check your connection.',
      });
    }
    if (error.response?.status === 401 && !isRedirecting) {
      isRedirecting = true;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const publicPaths = ['/login', '/register', '/verify-email', '/verify-otp', '/forgot-password'];
      if (!publicPaths.includes(window.location.pathname)) {
        window.location.href = '/login';
      }
      setTimeout(() => { isRedirecting = false; }, 2000);
    }
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      error.message = `Too many requests. Try again ${retryAfter ? `in ${retryAfter}s` : 'later'}.`;
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verify2FA: (data) => api.post('/auth/verify-2fa', data),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  resendVerification: (data) => api.post('/auth/resend-verification', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  toggle2FA: () => api.post('/auth/toggle-2fa'),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export const userAPI = {
  getUsers: (search = '', signal) =>
    api.get(`/users?search=${encodeURIComponent(search)}`, { signal }),
  getUserById: (id) => api.get(`/users/${id}`),
  updateProfile: (data) => api.put('/users/profile', data),
  updateAvatar: (formData) =>
    api.put('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  changePassword: (data) => api.put('/users/change-password', data),
  deleteAccount: (password) => api.delete('/users/delete-account', {data: {password}}),
  getOnlineUsers: () => api.get('/users/online'),
};

export const chatAPI = {
  getChats: () => api.get('/chats'),
  accessChat: (userId) => api.post('/chats', { userId }),
  createGroupChat: (data) => api.post('/chats/group', data),
  updateGroupChat: (id, data) => api.put(`/chats/group/${id}`, data),
  updateGroupAvatar: (id, formData) =>
    api.put(`/chats/group/${id}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  addToGroup: (id, userId) => api.put(`/chats/group/${id}/add`, { userId }),
  removeFromGroup: (id, userId) => api.put(`/chats/group/${id}/remove`, { userId }),
  deleteChat: (id) => api.delete(`/chats/${id}`),
  addAdmin: (id, userId) => api.put(`/chats/group/${id}/add-admin`, { userId }),
  removeAdmin: (id, userId) => api.put(`/chats/group/${id}/remove-admin`, { userId }),
};

export const messageAPI = {
  getMessages: (chatId, page = 1, limit = 50) =>
    api.get(`/messages/${chatId}?page=${page}&limit=${limit}`),
  sendMessage: (formData) =>
    api.post('/messages', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),
  deleteForMe: (id) => api.delete(`/messages/${id}/delete-for-me`),
  deleteForEveryone: (id) => api.delete(`/messages/${id}/delete-for-everyone`),
  updateStatus: (id, status) => api.put(`/messages/${id}/status`, { status }),
  markChatAsSeen: (chatId) => api.put(`/messages/chat/${chatId}/seen`),
};

export default api;
