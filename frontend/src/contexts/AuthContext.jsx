import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from '../services/api';
import socketService from '../services/socket';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      socketService.connect(token);
    }
    
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await auth.login({ email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setUser(user);
      socketService.connect(token);
      
      return { success: true };
    } catch (error) {
      setError(error.response?.data?.error || 'Ошибка входа');
      return { success: false, error: error.response?.data?.error };
    }
  };

  const register = async (username, email, password) => {
    try {
      setError(null);
      const response = await auth.register({ username, email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setUser(user);
      socketService.connect(token);
      
      return { success: true };
    } catch (error) {
      setError(error.response?.data?.error || 'Ошибка регистрации');
      return { success: false, error: error.response?.data?.error };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    socketService.disconnect();
    setUser(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};