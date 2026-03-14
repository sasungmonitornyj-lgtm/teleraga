require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chats');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);
const Message = require('./models/Message');
const User = require('./models/User');
const Chat = require('./models/Chat');

// Подключаемся к базе данных
connectDB();

const app = express();
const server = http.createServer(app);

// Настройка CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://teleraga.vercel.app'],
  credentials: true
}));

app.use(express.json());

// Роуты
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);

// WebSocket сервер
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173', 'https://teleraga.vercel.app'],
    credentials: true
  }
});

// Хранилище подключенных пользователей
const onlineUsers = new Map();

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('✅ Пользователь подключился:', socket.user.username);
  
  // Сохраняем пользователя
  onlineUsers.set(socket.user._id.toString(), {
    socketId: socket.id,
    user: socket.user
  });

  // Обновляем статус в базе
  User.findByIdAndUpdate(socket.user._id, { online: true, lastSeen: new Date() }).exec();

  // Отправляем список онлайн пользователей всем
  io.emit('users:online', Array.from(onlineUsers.keys()));

  // Присоединяемся к комнатам чатов
  Chat.find({ participants: socket.user._id }).then(chats => {
    chats.forEach(chat => {
      socket.join(chat._id.toString());
    });
  });

  // Отправка сообщения
  socket.on('message:send', async (data) => {
    try {
      const { chatId, content, type = 'text' } = data;

      // Проверяем, есть ли пользователь в чате
      const chat = await Chat.findOne({
        _id: chatId,
        participants: socket.user._id
      });

      if (!chat) {
        return socket.emit('error', { message: 'Chat not found' });
      }

      // Создаем сообщение
      const message = new Message({
        chat: chatId,
        sender: socket.user._id,
        content,
        type,
        readBy: [socket.user._id]
      });

      await message.save();
      await message.populate('sender', 'username avatar');

      // Обновляем последнее сообщение в чате
      chat.lastMessage = message._id;
      await chat.save();

      // Отправляем сообщение всем в комнате
      io.to(chatId).emit('message:new', message);

      // Отправляем уведомления офлайн пользователям (можно добавить позже)
      
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Печатает...
  socket.on('typing:start', ({ chatId }) => {
    socket.to(chatId).emit('typing:start', {
      userId: socket.user._id,
      username: socket.user.username,
      chatId
    });
  });

  socket.on('typing:stop', ({ chatId }) => {
    socket.to(chatId).emit('typing:stop', {
      userId: socket.user._id,
      chatId
    });
  });

  // Прочитано
  socket.on('messages:read', async ({ chatId, messageIds }) => {
    try {
      await Message.updateMany(
        { _id: { $in: messageIds } },
        { $addToSet: { readBy: socket.user._id } }
      );

      io.to(chatId).emit('messages:read', {
        userId: socket.user._id,
        chatId,
        messageIds
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  // Отключение
  socket.on('disconnect', async () => {
    console.log('❌ Пользователь отключился:', socket.user?.username);
    
    if (socket.user) {
      onlineUsers.delete(socket.user._id.toString());
      
      // Обновляем статус
      await User.findByIdAndUpdate(socket.user._id, { 
        online: false, 
        lastSeen: new Date() 
      });

      // Отправляем обновленный список
      io.emit('users:online', Array.from(onlineUsers.keys()));
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
