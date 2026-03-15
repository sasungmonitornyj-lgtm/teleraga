import React, { useState, useEffect, useRef } from 'react';
import { users, chats } from '../../services/api';
import './UserSearch.css';

const UserSearch = ({ onClose, currentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [creatingChat, setCreatingChat] = useState(false);
  const searchRef = useRef(null);
  const debounceTimeout = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();

    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    debounceTimeout.current = setTimeout(async () => {
      try {
        const response = await users.search(searchQuery);
        setSearchResults(response.data);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimeout.current);
  }, [searchQuery]);

  const startPrivateChat = async (userId) => {
    try {
      setCreatingChat(true);
      setSelectedUser(userId);
      const response = await chats.getPrivate(userId);
      onClose(response.data);
    } catch (error) {
      console.error('Error creating chat:', error);
    } finally {
      setCreatingChat(false);
      setSelectedUser(null);
    }
  };

  return (
    <div className="user-search-overlay">
      <div className="user-search-container" ref={searchRef}>
        <div className="user-search-header">
          <h3>Новый чат</h3>
          <button className="close-btn" onClick={() => onClose()}>×</button>
        </div>

        <div className="user-search-input-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            type="text"
            placeholder="Введите имя или email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="user-search-input"
          />
          {loading && <div className="search-spinner" />}
        </div>

        <div className="user-search-results">
          {searchQuery.length < 2 ? (
            <div className="search-hint">
              Введите минимум 2 символа для поиска
            </div>
          ) : searchResults.length === 0 && !loading ? (
            <div className="no-results">
              Пользователи не найдены
            </div>
          ) : (
            searchResults.map(user => (
              <div
                key={user._id}
                className="user-result-item"
                onClick={() => startPrivateChat(user._id)}
              >
                <div className="user-result-avatar">
                  {user.avatar || '👤'}
                  {user.online && <span className="online-indicator" />}
                </div>
                <div className="user-result-info">
                  <div className="user-result-name">{user.username}</div>
                  <div className="user-result-email">{user.email}</div>
                </div>
                {creatingChat && selectedUser === user._id && (
                  <div className="creating-spinner" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSearch;