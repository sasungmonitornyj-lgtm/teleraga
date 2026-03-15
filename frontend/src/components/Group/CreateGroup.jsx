import React, { useState, useEffect } from 'react';
import { users, chats } from '../../services/api';
import './CreateGroup.css';

const CreateGroup = ({ onClose, currentUser }) => {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const debounceTimeout = useRef(null);

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
        // Фильтруем уже выбранных
        const filtered = response.data.filter(u => 
          !selectedUsers.some(selected => selected._id === u._id)
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [searchQuery, selectedUsers]);

  const addUser = (user) => {
    setSelectedUsers([...selectedUsers, user]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(u => u._id !== userId));
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;

    setCreating(true);
    try {
      const response = await chats.createGroup({
        name: groupName,
        participants: selectedUsers.map(u => u._id)
      });
      onClose(response.data);
    } catch (error) {
      console.error('Create group error:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="create-group-overlay">
      <div className="create-group-container">
        <div className="create-group-header">
          <h3>Создать группу</h3>
          <button className="close-btn" onClick={() => onClose()}>×</button>
        </div>

        <div className="create-group-content">
          <input
            type="text"
            placeholder="Название группы"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="group-name-input"
          />

          <div className="selected-users">
            {selectedUsers.map(user => (
              <div key={user._id} className="selected-user">
                <span>{user.username}</span>
                <button onClick={() => removeUser(user._id)}>×</button>
              </div>
            ))}
          </div>

          <div className="add-participants">
            <input
              type="text"
              placeholder="Добавить участников..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            
            {loading && <div className="search-spinner" />}

            <div className="search-results">
              {searchResults.map(user => (
                <div
                  key={user._id}
                  className="search-result-item"
                  onClick={() => addUser(user)}
                >
                  <div className="user-avatar">{user.avatar || '👤'}</div>
                  <div className="user-info">
                    <div className="user-name">{user.username}</div>
                    <div className="user-email">{user.email}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="create-group-footer">
          <button 
            className="cancel-btn" 
            onClick={() => onClose()}
          >
            Отмена
          </button>
          <button 
            className="create-btn"
            onClick={createGroup}
            disabled={!groupName.trim() || selectedUsers.length === 0 || creating}
          >
            {creating ? 'Создание...' : 'Создать группу'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroup;