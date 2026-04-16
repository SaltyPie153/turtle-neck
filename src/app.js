// Express app setup and route registration

const cors = require('cors');
const express = require('express');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const landmarkRoutes = require('./routes/landmarkRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const postureLogRoutes = require('./routes/postureLogRoutes');
const postureRoutes = require('./routes/postureRoutes');
const pushRoutes = require('./routes/pushRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/push', pushRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
  });
});

app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.use('/auth', authRoutes);
app.use('/landmark', landmarkRoutes);
app.use('/notifications', notificationRoutes);
app.use('/devices', deviceRoutes);
app.use('/users', userRoutes);
app.use('/posture/log', postureLogRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/posture', postureRoutes);

app.use((err, req, res, next) => {
  if (!err) {
    next();
    return;
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({
      message: err.message,
    });
  }

  return res.status(err.status || 500).json({
    message: err.message || 'Server error occurred.',
  });
});

app.use((req, res) => {
  res.status(404).json({
    message: 'Requested route was not found.',
  });
});

module.exports = app;
