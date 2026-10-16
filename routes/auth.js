// Authentication Routes
// Handles login, registration, and logout

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

// Login endpoint
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }

    // Query user from database
    const sql = 'SELECT * FROM users WHERE email = ? AND role = ?';
    const rows = await db.executeQueryRows(sql, [email, role]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or role' });
    }

    const user = rows[0];

    // Check password against stored password
    if (password !== user.password) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Store user info in session
    req.session.userId = user.user_id;
    req.session.userName = user.name;
    req.session.userEmail = user.email;
    req.session.userRole = user.role;
    req.session.userYear = user.year;
    req.session.userBranch = user.branch;

    console.log(`User logged in: ${email} (${role})`);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        year: user.year,
        branch: user.branch
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Registration endpoint
router.post('/register', async (req, res) => {
  const { name, email, password, confirmPassword, role, year, branch, department } = req.body;

  try {
    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (role === 'Student' && (!year || !branch)) {
      return res.status(400).json({ error: 'Year and Branch required for students' });
    }

    if (role === 'Instructor' && !department) {
      return res.status(400).json({ error: 'Department required for instructors' });
    }

    // Check if user already exists
    let checkSql = 'SELECT * FROM users WHERE email = ?';
    let existing = await db.executeQueryRows(checkSql, [email]);

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Insert new user
    const userId = Math.floor(Math.random() * 100000);
    let insertSql = `INSERT INTO users (user_id, name, email, password, role, year, branch, department) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    await db.executeQuery(insertSql, [
      userId,
      name,
      email,
      password, // In production, hash this with bcrypt
      role,
      role === 'Student' ? year : null,
      role === 'Student' ? branch : null,
      role === 'Instructor' ? department : null
    ]);

    console.log(`New user registered: ${email} (${role})`);

    res.json({
      success: true,
      message: 'Registration successful. Please login.'
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ error: `Registration failed: ${err.message}` });
  }
});

// Logout endpoint
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Check if user is logged in
router.get('/check-session', (req, res) => {
  if (req.session.userId) {
    res.json({
      loggedIn: true,
      user: {
        id: req.session.userId,
        name: req.session.userName,
        email: req.session.userEmail,
        role: req.session.userRole
      }
    });
  } else {
    res.json({ loggedIn: false });
  }
});

module.exports = router;
