import React, { useState, useEffect, useRef } from 'react';
import { messages } from '../../services/api';
import socketService from '../../services/socket';
import Message from './Message';
import './Chat.css';

const ChatWindow = ({ chat, user, onBack }) => {
  const [messageList, setMessageList] = useState([]);
  const [input, setInput] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [typing, setTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false); // Для записи голоса
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null); // Для кружков

  useEffect(() => {
    setMessageList([]);
    setPage(1);
    setHasMore(true);
    loadMessages();
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [chat._id]);

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

  // Загрузка файлов
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

  // ЗАПИСЬ КРУЖКОВ (видео)
  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      // Создаем элемент видео для превью
      const videoElement = document.createElement('video');
      videoElement.srcObject = stream;
      videoElement.autoplay = true;
      videoElement.muted = true;
      videoElement.style.position = 'fixed';
      videoElement.style.top = '10px';
      videoElement.style.right = '10px';
      videoElement.style.width = '120px';
      videoElement.style.height = '120px';
      videoElement.style.borderRadius = '50%';
      videoElement.style.objectFit = 'cover';
      videoElement.style.zIndex = '1000';
      videoElement.style.border = '3px solid var(--primary-color)';
      document.body.appendChild(videoElement);

      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => {
          socketService.emit('message:send', {
            chatId: chat._id,
            content: 'Видеосообщение',
            type: 'video',
            fileUrl: reader.result,
            fileName: 'video.webm',
            fileSize: blob.size
          });
        };
        
        // Удаляем превью
        document.body.removeChild(videoElement);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);

      // Останавливаем через 30 секунд (макс длина кружка)
      setTimeout(() => {
        if (recorder.state === 'recording') {
          stopVideoRecording();
        }
      }, 30000);

    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Не удалось получить доступ к камере');
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  // ЗАПИСЬ ГОЛОСОВЫХ
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => {
          socketService.emit('message:send', {
            chatId: chat._id,
            content: 'Голосовое сообщение',
            type: 'voice',
            fileUrl: reader.result,
            fileName: 'voice.webm',
            fileSize: blob.size
          });
        };
        
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);

      // Останавливаем через 2 минуты
      setTimeout(() => {
        if (recorder.state === 'recording') {
          stopRecording();
        }
      }, 120000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Не удалось получить доступ к микрофону');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const getChatName = () => {
    if (!chat) return 'Чат';
    if (chat.type === 'group') return chat.name || 'Групповой чат';
    const other = chat.participants?.find(p => p._id !== user.id);
    return other?.username || 'Чат';
  };

  if (!chat) return null;

  return (
    <div className="chat-window">
      <div className="chat-window-header">
        <div className="chat-header-info">
          {onBack && (
            <button className="back-button" onClick={onBack}>
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
            </button>
          )}
          <div>
            <h3>{getChatName()}</h3>
            {chat.type === 'group' && (
              <span className="chat-type">
                {chat.participants?.length || 0} участников
              </span>
            )}
          </div>
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
        {recording ? (
          <button 
            className="stop-recording-btn"
            onClick={stopRecording}
          >
            ⏹️ Остановить
          </button>
        ) : (
          <>
            <button 
              className="attach-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Прикрепить файл"
            >
              {uploading ? '⏳' : '📎'}
            </button>
            
            <button 
              className="video-btn"
              onClick={startVideoRecording}
              title="Кружок (видео)"
            >
              📹
            </button>
            
            <button 
              className="voice-btn"
              onClick={startVoiceRecording}
              title="Голосовое сообщение"
            >
              🎤
            </button>
          </>
        )}
        
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage(e)}
          placeholder="Написать сообщение..."
          autoComplete="off"
          disabled={uploading || recording}
        />
        
        <button 
          onClick={sendMessage} 
          disabled={!input.trim() || uploading || recording}
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
