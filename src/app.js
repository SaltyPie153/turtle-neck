// express 앱 설정 및 라우터 연결
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const landmarkRoutes = require('./routes/landmarkRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const deviceRoutes = require('./routes/deviceRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.use('/auth', authRoutes);
app.use('/landmark', landmarkRoutes);
app.use('/notifications', notificationRoutes);
app.use('/devices', deviceRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: '요청한 경로를 찾을 수 없습니다.',
  });
});

module.exports = app;