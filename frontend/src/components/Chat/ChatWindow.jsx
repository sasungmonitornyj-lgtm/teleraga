import React, { useState, useEffect, useRef } from 'react';
import { messages } from '../../services/api';
import socketService from '../../services/socket';
import Message from './Message';
import './Chat.css';

const ChatWindow = ({ chat, user }) => {
  const [messageList, setMessageList] = useState([]);
  const [input, setInput] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [typing, setTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // ОЧИЩАЕМ СООБЩЕНИЯ ПРИ СМЕНЕ ЧАТА
  useEffect(() => {
    setMessageList([]); // ← Очищаем старые сообщения
    setPage(1); // ← Сбрасываем страницу
    setHasMore(true); // ← Сбрасываем пагинацию
    loadMessages(); // ← Загружаем новые
    
    return () => {
      // Очищаем таймеры при размонтировании
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [chat._id]); // ← Следим за ID чата

  useEffect(() => {
    if (!chat?._id) return;

    socketService.on('message:new', (message) => {
      console.log('📨 Новое сообщение:', message);
      if (message.chat === chat._id) {
        setMessageList(prev => [...prev, message]);
        socketService.emit('messages:read', { 
          chatId: chat._id, 
          messageIds: [message._id] 
        });
      }
    });

    socketService.on('typing:start', ({ userId, username, chatId }) => {
      if (chatId === chat._id && userId !== user.id) {
        setTyping(username);
      }
    });

    socketService.on('typing:stop', ({ userId, chatId }) => {
      if (chatId === chat._id && userId !== user.id) {
        setTyping(false);
      }
    });

    return () => {
      socketService.off('message:new');
      socketService.off('typing:start');
      socketService.off('typing:stop');
    };
  }, [chat._id, user.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messageList]);

  const loadMessages = async () => {
    try {
      const response = await messages.getByChat(chat._id, page);
      setMessageList(prev => [...response.data.messages, ...prev]);
      setHasMore(response.data.hasMore);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const loadMoreMessages = async () => {
    const nextPage = page + 1;
    try {
      const response = await messages.getByChat(chat._id, nextPage);
      setMessageList(prev => [...response.data.messages, ...prev]);
      setHasMore(response.data.hasMore);
      setPage(nextPage);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = (isTyping) => {
    if (isTyping) {
      socketService.emit('typing:start', { chatId: chat._id });
    } else {
      socketService.emit('typing:stop', { chatId: chat._id });
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    handleTyping(true);
    
    typingTimeoutRef.current = setTimeout(() => {
      handleTyping(false);
    }, 1000);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (input.trim()) {
      socketService.emit('message:send', {
        chatId: chat._id,
        content: input,
        type: 'text'
      });
      setInput('');
      handleTyping(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result;
      
      let messageType = 'file';
      if (file.type.startsWith('image/')) {
        messageType = 'image';
      }

      socketService.emit('message:send', {
        chatId: chat._id,
        content: file.name,
        type: messageType,
        fileUrl: base64,
        fileName: file.name,
        fileSize: file.size
      });

      setUploading(false);
    };
  };

  const getChatName = () => {
    if (!chat) return 'Чат';
    if (chat.type === 'group') return chat.name || 'Групповой чат';
    const other = chat.participants?.find(p => p._id !== user.id);
    return other?.username || 'Чат';
  };

  // Если нет чата, ничего не показываем
  if (!chat) return null;

  return (
    <div className="chat-window">
      <div className="chat-window-header">
        <div className="chat-header-info">
          <h3>{getChatName()}</h3>
          {chat.type === 'group' && (
            <span className="chat-type">
              {chat.participants?.length || 0} участников
            </span>
          )}
        </div>
      </div>

      <div className="messages-container">
        {hasMore && messageList.length > 0 && (
          <button onClick={loadMoreMessages} className="load-more">
            Загрузить ещё
          </button>
        )}
        
        {messageList.map((msg) => (
          <Message 
            key={msg._id}
            message={msg}
            isOwn={msg.sender?._id === user.id}
          />
        ))}
        
        {typing && (
          <div className="typing-indicator">
            {typing} печатает...
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="message-input-form">
        <button 
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? '⏳' : '📎'}
        </button>
        
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage(e)}
          placeholder="Написать сообщение..."
          autoComplete="off"
          disabled={uploading}
        />
        
        <button 
          onClick={sendMessage} 
          disabled={!input.trim() || uploading}
          className="send-btn"
        >
          Отправить
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};

export default ChatWindow;
