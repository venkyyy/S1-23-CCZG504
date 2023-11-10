const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const amqp = require('amqplib');

const app = express();
const PORT = 3001;
const RABBITMQ_URL = 'amqp://localhost';

app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/userManagement', { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
});

const User = mongoose.model('User', userSchema);

async function subscribeToProductCreatedEvents() {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();
  const exchange = 'product.created';

  await channel.assertExchange(exchange, 'fanout', { durable: false });
  const { queue } = await channel.assertQueue('', { exclusive: true });
  await channel.bindQueue(queue, exchange, '');

  channel.consume(queue, (msg) => {
    const product = JSON.parse(msg.content.toString());
    console.log(`User Management Microservice received product created event: ${product.name}`);
    // Add logic to handle the event, e.g., send a welcome email to the user.
  }, { noAck: true });
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
cd 