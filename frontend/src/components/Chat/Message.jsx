import React from 'react';

const Message = ({ message, isOwn }) => {
  return (
    <div className={`message-wrapper ${isOwn ? 'own' : ''}`}>
      <div className="message-bubble">
        {!isOwn && <div className="message-sender">{message.sender?.username}</div>}
        <div className="message-content">{message.content}</div>
        <div className="message-time">
          {new Date(message.createdAt).toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  );
};

export default Message;