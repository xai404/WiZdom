require('dotenv').config();

const http = require('http');

const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./socket');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // Socket.IO attaches to the same HTTP server/port Express already
  // listens on — app.listen(...) is just http.createServer(app).listen(...)
  // under the hood, so this is not a second server.
  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`WiZdom backend running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  process.on('unhandledRejection', (err) => {
    console.error(`Unhandled rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });
};

startServer();
