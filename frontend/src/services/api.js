import axios from 'axios';

const API_URL = 'https://teleraga-api.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const auth = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const chats = {
  getAll: () => api.get('/chats'),
  getPrivate: (userId) => api.post('/chats/private', { userId }),
  createGroup: (data) => api.post('/chats/group', data), // НОВЫЙ МЕТОД
  getById: (chatId) => api.get(`/chats/${chatId}`),
  addParticipants: (chatId, userIds) => api.post(`/chats/${chatId}/participants`, { userIds }), // НОВЫЙ МЕТОД
  removeParticipant: (chatId, userId) => api.delete(`/chats/${chatId}/participants/${userId}`), // НОВЫЙ МЕТОД
  updateGroup: (chatId, data) => api.put(`/chats/${chatId}`, data), // НОВЫЙ МЕТОД
};

export const messages = {
  getByChat: (chatId, page = 1) => api.get(`/messages/${chatId}?page=${page}`),
  send: (data) => api.post('/messages', data), // НОВЫЙ МЕТОД для файлов
  markAsRead: (chatId) => api.post(`/messages/read/${chatId}`),
  delete: (messageId) => api.delete(`/messages/${messageId}`),
};

export const users = {
  search: (query) => api.get(`/users/search?query=${encodeURIComponent(query)}`),
  getById: (userId) => api.get(`/users/${userId}`),
};

export default api;