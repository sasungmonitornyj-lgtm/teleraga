import './Auth.css';
import React, { useState } from 'react';

const Register = ({ onSwitch, onRegister }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onRegister({ username, email, password });
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Telerag</h1>
        <p>Регистрация</p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Имя"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Зарегистрироваться</button>
        </form>
        
        <p>
          Уже есть аккаунт?{' '}
          <button onClick={onSwitch}>Вход</button>
        </p>
      </div>
    </div>
  );
};

export default Register;
