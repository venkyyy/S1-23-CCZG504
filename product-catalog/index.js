const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const config = require('./config');

const app = express();
const PORT = config.port;

app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect(`${config.mongoUri}/productCatalog`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: 'productCatalog'
})
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => console.log('Connected to MongoDB'));

// MongoDB Schema
const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  stock: {
    type: Number,
    validate: {
      validator: (value) => value >= 0,
      message: 'Stock must be a non-negative number'
    }
  }
});

const Product = mongoose.model('Product', productSchema);

// RabbitMQ Connection and Event Publishing
async function publishProductCreatedEvent(product) {
  const connection = await amqp.connect(config.rabbitmqUrl);
  const channel = await connection.createChannel();
  const exchange = 'product.created';

  await channel.assertExchange(exchange, 'fanout', { durable: false });
  await channel.publish(exchange, '', Buffer.from(JSON.stringify(product)));
}

// Express Routes
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
  const { name, price, stock } = req.body;
  const newProduct = new Product({ name, price, stock });
  
  try {
    await newProduct.validate();
    await newProduct.save();
    await publishProductCreatedEvent(newProduct);
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Start the Express Server
app.listen(PORT, () => {
  console.log(`Product Catalog Microservice is running on http://localhost:${PORT}`);
});
