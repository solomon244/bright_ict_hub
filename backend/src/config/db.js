const mongoose = require('mongoose');
const env = require('./env');

const connectDatabase = async () => {
  if (!env.mongoUri || env.mongoUri.trim() === '') {
    console.error('❌ MONGO_URI is not set in environment variables');
    console.error('Please create a .env file with MONGO_URI=mongodb://localhost:27017/ethio-tech-hub');
    process.exit(1);
  }

  try {
    mongoose.set('strictQuery', true);
    
    // Connection options for better timeout handling
    const isAtlas = env.mongoUri.startsWith('mongodb+srv://');
    const options = {
      autoIndex: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000, // 5 seconds
      socketTimeoutMS: 45000,
    };

    // For Atlas, add additional options
    if (isAtlas) {
      options.retryWrites = true;
      options.w = 'majority';
    }

    await mongoose.connect(env.mongoUri, options);
    
    const db = mongoose.connection;
    console.log('✅ MongoDB connected successfully');
    console.log(`   Database: ${db.name || 'default'}`);
    console.log(`   Host: ${db.host || 'N/A'}`);
    console.log(`   Ready State: ${db.readyState === 1 ? 'Connected' : 'Disconnected'}`);

    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('ETIMEOUT') || error.message.includes('queryTxt')) {
      console.error('\n🔍 Troubleshooting DNS/Network Timeout:');
      console.error('   1. Check your internet connection');
      console.error('   2. Verify MongoDB Atlas cluster is running');
      console.error('   3. Check if DNS resolution is working');
      console.error('   4. Try using IP address instead of hostname');
      console.error('   5. Check firewall/antivirus settings');
      console.error('   6. Verify MONGO_URI in .env file is correct');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n🔍 Troubleshooting Connection Refused:');
      console.error('   1. Make sure MongoDB is running on your system');
      console.error('   2. Check if the MONGO_URI is correct');
      console.error('   3. For local MongoDB: mongodb://localhost:27017/ethio-tech-hub');
    } else if (error.message.includes('authentication failed')) {
      console.error('\n🔍 Troubleshooting Authentication:');
      console.error('   1. Check your MongoDB username and password');
      console.error('   2. Verify credentials in MONGO_URI');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\n🔍 Troubleshooting Host Not Found:');
      console.error('   1. Check your MongoDB host/URL');
      console.error('   2. Verify network connectivity');
    }
    
    process.exit(1);
  }
};

module.exports = connectDatabase;


