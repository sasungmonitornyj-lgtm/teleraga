import './Auth.css';
import React, { useState } from 'react';

const Login = ({ onSwitch, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin({ email, password });
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Telerag</h1>
        <p>Вход</p>
        
        <form onSubmit={handleSubmit}>
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
          <button type="submit">Войти</button>
        </form>
        
        <p>
          Нет аккаунта?{' '}
          <button onClick={onSwitch}>Регистрация</button>
        </p>
      </div>
    </div>
  );
};

export default Login;
