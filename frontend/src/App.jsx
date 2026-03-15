import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ChatList from './components/Chat/ChatList';
import ChatWindow from './components/Chat/ChatWindow';
import UserSearch from './components/UserSearch/UserSearch';
import './App.css';

const ChatApp = () => {
  const { user, loading } = useAuth();
  const [activeChat, setActiveChat] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [showUserSearch, setShowUserSearch] = useState(false);

  const handleNewChat = (newChat) => {
    setShowUserSearch(false);
    if (newChat) {
      setActiveChat(newChat);
    }
  };

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
      {showUserSearch && (
        <UserSearch 
          onClose={handleNewChat}
          currentUser={user}
        />
      )}

      <ChatList 
        activeChat={activeChat?._id} 
        onSelectChat={setActiveChat} 
        user={user}
        onSearchClick={() => setShowUserSearch(true)}
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