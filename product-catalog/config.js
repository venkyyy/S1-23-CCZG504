module.exports = {
    port: process.env.PORT || 3000,
    rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://localhost',
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/productCatalog',
  };
  