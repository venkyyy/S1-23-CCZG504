const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const config = require('./config');

const app = express();
const PORT = config.port;

app.use(bodyParser.json());

mongoose.connect(`${config.mongoUri}/orderProcessing`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: 'orderProcessing',
})
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => console.log('Connected to MongoDB'));

const orderSchema = new mongoose.Schema({
  userId: String,
  products: [{ name: String, quantity: Number }],
  total: Number,
  status: String, // Added a status field
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
    try {
      const product = JSON.parse(msg.content.toString());
      console.log(`Order Processing Microservice received product created event: ${product.name}`);

      await processOrders(product.name);
    } catch (error) {
      console.error('Error processing product created event:', error.message);
    }
  }, { noAck: true });
}

async function processOrders(productName) {
  try {
    const ordersToProcess = await Order.find({ 'products.name': productName });

    for (const order of ordersToProcess) {
      order.status = 'Processed';

      order.total = calculateOrderTotal(order.products);

      await order.save();

      console.log(`Processed order ${order._id}. New status: ${order.status}, Total: ${order.total}`);
    }
  } catch (error) {
    console.error('Error processing orders:', error.message);
  }
}

function calculateOrderTotal(products) {
  try {
    if (!Array.isArray(products)) {
      throw new Error('Products should be an array');
    }

    const orderTotal = products.reduce((sum, product) => {
      const productPrice = getProductPrice(product.name);
      if (productPrice === undefined) {
        throw new Error(`Invalid product name: ${product.name}`);
      }
      return sum + productPrice * product.quantity;
    }, 0);

    return orderTotal;
  } catch (error) {
    console.error('Error calculating order total:', error.message);
    throw error; // Propagate the error or handle it appropriately
  }
}

function getProductPrice(product) {
  // Get the price of a product from the Product Catalog service
  const productPrices = { 'Product 1': 20.0, 'Product 2': 30.0 };
  return productPrices[product];
}

subscribeToProductCreatedEvents();

app.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/orders/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);

    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    console.error('Error fetching order by ID:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/orders', async (req, res) => {
  try {
    const { userId, products } = req.body;
    const total = calculateOrderTotal(products);
    const newOrder = new Order({ userId, products, total, status: 'Pending' });
    await newOrder.save();

    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error creating new order:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Order Processing Microservice is running on http://localhost:${PORT}`);
});
