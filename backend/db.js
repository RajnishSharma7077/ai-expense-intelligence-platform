const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoMemoryServer;

async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (uri) {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB using MONGO_URI');
    return;
  }

  mongoMemoryServer = await MongoMemoryServer.create({
    binary: {
      version: '7.0.14',
    },
  });

  const memoryUri = mongoMemoryServer.getUri();
  await mongoose.connect(memoryUri, {
    dbName: 'expense_ai',
  });

  console.log('Connected to in-memory MongoDB for local development');
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
}

module.exports = { connectDB, disconnectDB };
