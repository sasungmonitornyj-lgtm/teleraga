import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ChatList from './components/Chat/ChatList';
import ChatWindow from './components/Chat/ChatWindow';
import socketService from './services/socket';
import './App.css';

const ChatApp = () => {
  const { user, loading } = useAuth();
  const [activeChat, setActiveChat] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'

  if (loading) {
    return <div className="loading-screen">Загрузка...</div>;
  }

  if (!user) {
    return authMode === 'login' ? (
      <Login onSwitch={() => setAuthMode('register')} />
    ) : (
      <Register onSwitch={() => setAuthMode('login')} />
    );
  }

  return (
    <div className="messenger-container">
      <ChatList 
        activeChat={activeChat?._id} 
        onSelectChat={setActiveChat} 
      />
      {activeChat ? (
        <ChatWindow chat={activeChat} />
      ) : (
        <div className="welcome-screen">
          <h1>Добро пожаловать в Telerag!</h1>
          <p>Выберите чат, чтобы начать общение</p>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ChatApp />
    </AuthProvider>
  );
}

export default App;
