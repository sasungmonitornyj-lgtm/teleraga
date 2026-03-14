import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ChatList from './components/Chat/ChatList';
import ChatWindow from './components/Chat/ChatWindow';
import './App.css';

const ChatApp = () => {
  const { user, loading } = useAuth();
  const [activeChat, setActiveChat] = useState(null);
  const [authMode, setAuthMode] = useState('login');

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
        user={user}
      />
      {activeChat ? (
        <ChatWindow chat={activeChat} user={user} />
      ) : (
        <div className="welcome-screen">
          <h1>Добро пожаловать, {user.username}!</h1>
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
