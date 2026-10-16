// Server Configuration and Setup
// Main entry point for the ERP application

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: 'erp-secret-key-2024',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false, // Set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Set view engine to serve HTML files from views folder
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routes Import
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const comprehensiveApi = require('./routes/comprehensive-api');
const pageRoutes = require('./routes/pages');

// Use routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api', comprehensiveApi);
app.use('/', pageRoutes);

// Root route - serve home page
app.get('/', (req, res) => {
  res.render('index');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database connection pool
    await db.initialize();
    console.log('Database connection pool initialized');

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════╗
║     University ERP System - Server Started             ║
║     http://localhost:${PORT}                              ║
║     Database: Oracle XE                                ║
╚════════════════════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await db.closePool();
  process.exit(0);
});

// Start the application
startServer();

module.exports = app;
