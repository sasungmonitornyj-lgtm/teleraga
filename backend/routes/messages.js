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

    // Проверяем, имеет ли пользователь доступ к чату
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

    // Проверяем, является ли пользователь отправителем
    if (message.sender.toString() !== req.userId) {
      return res.status(403).json({ error: 'Нельзя удалить чужое сообщение' });
    }

    // Soft delete - помечаем как удаленное для пользователя
    message.deletedFor.push(req.userId);
    await message.save();

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;