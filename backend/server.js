const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://твой-ник.github.io'],
  credentials: true
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173', 'https://твой-ник.github.io'],
    methods: ['GET', 'POST'],
    credentials: true,
    transports: ['websocket', 'polling']
  },
  allowEIO3: true
});

// Хранение активных пользователей
const users = new Map();
const activeCalls = new Map();

io.on('connection', (socket) => {
  console.log('✅ Пользователь подключился:', socket.id);
  
  // Добавляем пользователя
  users.set(socket.id, {
    id: socket.id,
    joinedAt: new Date().toISOString()
  });

  // Отправляем список пользователей всем
  io.emit('users:list', Array.from(users.values()));

  // Обработка сообщений
  socket.on('message', (message) => {
    console.log('📨 Сообщение:', message);
    // Добавляем ID отправителя
    message.senderId = socket.id;
    // Отправляем всем (в реальном проекте нужно фильтровать по чату)
    io.emit('message', message);
  });

  // Начало звонка
  socket.on('call:start', ({ signal, chatId, type }) => {
    console.log('📞 Звонок начат:', { from: socket.id, chatId, type });
    
    // Сохраняем информацию о звонке
    activeCalls.set(chatId, {
      initiator: socket.id,
      type,
      startedAt: new Date().toISOString()
    });

    // Отправляем всем в чате (кроме отправителя)
    socket.broadcast.emit('call:incoming', { 
      signal, 
      from: socket.id, 
      chatId, 
      type 
    });
  });

  // Принятие звонка
  socket.on('call:accept', ({ signal, to }) => {
    console.log('✅ Звонок принят:', { from: socket.id, to });
    io.to(to).emit('call:accepted', signal);
  });

  // Завершение звонка
  socket.on('call:end', ({ chatId }) => {
    console.log('❌ Звонок завершен:', { chatId, by: socket.id });
    
    if (activeCalls.has(chatId)) {
      activeCalls.delete(chatId);
    }
    
    socket.broadcast.emit('call:ended', { chatId, by: socket.id });
  });

  // Отклонение звонка
  socket.on('call:reject', ({ to, chatId }) => {
    console.log('❌ Звонок отклонен:', { from: socket.id, to, chatId });
    io.to(to).emit('call:rejected', { by: socket.id, chatId });
  });

  // Пользователь печатает
  socket.on('typing', ({ chatId, isTyping }) => {
    socket.broadcast.emit('typing', { 
      userId: socket.id, 
      chatId, 
      isTyping 
    });
  });

  // Отключение
  socket.on('disconnect', () => {
    console.log('❌ Пользователь отключился:', socket.id);
    
    // Удаляем пользователя
    users.delete(socket.id);
    
    // Завершаем все звонки этого пользователя
    activeCalls.forEach((call, chatId) => {
      if (call.initiator === socket.id) {
        activeCalls.delete(chatId);
        io.emit('call:ended', { chatId, by: socket.id });
      }
    });

    // Обновляем список пользователей
    io.emit('users:list', Array.from(users.values()));
  });
});

// Простой роут для проверки
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Мессенджер API работает',
    users: users.size,
    activeCalls: activeCalls.size
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📡 WebSocket готов к подключениям`);
});