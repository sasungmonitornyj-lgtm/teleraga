import React, { useState, useEffect } from 'react';
import { chats } from '../../services/api';
import socketService from '../../services/socket';
import './ChatList.css';

const ChatList = ({ activeChat, onSelectChat, user, onSearchClick }) => {
  const [chatList, setChatList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    loadChats();

    socketService.on('users:online', (users) => {
      setOnlineUsers(users);
    });

    socketService.on('message:new', (message) => {
      setChatList(prev => {
        const updated = prev.map(chat => 
          chat._id === message.chat
            ? { ...chat, lastMessage: message, updatedAt: new Date() }
            : chat
        );
        // Сортируем по последнему сообщению
        return updated.sort((a, b) => 
          new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
        );
      });
    });

    return () => {
      socketService.off('users:online');
      socketService.off('message:new');
    };
  }, []);


  const loadChats = async () => {
    try {
      setLoading(true);
      const response = await chats.getAll();
      setChatList(response.data);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChatName = (chat) => {
    if (chat.type === 'group') {
      return chat.name || 'Групповой чат';
    }
    const otherParticipant = chat.participants?.find(p => p._id !== user?.id);
    return otherParticipant?.username || 'Пользователь';
  };

  const getChatAvatar = (chat) => {
    if (chat.type === 'group') {
      return chat.avatar || '👥';
    }
    const otherParticipant = chat.participants?.find(p => p._id !== user?.id);
    return otherParticipant?.avatar || '👤';
  };

  const getLastMessage = (chat) => {
    if (!chat.lastMessage) return 'Нет сообщений';
    
    const sender = chat.lastMessage.sender?.username || '';
    const content = chat.lastMessage.content || '';
    const isMe = chat.lastMessage.sender?._id === user?.id;
    
    if (chat.type === 'group' && sender && !isMe) {
      return `${sender}: ${content}`;
    }
    if (isMe) {
      return `Вы: ${content}`;
    }
    return content;
  };

  const getTime = (date) => {
    if (!date) return '';
    
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    } else {
      return messageDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }
  };

  const filteredChats = chatList.filter(chat => 
    getChatName(chat).toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="chat-list">
        <div className="chat-list-header">
          <h2>Чаты</h2>
          <button className="new-chat-btn" onClick={() => onSearchClick()} title="Новый чат">
  <svg viewBox="0 0 24 24" width="24" height="24">
    <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
  </svg>
</button>
        </div>
        <div className="chat-list-loading">
          <div className="loading-spinner"></div>
          <p>Загрузка чатов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <div className="header-left">
          <h2>Telerag</h2>
        </div>
        <div className="header-right">
          <button className="new-chat-btn" title="Новый чат">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div className="chat-list-search">
        <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input 
          type="text" 
          placeholder="Поиск или новый чат" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="chat-list-items">
        {filteredChats.length === 0 ? (
          <div className="no-chats">
            <p>Чатов пока нет</p>
            <button className="start-chat-btn">Написать сообщение</button>
          </div>
        ) : (
          filteredChats.map(chat => {
            const isOnline = chat.type === 'private' && onlineUsers.includes(
              chat.participants?.find(p => p._id !== user?.id)?._id
            );
            
            return (
              <div
                key={chat._id}
                className={`chat-item ${activeChat === chat._id ? 'active' : ''}`}
                onClick={() => onSelectChat(chat)}
              >
                <div className="chat-avatar">
                  <span className="avatar-text">{getChatAvatar(chat)}</span>
                  {isOnline && <span className="online-dot" />}
                </div>
                
                <div className="chat-info">
                  <div className="chat-info-header">
                    <span className="chat-name">{getChatName(chat)}</span>
                    <span className="chat-time">
                      {getTime(chat.updatedAt || chat.createdAt)}
                    </span>
                  </div>
                  
                  <div className="chat-last-message">
                    <span className="message-text">{getLastMessage(chat)}</span>
                    {chat.unreadCount > 0 && (
                      <span className="unread-badge">{chat.unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatList;
