const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const amqp = require('amqplib');

const app = express();
const PORT = 3000;
const RABBITMQ_URL = 'amqp://localhost';

app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/productCatalog', { useNewUrlParser: true, useUnifiedTopology: true });

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
});

const Product = mongoose.model('Product', productSchema);

async function publishProductCreatedEvent(product) {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();
  const exchange = 'product.created';

  await channel.assertExchange(exchange, 'fanout', { durable: false });
  await channel.publish(exchange, '', Buffer.from(JSON.stringify(product)));
}

app.get('/products', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

app.get('/products/:id', async (req, res) => {
  const productId = req.params.id;
  const product = await Product.findById(productId);

  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ message: 'Product not found' });
  }
});

app.post('/products', async (req, res) => {
  const { name, price } = req.body;
  const newProduct = new Product({ name, price });
  await newProduct.save();

  await publishProductCreatedEvent(newProduct);

  res.status(201).json(newProduct);
});

app.listen(PORT, () => {
  console.log(`Product Catalog Microservice is running on http://localhost:${PORT}`);
});
