import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import socketService from '../services/socket';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        socketService.connect(token);
      } catch (err) {
        console.error('Failed to restore session:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      setError('');
      const response = await fetch('https://teleraga-api.onrender.com/api/auth/login', {
        email,
        password
      });
      
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setUser(user);
      socketService.connect(token);
      
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || 'Ошибка входа';
      setError(message);
      return { success: false, error: message };
    }
  };

  const register = async (username, email, password) => {
    try {
      setError('');
      const response = await fetch('https://teleraga-api.onrender.com/api/auth/register', {
        username,
        email,
        password
      });
      
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setUser(user);
      socketService.connect(token);
      
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || 'Ошибка регистрации';
      setError(message);
      return { success: false, error: message };
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
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
