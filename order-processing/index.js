const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const PORT = 3002;

app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/orderProcessing', { useNewUrlParser: true, useUnifiedTopology: true });

const orderSchema = new mongoose.Schema({
  userId: String,
  products: [String],
  total: Number,
});

const Order = mongoose.model('Order', orderSchema);

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
  const total = calculateOrderTotal(products); // Assume you have a function to calculate the total.
  const newOrder = new Order({ userId, products, total });
  await newOrder.save();

  res.status(201).json(newOrder);
});

function calculateOrderTotal(products) {
  // Assume you have a function to calculate the total based on product prices.
  return products.reduce((sum, product) => sum + getProductPrice(product), 0);
}

function getProductPrice(product) {
  // In a real application, this function would fetch the product price from the Product Catalog service.
  // For simplicity, we'll return a fixed price here.
  const productPrices = { 'Product 1': 20.0, 'Product 2': 30.0 };
  return productPrices[product] || 0;
}

app.listen(PORT, () => {
  console.log(`Order Processing Microservice is running on http://localhost:${PORT}`);
});
