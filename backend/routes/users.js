const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Поиск пользователей по имени или email
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.json([]);
    }

    // Ищем пользователей, исключая текущего
    const users = await User.find({
      $and: [
        { _id: { $ne: req.userId } }, // не текущий пользователь
        {
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    }).select('username email avatar online lastSeen').limit(20);

    res.json(users);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Ошибка поиска' });
  }
});

// Получить информацию о пользователе по ID
router.get('/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('username email avatar online lastSeen');
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Ошибка получения пользователя' });
  }
});

module.exports = router;
