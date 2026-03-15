const express = require('express');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const auth = require('../middleware/auth');

const router = express.Router();

// Получить сообщения чата
router.get('/:chatId', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.userId
    });

    if (!chat) {
      return res.status(404).json({ error: 'Чат не найден' });
    }

    const messages = await Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('sender', 'username avatar')
      .populate('replyTo');

    res.json({
      messages: messages.reverse(),
      hasMore: messages.length === limit
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ОТПРАВИТЬ СООБЩЕНИЕ С ФАЙЛОМ (через сокет, но добавим поддержку)
router.post('/', auth, async (req, res) => {
  try {
    const { chatId, content, type = 'text', fileUrl, fileName, fileSize } = req.body;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.userId
    });

    if (!chat) {
      return res.status(404).json({ error: 'Чат не найден' });
    }

    const message = new Message({
      chat: chatId,
      sender: req.userId,
      content,
      type,
      fileUrl,
      fileName,
      fileSize,
      readBy: [req.userId]
    });

    await message.save();
    await message.populate('sender', 'username avatar');

    chat.lastMessage = message._id;
    await chat.save();

    // Здесь нужно будет через сокет отправить всем
    // Пока просто возвращаем сообщение
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Ошибка отправки сообщения' });
  }
});

// Отметить сообщения как прочитанные
router.post('/read/:chatId', auth, async (req, res) => {
  try {
    const { chatId } = req.params;

    await Message.updateMany(
      { 
        chat: chatId,
        sender: { $ne: req.userId },
        readBy: { $ne: req.userId }
      },
      { $addToSet: { readBy: req.userId } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить сообщение
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ error: 'Сообщение не найдено' });
    }

    if (message.sender.toString() !== req.userId) {
      return res.status(403).json({ error: 'Нельзя удалить чужое сообщение' });
    }

    message.deletedFor.push(req.userId);
    await message.save();

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;