// Page Routes
// Handles rendering of EJS templates/HTML pages

const express = require('express');
const router = express.Router();
const path = require('path');

// Middleware to check if user is logged in
const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// Home page
router.get('/', (req, res) => {
  res.render('index', { user: req.session });
});

// Login page
router.get('/login', (req, res) => {
  res.render('login');
});

// Register page
router.get('/register', (req, res) => {
  res.render('register');
});

// Student dashboard
router.get('/student-dashboard', requireLogin, (req, res) => {
  if (req.session.userRole !== 'Student') {
    return res.redirect('/');
  }
  res.render('student-dashboard', { user: req.session });
});

// Instructor dashboard
router.get('/instructor-dashboard', requireLogin, (req, res) => {
  if (req.session.userRole !== 'Instructor') {
    return res.redirect('/');
  }
  res.render('instructor-dashboard', { user: req.session });
});

// My Courses page (Student)
router.get('/my-courses', requireLogin, (req, res) => {
  if (req.session.userRole !== 'Student') {
    return res.redirect('/');
  }
  res.render('my-courses', { user: req.session });
});

// Enrollments page (Student)
router.get('/enrollments', requireLogin, (req, res) => {
  if (req.session.userRole !== 'Student') {
    return res.redirect('/');
  }
  res.render('enrollments', { user: req.session });
});

// Grades page (Student)
router.get('/grades', requireLogin, (req, res) => {
  if (req.session.userRole !== 'Student') {
    return res.redirect('/');
  }
  res.render('grades', { user: req.session });
});

// Faculty Contacts page
router.get('/faculty', (req, res) => {
  res.render('faculty', { user: req.session });
});

// Announcements page
router.get('/announcements', (req, res) => {
  res.render('announcements', { user: req.session });
});

// Profile page
router.get('/profile', requireLogin, (req, res) => {
  res.render('profile', { user: req.session });
});

// My Classes page (Instructor)
router.get('/my-classes', requireLogin, (req, res) => {
  if (req.session.userRole !== 'Instructor') {
    return res.redirect('/');
  }
  res.render('my-classes', { user: req.session });
});

// Students List page (Instructor)
router.get('/students-list', requireLogin, (req, res) => {
  if (req.session.userRole !== 'Instructor') {
    return res.redirect('/');
  }
  res.render('students-list', { user: req.session });
});

// Upload Grades page (Instructor)
router.get('/upload-grades', requireLogin, (req, res) => {
  if (req.session.userRole !== 'Instructor') {
    return res.redirect('/');
  }
  res.render('upload-grades', { user: req.session });
});

// Assign Course page (Instructor)
router.get('/assign-course', requireLogin, (req, res) => {
  if (req.session.userRole !== 'Instructor') {
    return res.redirect('/');
  }
  res.render('assign-course', { user: req.session });
});

// Attendance page (Instructor)
router.get('/attendance', requireLogin, (req, res) => {
  if (req.session.userRole !== 'Instructor') {
    return res.redirect('/');
  }
  res.render('attendance', { user: req.session });
});

// Assignments page (Students & Instructors)
router.get('/assignments', requireLogin, (req, res) => {
  if (req.session.userRole === 'Student') {
    res.render('assignments-by-subject', { user: req.session });
  } else if (req.session.userRole === 'Instructor') {
    res.render('assignments', { user: req.session });
  } else {
    res.redirect('/');
  }
});

// NEW DASHBOARD ROUTES (HTML based instead of EJS)

// New Login page (HTML)
router.get('/login-new', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/login-new.html'));
});

// New Student Dashboard (HTML - No auth required, uses sessionStorage)
router.get('/student-dashboard-new', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/student-dashboard-new.html'));
});

// New Instructor Dashboard (HTML - No auth required, uses sessionStorage)
router.get('/instructor-dashboard-new', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/instructor-dashboard-new.html'));
});

// Serve static HTML dashboard pages
router.get('/views/student-dashboard-new.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/student-dashboard-new.html'));
});

router.get('/views/instructor-dashboard-new.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/instructor-dashboard-new.html'));
});

module.exports = router;
