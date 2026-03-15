const express = require('express');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Получить все чаты
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

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const existingChat = await Chat.findOne({
      type: 'private',
      participants: { $all: [req.userId, userId], $size: 2 }
    });

    if (existingChat) {
      return res.json(existingChat);
    }

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

// СОЗДАТЬ ГРУППОВОЙ ЧАТ
router.post('/group', auth, async (req, res) => {
  try {
    const { name, participants, avatar } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Название группы обязательно' });
    }

    // Добавляем создателя в участники, если его там нет
    const allParticipants = [...new Set([req.userId, ...(participants || [])])];

    const chat = new Chat({
      name,
      type: 'group',
      participants: allParticipants,
      admin: req.userId,
      avatar: avatar || '',
      createdBy: req.userId
    });

    await chat.save();
    await chat.populate('participants', 'username avatar online lastSeen');

    res.status(201).json(chat);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Ошибка создания группы' });
  }
});

// Получить чат по ID
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

// ДОБАВИТЬ УЧАСТНИКОВ В ГРУППУ
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

    // Отправляем уведомление через сокет (добавим позже)
    
    res.json(chat);
  } catch (error) {
    console.error('Add participants error:', error);
    res.status(500).json({ error: 'Ошибка добавления участников' });
  }
});

// УДАЛИТЬ УЧАСТНИКА ИЗ ГРУППЫ (выйти самому или удалить, если админ)
router.delete('/:chatId/participants/:userId', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      type: 'group'
    });

    if (!chat) {
      return res.status(404).json({ error: 'Чат не найден' });
    }

    // Если удаляем себя
    if (req.params.userId === req.userId) {
      chat.participants = chat.participants.filter(id => id.toString() !== req.userId);
      await chat.save();
      return res.json({ success: true, message: 'Вы вышли из группы' });
    }

    // Если удаляем другого, проверяем админа
    if (chat.admin.toString() !== req.userId) {
      return res.status(403).json({ error: 'Только администратор может удалять участников' });
    }

    chat.participants = chat.participants.filter(id => id.toString() !== req.params.userId);
    await chat.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({ error: 'Ошибка удаления участника' });
  }
});

// ОБНОВИТЬ ИНФОРМАЦИЮ О ГРУППЕ (название, аватар)
router.put('/:chatId', auth, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      type: 'group'
    });

    if (!chat) {
      return res.status(404).json({ error: 'Чат не найден' });
    }

    if (chat.admin.toString() !== req.userId) {
      return res.status(403).json({ error: 'Только администратор может изменять группу' });
    }

    if (name) chat.name = name;
    if (avatar !== undefined) chat.avatar = avatar;

    await chat.save();
    res.json(chat);
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Ошибка обновления группы' });
  }
});

module.exports = router;