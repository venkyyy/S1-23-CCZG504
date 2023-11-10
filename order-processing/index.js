// order-processing.js

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const config = require('./config');

const app = express();
const PORT = config.port;

app.use(bodyParser.json());

mongoose.connect(`${config.mongoUri}/orderProcessing`, { useNewUrlParser: true, useUnifiedTopology: true });

const orderSchema = new mongoose.Schema({
  userId: String,
  products: [{ name: String, quantity: Number }], 
  total: Number,
});

const Order = mongoose.model('Order', orderSchema);

async function subscribeToProductCreatedEvents() {
  const connection = await amqp.connect(config.rabbitmqUrl);
  const channel = await connection.createChannel();
  const exchange = 'product.created';

  await channel.assertExchange(exchange, 'fanout', { durable: false });
  const { queue } = await channel.assertQueue('', { exclusive: true });
  await channel.bindQueue(queue, exchange, '');

  channel.consume(queue, async (msg) => {
    const product = JSON.parse(msg.content.toString());
    console.log(`Order Processing Microservice received product created event: ${product.name}`);
    
    await processOrders(product.name);
  }, { noAck: true });
}

async function processOrders(productName) {
  const ordersToProcess = await Order.find({ 'products.name': productName });
  
  ordersToProcess.forEach(async (order) => {
    order.status = 'Processed';
    
    order.total = calculateOrderTotal(order.products);
    
    await order.save();
    
    console.log(`Processed order ${order._id}. New status: ${order.status}, Total: ${order.total}`);
  });
}

function calculateOrderTotal(products) {
  return products.reduce((sum, product) => sum + getProductPrice(product.name) * product.quantity, 0);
}

function getProductPrice(product) {
  //Get the price of a product from the Product Catalog service
  const productPrices = { 'Product 1': 20.0, 'Product 2': 30.0 };
  return productPrices[product] || 0;
}

subscribeToProductCreatedEvents();

app.get('/orders', async (req, res) => {
  const orders = await Order.find();
  res.json(orders);
});

app.get('/orders/:id', async (req, res) => {
  const orderId = req.params.id;
  const order = await Order.findById(orderId);

  if (order) {
    res.json(order);
  } else {
    res.status(404).json({ message: 'Order not found' });
  }
});

app.post('/orders', async (req, res) => {
  const { userId, products } = req.body;
  const total = calculateOrderTotal(products);
  const newOrder = new Order({ userId, products, total });
  await newOrder.save();

  res.status(201).json(newOrder);
});

app.listen(PORT, () => {
  console.log(`Order Processing Microservice is running on http://localhost:${PORT}`);
});
