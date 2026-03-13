const express = require('express');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Получить все чаты пользователя
router.get('/', auth, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.userId })
      .populate('participants', 'username avatar online lastSeen')
      .populate('lastMessage')
      .populate('admin', 'username')
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать личный чат
router.post('/private', auth, async (req, res) => {
  try {
    const { userId } = req.body;

    // Проверяем, существует ли пользователь
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Проверяем, существует ли уже чат между этими пользователями
    const existingChat = await Chat.findOne({
      type: 'private',
      participants: { $all: [req.userId, userId], $size: 2 }
    });

    if (existingChat) {
      return res.json(existingChat);
    }

    // Создаем новый чат
    const chat = new Chat({
      type: 'private',
      participants: [req.userId, userId],
      createdBy: req.userId
    });

    await chat.save();
    await chat.populate('participants', 'username avatar online lastSeen');

    res.status(201).json(chat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать групповой чат
router.post('/group', auth, async (req, res) => {
  try {
    const { name, participants } = req.body;

    if (!name || !participants || !participants.length) {
      return res.status(400).json({ error: 'Название и участники обязательны' });
    }

    // Добавляем создателя в участники
    const allParticipants = [...new Set([req.userId, ...participants])];

    const chat = new Chat({
      name,
      type: 'group',
      participants: allParticipants,
      admin: req.userId,
      createdBy: req.userId
    });

    await chat.save();
    await chat.populate('participants', 'username avatar online lastSeen');

    res.status(201).json(chat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить информацию о чате
router.get('/:chatId', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.userId
    }).populate('participants', 'username avatar online lastSeen');

    if (!chat) {
      return res.status(404).json({ error: 'Чат не найден' });
    }

    res.json(chat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Добавить участников в группу
router.post('/:chatId/participants', auth, async (req, res) => {
  try {
    const { userIds } = req.body;
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      type: 'group'
    });

    if (!chat) {
      return res.status(404).json({ error: 'Чат не найден' });
    }

    // Проверяем, является ли пользователь админом
    if (chat.admin.toString() !== req.userId) {
      return res.status(403).json({ error: 'Только администратор может добавлять участников' });
    }

    // Добавляем новых участников
    chat.participants = [...new Set([...chat.participants, ...userIds])];
    await chat.save();

    res.json(chat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;