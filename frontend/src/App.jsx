import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ChatList from './components/Chat/ChatList';
import ChatWindow from './components/Chat/ChatWindow';
import UserSearch from './components/UserSearch/UserSearch';
import CreateGroup from './components/Group/CreateGroup';
import './App.css';

const ChatApp = () => {
  const { user, loading } = useAuth();
  const [activeChat, setActiveChat] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showChatList, setShowChatList] = useState(true);

  // Определяем, телефон ли это
  const isMobile = window.innerWidth <= 768;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        // Телефон
        if (activeChat) {
          setShowChatList(false);
        }
      } else {
        // Компьютер
        setShowChatList(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [activeChat]);

  const handleSelectChat = (chat) => {
    setActiveChat(chat);
    if (isMobile) {
      setShowChatList(false);
    }
  };

  const handleBackToList = () => {
    setShowChatList(true);
  };

  const handleNewChat = (newChat) => {
    setShowUserSearch(false);
    setShowCreateGroup(false);
    if (newChat) {
      setActiveChat(newChat);
      if (isMobile) {
        setShowChatList(false);
      }
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

      {showCreateGroup && (
        <CreateGroup 
          onClose={handleNewChat}
          currentUser={user}
        />
      )}

      <div className={`chat-list ${!showChatList ? 'hidden' : ''}`}>
        <ChatList 
          activeChat={activeChat?._id} 
          onSelectChat={handleSelectChat} 
          user={user}
          onSearchClick={() => setShowUserSearch(true)}
          onGroupClick={() => setShowCreateGroup(true)}
        />
      </div>
      
      {activeChat && (
        <ChatWindow 
          chat={activeChat} 
          user={user}
          onBack={handleBackToList} // ← ЭТО САМОЕ ВАЖНОЕ!
        />
      )}
      
      {!activeChat && !isMobile && (
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
