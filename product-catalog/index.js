const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const config = require('./config');

const app = express();
const PORT = config.port;

app.use(bodyParser.json());

mongoose.connect(config.mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
});

const Product = mongoose.model('Product', productSchema);

async function publishProductCreatedEvent(product) {
  const connection = await amqp.connect(config.rabbitmqUrl);
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
