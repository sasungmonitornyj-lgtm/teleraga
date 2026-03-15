import React from 'react';

const Message = ({ message, isOwn }) => {
  const renderContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <div className="message-image-container">
            <img 
              src={message.fileUrl} 
              alt={message.content}
              className="message-image"
              onClick={() => window.open(message.fileUrl, '_blank')}
            />
            {message.content && (
              <div className="message-caption">{message.content}</div>
            )}
          </div>
        );
      
      case 'file':
        return (
          <a 
            href={message.fileUrl} 
            download={message.fileName}
            className="message-file"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>📎</span>
            <span className="file-name">{message.fileName}</span>
            {message.fileSize && (
              <span className="file-size">
                ({Math.round(message.fileSize / 1024)} KB)
              </span>
            )}
          </a>
        );
      
      default:
        return <div className="message-content">{message.content}</div>;
    }
  };

  return (
    <div className={`message-wrapper ${isOwn ? 'own' : ''}`}>
      <div className="message-bubble">
        {!isOwn && <div className="message-sender">{message.sender?.username}</div>}
        {renderContent()}
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