// user-management.js

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const config = require('./config');

const app = express();
const PORT = config.port;

app.use(bodyParser.json());

mongoose.connect(config.mongoUri, { useNewUrlParser: true, useUnifiedTopology: true, dbName: 'userManagement' })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  loyaltyPoints: { type: Number, default: 0 },
});

const User = mongoose.model('User', userSchema);


async function subscribeToProductCreatedEvents() {
  const connection = await amqp.connect(config.rabbitmqUrl);
  const channel = await connection.createChannel();
  const exchange = 'product.created';

  await channel.assertExchange(exchange, 'fanout', { durable: false });
  const { queue } = await channel.assertQueue('', { exclusive: true });
  await channel.bindQueue(queue, exchange, '');

  channel.consume(queue, async (msg) => {
    const product = JSON.parse(msg.content.toString());
    console.log(`User Management Microservice received product created event: ${product.name}`);
    
    await updateLoyaltyPointsForUsers(product.name);
  }, { noAck: true });
}

async function updateLoyaltyPointsForUsers(productName) {
  const usersToUpdate = await User.find();
  
  usersToUpdate.forEach(async (user) => {
    // Some loyalty points for each purchase
    const pointsToAdd = 5;
    
    user.loyaltyPoints += pointsToAdd;
    await user.save();
    
    console.log(`Updated loyalty points for user ${user.username}. New total: ${user.loyaltyPoints}`);
  });
}

subscribeToProductCreatedEvents();

app.get('/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

app.get('/users/:id', async (req, res) => {
  const userId = req.params.id;
  const user = await User.findById(userId);

  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

app.post('/users', async (req, res) => {
  const { username, email } = req.body;
  const newUser = new User({ username, email });
  await newUser.save();

  res.status(201).json(newUser);
});

app.listen(PORT, () => {
  console.log(`User Management Microservice is running on http://localhost:${PORT}`);
});