import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { FaPhone, FaVideo, FaUserPlus, FaUsers } from 'react-icons/fa';
import './App.css';

// ЗАМЕНИ ЭТОТ URL НА ТВОЙ БЭКЕНД ПОСЛЕ ДЕПЛОЯ НА RENDER
const SOCKET_URL = 'https://teleraga-api.onrender.com';

const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  autoConnect: true
});

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chats, setChats] = useState([
    { id: 1, name: 'Личный чат', type: 'private', lastMessage: '' },
    { id: 2, name: 'Рабочая группа', type: 'group', lastMessage: '' },
    { id: 3, name: 'Друзья', type: 'group', lastMessage: '' }
  ]);
  const [activeChat, setActiveChat] = useState(1);
  const [inCall, setInCall] = useState(false);
  const [callType, setCallType] = useState(null);
  
  const myVideo = useRef();
  const userVideo = useRef();
  const peerRef = useRef();
  const [stream, setStream] = useState(null);
  const messagesEndRef = useRef(null);

  // Скролл к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    socket.on('message', (message) => {
      if (message.chatId === activeChat) {
        setMessages(prev => [...prev, message]);
      }
      
      // Обновляем последнее сообщение в списке чатов
      setChats(prev => prev.map(chat => 
        chat.id === message.chatId 
          ? { ...chat, lastMessage: message.text }
          : chat
      ));
    });

    socket.on('call:incoming', ({ signal, from, chatId, type }) => {
      if (window.confirm(`Входящий ${type === 'video' ? 'видео' : 'аудио'} звонок. Принять?`)) {
        navigator.mediaDevices.getUserMedia({ 
          video: type === 'video', 
          audio: true 
        }).then(stream => {
          setStream(stream);
          setInCall(true);
          setCallType(type);
          
          if (myVideo.current) {
            myVideo.current.srcObject = stream;
          }

          const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: stream
          });

          peer.on('signal', signal => {
            socket.emit('call:accept', { signal, to: from });
          });

          peer.on('stream', userStream => {
            if (userVideo.current) {
              userVideo.current.srcObject = userStream;
            }
          });

          peer.signal(signal);
          peerRef.current = peer;
        });
      }
    });

    socket.on('call:accepted', (signal) => {
      peerRef.current?.signal(signal);
    });

    socket.on('call:ended', () => {
      endCall();
    });

    return () => {
      socket.off('message');
      socket.off('call:incoming');
      socket.off('call:accepted');
      socket.off('call:ended');
    };
  }, [activeChat]);

  const sendMessage = () => {
    if (inputMessage.trim()) {
      const message = {
        id: Date.now(),
        text: inputMessage,
        chatId: activeChat,
        sender: 'me',
        timestamp: new Date().toISOString()
      };
      
      socket.emit('message', message);
      setMessages(prev => [...prev, message]);
      setInputMessage('');
    }
  };

  const startCall = (type) => {
    setCallType(type);
    setInCall(true);
    
    navigator.mediaDevices.getUserMedia({ 
      video: type === 'video', 
      audio: true 
    }).then(stream => {
      setStream(stream);
      if (myVideo.current) {
        myVideo.current.srcObject = stream;
      }

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: stream
      });

      peer.on('signal', signal => {
        socket.emit('call:start', { signal, chatId: activeChat, type });
      });

      peer.on('stream', userStream => {
        if (userVideo.current) {
          userVideo.current.srcObject = userStream;
        }
      });

      peer.on('close', () => {
        endCall();
      });

      peerRef.current = peer;
    }).catch(err => {
      console.error('Ошибка доступа к камере/микрофону:', err);
      alert('Не удалось получить доступ к камере/микрофону');
      setInCall(false);
    });
  };

  const endCall = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    setStream(null);
    setInCall(false);
    setCallType(null);
    socket.emit('call:end', { chatId: activeChat });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="app">
      <div className="sidebar">
        <div className="chats-header">
          <h3>Чаты</h3>
          <button className="add-chat-btn">
            <FaUserPlus />
          </button>
        </div>
        
        <div className="chats-list">
          {chats.map(chat => (
            <div 
              key={chat.id}
              className={`chat-item ${activeChat === chat.id ? 'active' : ''}`}
              onClick={() => setActiveChat(chat.id)}
            >
              <div className="chat-avatar">
                {chat.type === 'group' ? <FaUsers /> : '👤'}
              </div>
              <div className="chat-info">
                <div className="chat-name">{chat.name}</div>
                <div className="chat-last-message">{chat.lastMessage}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-area">
        <div className="chat-header">
          <div className="chat-header-info">
            <h2>{chats.find(c => c.id === activeChat)?.name}</h2>
            <span className="chat-type">
              {chats.find(c => c.id === activeChat)?.type === 'group' ? 'Групповой чат' : 'Личный чат'}
            </span>
          </div>
          <div className="call-buttons">
            <button onClick={() => startCall('audio')} className="call-btn" title="Аудиозвонок">
              <FaPhone />
            </button>
            <button onClick={() => startCall('video')} className="call-btn" title="Видеозвонок">
              <FaVideo />
            </button>
          </div>
        </div>

        {inCall && (
          <div className="call-window">
            <div className="videos-container">
              <video 
                ref={myVideo} 
                autoPlay 
                muted 
                playsInline
                className={`local-video ${callType === 'audio' ? 'audio-only' : ''}`} 
              />
              <video 
                ref={userVideo} 
                autoPlay 
                playsInline
                className={`remote-video ${callType === 'audio' ? 'audio-only' : ''}`} 
              />
            </div>
            <div className="call-info">
              {callType === 'audio' ? '🔊 Аудиозвонок' : '📹 Видеозвонок'}
            </div>
            <button onClick={endCall} className="end-call-btn">
              Завершить звонок
            </button>
          </div>
        )}

        <div className="messages-container">
          {messages
            .filter(msg => msg.chatId === activeChat)
            .map((msg, idx) => (
              <div key={idx} className={`message ${msg.sender === 'me' ? 'my-message' : 'other-message'}`}>
                <div className="message-content">{msg.text}</div>
                <div className="message-time">
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="message-input">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Введите сообщение..."
          />
          <button onClick={sendMessage}>Отправить</button>
        </div>
      </div>
    </div>
  );
}

export default App;
