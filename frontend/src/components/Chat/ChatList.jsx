import React, { useState, useEffect } from 'react';
import { chats } from '../../services/api';
import socketService from '../../services/socket';
import './Chat.css';

const ChatList = ({ activeChat, onSelectChat }) => {
  const [chatList, setChatList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    loadChats();

    socketService.on('users:online', (users) => {
      setOnlineUsers(users);
    });

    socketService.on('message:new', (message) => {
      setChatList(prev => prev.map(chat => 
        chat._id === message.chat
          ? { ...chat, lastMessage: message, updatedAt: new Date() }
          : chat
      ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
    });

    return () => {
      socketService.off('users:online');
      socketService.off('message:new');
    };
  }, []);

  const loadChats = async () => {
    try {
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
      return chat.name;
    }
    // Для личных чатов показываем имя собеседника
    const otherParticipant = chat.participants.find(p => p._id !== JSON.parse(localStorage.getItem('user')).id);
    return otherParticipant?.username || 'Без имени';
  };

  const getLastMessage = (chat) => {
    if (!chat.lastMessage) return 'Нет сообщений';
    const sender = chat.lastMessage.sender?.username || '';
    return chat.type === 'group' && sender 
      ? `${sender}: ${chat.lastMessage.content}`
      : chat.lastMessage.content;
  };

  const getTime = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    
    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    
    return messageDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };

  if (loading) {
    return <div className="chat-list-loading">Загрузка...</div>;
  }

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <h2>Чаты</h2>
        <button className="new-chat-btn">+</button>
      </div>
      
      <div className="chat-list-search">
        <input type="text" placeholder="Поиск..." />
      </div>
      
      <div className="chat-list-items">
        {chatList.map(chat => {
          const isOnline = chat.type === 'private' && onlineUsers.includes(
            chat.participants.find(p => p._id !== JSON.parse(localStorage.getItem('user')).id)?._id
          );
          
          return (
            <div
              key={chat._id}
              className={`chat-item ${activeChat === chat._id ? 'active' : ''}`}
              onClick={() => onSelectChat(chat)}
            >
              <div className="chat-avatar">
                {chat.type === 'group' ? '👥' : '👤'}
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
                  {getLastMessage(chat)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatList;