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
  const [recording, setRecording] = useState(false);
  const [recordingType, setRecordingType] = useState(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false); // Для меню на телефоне
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setShowAttachMenu(false);

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

  const startVideoRecording = async () => {
    setShowAttachMenu(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      const videoElement = document.createElement('video');
      videoElement.srcObject = stream;
      videoElement.autoplay = true;
      videoElement.muted = true;
      videoElement.style.position = 'fixed';
      videoElement.style.top = '10px';
      videoElement.style.right = '10px';
      videoElement.style.width = '100px';
      videoElement.style.height = '100px';
      videoElement.style.borderRadius = '50%';
      videoElement.style.objectFit = 'cover';
      videoElement.style.zIndex = '1000';
      videoElement.style.border = '2px solid #0088cc';
      videoElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
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
        
        document.body.removeChild(videoElement);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setRecordingType('video');

      setTimeout(() => {
        if (recorder.state === 'recording') {
          stopRecording();
        }
      }, 30000);

    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Не удалось получить доступ к камере');
    }
  };

  const startVoiceRecording = async () => {
    setShowAttachMenu(false);
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
      setRecordingType('audio');

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
      setRecordingType(null);
    }
  };

  const getChatName = () => {
    if (!chat) return 'Чат';
    if (chat.type === 'group') return chat.name || 'Групповой чат';
    const other = chat.participants?.find(p => p._id !== user.id);
    return other?.username || 'Чат';
  };

  // Определяем, телефон ли это
  const isMobile = window.innerWidth <= 768;

  if (!chat) return null;

  return (
    <div className="chat-window">
      <div className="chat-window-header">
        <div className="chat-header-info">
         {onBack && (
  <button className="back-button" onClick={onBack}>
    <svg width="20" height="20" viewBox="0 0 24 24">
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
            <svg width="16" height="16" viewBox="0 0 24 24" style={{ marginRight: '4px' }}>
              <path fill="currentColor" d="M6 6h12v12H6z"/>
            </svg>
            {recordingType === 'video' ? 'Стоп' : 'Стоп'}
          </button>
        ) : (
          <>
            {isMobile ? (
              // Для телефонов - компактная версия
              <>
                <button 
                  className="action-btn"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  disabled={uploading}
                  title="Прикрепить"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
                  </svg>
                </button>

                {showAttachMenu && (
                  <div className="attach-menu">
                    <button onClick={startVideoRecording} className="attach-menu-item">
                      <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                      </svg>
                      Видео
                    </button>
                    <button onClick={startVoiceRecording} className="attach-menu-item">
                      <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                      </svg>
                      Аудио
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="attach-menu-item">
                      <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
                      </svg>
                      Файл
                    </button>
                  </div>
                )}
              </>
            ) : (
              // Для компьютеров - все кнопки сразу
              <>
                <button 
                  className="action-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title="Прикрепить файл"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
                  </svg>
                </button>
                
                <button 
                  className="action-btn"
                  onClick={startVideoRecording}
                  title="Видеосообщение"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                  </svg>
                </button>
                
                <button 
                  className="action-btn"
                  onClick={startVoiceRecording}
                  title="Голосовое сообщение"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                  </svg>
                </button>
              </>
            )}
          </>
        )}
        
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage(e)}
          placeholder={isMobile ? "Сообщение" : "Написать сообщение..."}
          autoComplete="off"
          disabled={uploading || recording}
          className="message-input"
        />
        
        <button 
          onClick={sendMessage} 
          disabled={!input.trim() || uploading || recording}
          className="send-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
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
