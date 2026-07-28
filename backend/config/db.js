const dns = require('dns');
const mongoose = require('mongoose');

// This machine's default DNS resolver refuses SRV queries (returns
// ECONNREFUSED for _mongodb._tcp... lookups) even though normal DNS
// resolution works, which breaks mongodb+srv:// connection strings.
// Point Node's resolver at public DNS servers that do answer SRV queries.
dns.setServers(['1.1.1.1', '8.8.8.8']);

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('MONGO_URI is not defined in environment variables');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

module.exports = connectDB;
