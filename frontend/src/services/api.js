import axios from 'axios';

const API_URL = 'https://teleraga-api.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ЭТО САМОЕ ВАЖНОЕ - добавляет токен к каждому запросу
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log('🔑 Token from localStorage:', token ? 'есть' : 'нет'); // для отладки
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log('🚫 401 ошибка - токен недействителен');
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
  createGroup: (data) => api.post('/chats/group', data),
  getById: (chatId) => api.get(`/chats/${chatId}`),
  addParticipants: (chatId, userIds) => api.post(`/chats/${chatId}/participants`, { userIds }),
};

export const messages = {
  getByChat: (chatId, page = 1) => api.get(`/messages/${chatId}?page=${page}`),
  markAsRead: (chatId) => api.post(`/messages/read/${chatId}`),
  delete: (messageId) => api.delete(`/messages/${messageId}`),
};

export const users = {
  search: (query) => {
    console.log('🔍 Searching for:', query);
    return api.get(`/users/search?query=${encodeURIComponent(query)}`);
  },
  getById: (userId) => api.get(`/users/${userId}`),
};

export default api;
