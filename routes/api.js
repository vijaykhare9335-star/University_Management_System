// API Routes
// Handles all data endpoints for courses, enrollments, students, etc.

const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware to check if user is logged in
const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized - please login' });
  }
  next();
};

// GET - Get courses for logged-in student
router.get('/courses', requireLogin, async (req, res) => {
  try {
    if (req.session.userRole !== 'Student') {
      return res.status(403).json({ error: 'Only students can view courses' });
    }

    // Query courses based on student's year and branch
    const sql = `
      SELECT c.*, co.offering_id, co.instructor_id, u.name as instructor_name
      FROM courses c
      JOIN course_offerings co ON c.course_id = co.course_id
      JOIN users u ON co.instructor_id = u.user_id
      WHERE c.year = ? AND c.branch = ?
      ORDER BY c.course_name
    `;

    const rows = await db.executeQueryRows(sql, [
      req.session.userYear,
      req.session.userBranch
    ]);

    res.json({
      courses: rows.map(row => ({
        courseId: row.course_id,
        courseCode: row.course_code,
        courseName: row.course_name,
        credits: row.credits,
        branch: row.branch,
        year: row.year,
        description: row.description,
        offeringId: row.offering_id,
        instructorId: row.instructor_id,
        instructorName: row.instructor_name
      }))
    });
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// GET - Get enrolled courses for student
router.get('/my-enrollments', requireLogin, async (req, res) => {
  try {
    if (req.session.userRole !== 'Student') {
      return res.status(403).json({ error: 'Only students can view enrollments' });
    }

    const sql = `
      SELECT e.enrollment_id, c.course_code, c.course_name, c.credits, u.name as instructor_name, co.semester
      FROM enrollments e
      JOIN course_offerings co ON e.offering_id = co.offering_id
      JOIN courses c ON co.course_id = c.course_id
      JOIN users u ON co.instructor_id = u.user_id
      WHERE e.student_id = ? AND e.status = 'Active'
      ORDER BY c.course_name
    `;

    const rows = await db.executeQueryRows(sql, [req.session.userId]);

    res.json({
      enrollments: rows.map(row => ({
        enrollmentId: row.enrollment_id,
        courseCode: row.course_code,
        courseName: row.course_name,
        credits: row.credits,
        instructorName: row.instructor_name,
        semester: row.semester
      }))
    });
  } catch (err) {
    console.error('Error fetching enrollments:', err);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// GET - Get student statistics
router.get('/student-stats', requireLogin, async (req, res) => {
  try {
    if (req.session.userRole !== 'Student') {
      return res.status(403).json({ error: 'Only students can view stats' });
    }

    // Get enrolled courses count
    const enrolledSql = `
      SELECT COUNT(*) as enrolled_count
      FROM enrollments
      WHERE student_id = ? AND status = 'Active'
    `;
    const enrolledResult = await db.executeQueryRows(enrolledSql, [req.session.userId]);
    const enrolledCourses = enrolledResult[0]?.enrolled_count || 0;

    // Get GPA (average grade from grades table)
    const gpaSql = `
      SELECT AVG(CAST(grade AS DECIMAL(3,2))) as gpa
      FROM grades
      WHERE student_id = ?
    `;
    const gpaResult = await db.executeQueryRows(gpaSql, [req.session.userId]);
    const gpa = gpaResult[0]?.gpa ? parseFloat(gpaResult[0].gpa).toFixed(2) : '0.00';

    res.json({
      stats: {
        enrolledCourses: enrolledCourses,
        gpa: gpa
      }
    });
  } catch (err) {
    console.error('Error fetching student stats:', err);
    res.status(500).json({ error: 'Failed to fetch student stats' });
  }
});

// POST - Enroll in a course
router.post('/enroll', requireLogin, async (req, res) => {
  const { offeringId } = req.body;

  try {
    if (req.session.userRole !== 'Student') {
      return res.status(403).json({ error: 'Only students can enroll' });
    }

    // Check if already enrolled
    const checkSql = 'SELECT * FROM enrollments WHERE student_id = ? AND offering_id = ?';
    const existing = await db.executeQueryRows(checkSql, [
      req.session.userId,
      offeringId
    ]);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    // Create enrollment
    const insertSql = `
      INSERT INTO enrollments (offering_id, student_id, status)
      VALUES (?, ?, 'Active')
    `;

    const result = await db.executeQuery(insertSql, [
      offeringId,
      req.session.userId
    ]);

    // Get the newly created enrollment_id
    const enrollmentRows = await db.executeQueryRows(
      'SELECT enrollment_id FROM enrollments WHERE offering_id = ? AND student_id = ? ORDER BY enrollment_date DESC LIMIT 1',
      [offeringId, req.session.userId]
    );
    
    const enrollmentId = enrollmentRows[0]?.enrollment_id;

    // Create grades record
    const gradeSql = `
      INSERT INTO grades (enrollment_id)
      VALUES (?)
    `;

    await db.executeQuery(gradeSql, [enrollmentId]);

    res.json({ success: true, message: 'Enrolled successfully' });
  } catch (err) {
    console.error('Enrollment error:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ error: `Enrollment failed: ${err.message}` });
  }
});

// GET - Get instructor's courses
router.get('/instructor-courses', requireLogin, async (req, res) => {
  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can access this' });
    }

    const sql = `
      SELECT co.offering_id, c.course_code, c.course_name, co.semester, COUNT(e.enrollment_id) as enrolled
      FROM course_offerings co
      JOIN courses c ON co.course_id = c.course_id
      LEFT JOIN enrollments e ON co.offering_id = e.offering_id
      WHERE co.instructor_id = ?
      GROUP BY co.offering_id, c.course_code, c.course_name, co.semester
    `;

    const rows = await db.executeQueryRows(sql, [req.session.userId]);

    res.json({
      courses: rows.map(row => ({
        offeringId: row.offering_id,
        courseCode: row.course_code,
        courseName: row.course_name,
        semester: row.semester,
        enrolled: row.enrolled
      }))
    });
  } catch (err) {
    console.error('Error fetching instructor courses:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// GET - Get available courses for instructors
router.get('/available-courses', requireLogin, async (req, res) => {
  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can access this' });
    }

    const sql = `
      SELECT course_id, course_code, course_name, credits, branch, year
      FROM courses
      ORDER BY course_name
    `;

    const rows = await db.executeQueryRows(sql);

    res.json({
      courses: rows.map(row => ({
        courseId: row.course_id,
        courseCode: row.course_code,
        courseName: row.course_name,
        credits: row.credits,
        branch: row.branch,
        year: row.year
      }))
    });
  } catch (err) {
    console.error('Error fetching available courses:', err);
    res.status(500).json({ error: 'Failed to fetch available courses' });
  }
});

// POST - Create a course offering for instructor
router.post('/course-offering', requireLogin, async (req, res) => {
  const { courseId, semester, year } = req.body;

  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can create course offerings' });
    }

    if (!courseId || !semester || !year) {
      return res.status(400).json({ error: 'Course, semester, and year are required' });
    }

    const checkSql = `
      SELECT * FROM course_offerings
      WHERE course_id = ? AND instructor_id = ? AND semester = ? AND year = ?
    `;
    const existing = await db.executeQueryRows(checkSql, [courseId, req.session.userId, semester, year]);

    if (existing.length > 0) {
      return res.status(409).json({ error: 'This course offering already exists for you' });
    }

    const insertSql = `
      INSERT INTO course_offerings (course_id, instructor_id, semester, year)
      VALUES (?, ?, ?, ?)
    `;
    await db.executeQuery(insertSql, [courseId, req.session.userId, semester, year]);

    res.json({ success: true, message: 'Course offering created successfully' });
  } catch (err) {
    console.error('Error creating course offering:', err);
    res.status(500).json({ error: 'Failed to create course offering' });
  }
});

// GET - Get students in a course
router.get('/students/:offeringId', requireLogin, async (req, res) => {
  const { offeringId } = req.params;

  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can access this' });
    }

    const sql = `
      SELECT u.user_id, u.name, u.email, e.enrollment_id, g.overall_grade, g.letter_grade
      FROM enrollments e
      JOIN users u ON e.student_id = u.user_id
      LEFT JOIN grades g ON e.enrollment_id = g.enrollment_id
      WHERE e.offering_id = ?
      ORDER BY u.name
    `;

    const rows = await db.executeQueryRows(sql, [offeringId]);

    res.json({
      students: rows.map(row => ({
        studentId: row.user_id,
        name: row.name,
        email: row.email,
        enrollmentId: row.enrollment_id,
        grade: row.overall_grade,
        letterGrade: row.letter_grade
      }))
    });
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// GET - Get available students for an instructor's course offering
router.get('/available-students/:offeringId', requireLogin, async (req, res) => {
  const { offeringId } = req.params;

  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can access this' });
    }

    const offeringSql = `
      SELECT c.branch, c.year
      FROM course_offerings co
      JOIN courses c ON co.course_id = c.course_id
      WHERE co.offering_id = ? AND co.instructor_id = ?
    `;
    const offeringRows = await db.executeQueryRows(offeringSql, [offeringId, req.session.userId]);

    if (!offeringRows.length) {
      return res.status(404).json({ error: 'Course offering not found or not owned by you' });
    }

    const { branch, year } = offeringRows[0];
    const sql = `
      SELECT u.user_id, u.name, u.email, u.year, u.branch
      FROM users u
      WHERE u.role = 'Student'
        AND u.user_id NOT IN (
          SELECT student_id FROM enrollments WHERE offering_id = ?
        )
        AND u.branch = ?
        AND u.year = ?
      ORDER BY u.name
    `;

    const rows = await db.executeQueryRows(sql, [offeringId, branch, year]);

    res.json({
      students: rows.map(row => ({
        userId: row.user_id,
        name: row.name,
        email: row.email,
        branch: row.branch,
        year: row.year
      }))
    });
  } catch (err) {
    console.error('Error fetching available students:', err);
    res.status(500).json({ error: 'Failed to fetch available students' });
  }
});

// POST - Enroll a student into a course offering (instructor)
router.post('/instructor-enroll', requireLogin, async (req, res) => {
  const { offeringId, studentId } = req.body;

  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can enroll students' });
    }

    if (!offeringId || !studentId) {
      return res.status(400).json({ error: 'Offering and student are required' });
    }

    const offeringSql = `
      SELECT * FROM course_offerings
      WHERE offering_id = ? AND instructor_id = ?
    `;
    const offeringRows = await db.executeQueryRows(offeringSql, [offeringId, req.session.userId]);

    if (!offeringRows.length) {
      return res.status(404).json({ error: 'Course offering not found or not owned by you' });
    }

    const checkSql = 'SELECT * FROM enrollments WHERE offering_id = ? AND student_id = ?';
    const existing = await db.executeQueryRows(checkSql, [offeringId, studentId]);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Student is already enrolled in this course' });
    }

    const insertResult = await db.executeQuery(
      'INSERT INTO enrollments (offering_id, student_id, status) VALUES (?, ?, ?)',
      [offeringId, studentId, 'Active']
    );

    const enrollmentId = insertResult.rows.insertId;
    await db.executeQuery(
      'INSERT INTO grades (enrollment_id) VALUES (?)',
      [enrollmentId]
    );

    await db.executeQuery(
      'UPDATE course_offerings SET enrolled = enrolled + 1 WHERE offering_id = ?',
      [offeringId]
    );

    res.json({ success: true, message: 'Student enrolled successfully' });
  } catch (err) {
    console.error('Error enrolling student:', err);
    res.status(500).json({ error: 'Failed to enroll student' });
  }
});

// GET - Get all faculty/instructors
router.get('/faculty', async (req, res) => {
  try {
    const sql = `
      SELECT user_id, name, email, department
      FROM users
      WHERE role = 'Instructor'
      ORDER BY name
    `;

    const rows = await db.executeQueryRows(sql);

    res.json({
      faculty: rows.map(row => ({
        id: row.user_id,
        name: row.name,
        email: row.email || 'contact@university.edu',
        department: row.department
      }))
    });
  } catch (err) {
    console.error('Error fetching faculty:', err);
    res.status(500).json({ error: 'Failed to fetch faculty' });
  }
});

// GET - Get grades for a student
router.get('/my-grades', requireLogin, async (req, res) => {
  try {
    if (req.session.userRole !== 'Student') {
      return res.status(403).json({ error: 'Only students can view grades' });
    }

    const sql = `
      SELECT c.course_name, c.course_code, g.assignment_grade, g.midterm_grade, 
             g.final_grade, g.overall_grade, g.letter_grade
      FROM enrollments e
      JOIN grades g ON e.enrollment_id = g.enrollment_id
      JOIN course_offerings co ON e.offering_id = co.offering_id
      JOIN courses c ON co.course_id = c.course_id
      WHERE e.student_id = ?
      ORDER BY c.course_name
    `;

    const rows = await db.executeQueryRows(sql, [req.session.userId]);

    res.json({
      grades: rows.map(row => ({
        courseName: row.course_name,
        courseCode: row.course_code,
        assignmentGrade: row.assignment_grade,
        midtermGrade: row.midterm_grade,
        finalGrade: row.final_grade,
        overallGrade: row.overall_grade,
        letterGrade: row.letter_grade
      }))
    });
  } catch (err) {
    console.error('Error fetching grades:', err);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
});

// POST - Upload grade (instructor only)
router.post('/upload-grade', requireLogin, async (req, res) => {
  const { enrollmentId, assignmentGrade, midtermGrade, finalGrade } = req.body;

  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can upload grades' });
    }

    // Calculate overall grade
    const overall = (assignmentGrade * 0.1) + (midtermGrade * 0.3) + (finalGrade * 0.6);
    let letterGrade = 'F';
    if (overall >= 90) letterGrade = 'A';
    else if (overall >= 80) letterGrade = 'B';
    else if (overall >= 70) letterGrade = 'C';
    else if (overall >= 60) letterGrade = 'D';

    const sql = `
      UPDATE grades SET assignment_grade = ?, midterm_grade = ?, 
                       final_grade = ?, overall_grade = ?, 
                       letter_grade = ?, updated_at = CURRENT_TIMESTAMP
      WHERE enrollment_id = ?
    `;

    await db.executeQuery(sql, [
      assignmentGrade,
      midtermGrade,
      finalGrade,
      overall,
      letterGrade,
      enrollmentId
    ]);

    res.json({ success: true, message: 'Grade uploaded successfully' });
  } catch (err) {
    console.error('Grade upload error:', err);
    res.status(500).json({ error: 'Failed to upload grade' });
  }
});

// GET - Get attendance for a course offering
router.get('/attendance/:offeringId', requireLogin, async (req, res) => {
  const { offeringId } = req.params;

  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can view attendance' });
    }

    const sql = `
      SELECT u.name, u.email, a.date, a.status, a.attendance_id
      FROM enrollments e
      JOIN users u ON e.student_id = u.user_id
      LEFT JOIN attendance a ON e.enrollment_id = a.enrollment_id
      WHERE e.offering_id = ?
      ORDER BY u.name, a.date
    `;

    const rows = await db.executeQueryRows(sql, [offeringId]);

    res.json({
      attendance: rows.map(row => ({
        studentName: row.name,
        studentEmail: row.email,
        date: row.date,
        status: row.status || 'Not Marked',
        attendanceId: row.attendance_id
      }))
    });
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// POST - Mark attendance
router.post('/mark-attendance', requireLogin, async (req, res) => {
  const { offeringId, attendanceData } = req.body; // attendanceData: [{enrollmentId, date, status}]

  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can mark attendance' });
    }

    for (const record of attendanceData) {
      const { enrollmentId, date, status } = record;

      const checkSql = 'SELECT * FROM attendance WHERE enrollment_id = ? AND date = ?';
      const existing = await db.executeQueryRows(checkSql, [enrollmentId, date]);

      if (existing.length > 0) {
        // Update
        await db.executeQuery(
          'UPDATE attendance SET status = ?, marked_by = ?, marked_at = CURRENT_TIMESTAMP WHERE enrollment_id = ? AND date = ?',
          [status, req.session.userId, enrollmentId, date]
        );
      } else {
        // Insert
        await db.executeQuery(
          'INSERT INTO attendance (enrollment_id, date, status, marked_by) VALUES (?, ?, ?, ?)',
          [enrollmentId, date, status, req.session.userId]
        );
      }
    }

    res.json({ success: true, message: 'Attendance marked successfully' });
  } catch (err) {
    console.error('Attendance marking error:', err);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// GET - Get assignments for a course offering
router.get('/assignments/:offeringId', requireLogin, async (req, res) => {
  const { offeringId } = req.params;

  try {
    const sql = `
      SELECT a.assignment_id, a.title, a.description, a.due_date, a.max_marks, a.created_at,
             COUNT(asub.submission_id) as submissions_count
      FROM assignments a
      LEFT JOIN assignment_submissions asub ON a.assignment_id = asub.assignment_id
      WHERE a.offering_id = ?
      GROUP BY a.assignment_id
      ORDER BY a.due_date
    `;

    const rows = await db.executeQueryRows(sql, [offeringId]);

    res.json({
      assignments: rows.map(row => ({
        assignmentId: row.assignment_id,
        title: row.title,
        description: row.description,
        dueDate: row.due_date,
        maxMarks: row.max_marks,
        createdAt: row.created_at,
        submissionsCount: row.submissions_count
      }))
    });
  } catch (err) {
    console.error('Error fetching assignments:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// POST - Create assignment
router.post('/create-assignment', requireLogin, async (req, res) => {
  const { offeringId, title, description, dueDate, maxMarks } = req.body;

  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can create assignments' });
    }

    const sql = `
      INSERT INTO assignments (offering_id, title, description, due_date, max_marks, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await db.executeQuery(sql, [
      offeringId,
      title,
      description,
      dueDate,
      maxMarks,
      req.session.userId
    ]);

    res.json({ success: true, message: 'Assignment created successfully' });
  } catch (err) {
    console.error('Assignment creation error:', err);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// GET - Get assignment submissions
router.get('/assignment-submissions/:assignmentId', requireLogin, async (req, res) => {
  const { assignmentId } = req.params;

  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can view submissions' });
    }

    const sql = `
      SELECT u.name, u.email, asub.submission_date, asub.marks_obtained, asub.feedback, asub.submission_id
      FROM assignment_submissions asub
      JOIN users u ON asub.student_id = u.user_id
      WHERE asub.assignment_id = ?
      ORDER BY asub.submission_date
    `;

    const rows = await db.executeQueryRows(sql, [assignmentId]);

    res.json({
      submissions: rows.map(row => ({
        studentName: row.name,
        studentEmail: row.email,
        submissionDate: row.submission_date,
        marksObtained: row.marks_obtained,
        feedback: row.feedback,
        submissionId: row.submission_id
      }))
    });
  } catch (err) {
    console.error('Error fetching submissions:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// POST - Grade assignment submission
router.post('/grade-assignment', requireLogin, async (req, res) => {
  const { submissionId, marks, feedback } = req.body;

  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can grade assignments' });
    }

    const sql = `
      UPDATE assignment_submissions 
      SET marks_obtained = ?, feedback = ?
      WHERE submission_id = ?
    `;

    await db.executeQuery(sql, [marks, feedback, submissionId]);

    res.json({ success: true, message: 'Assignment graded successfully' });
  } catch (err) {
    console.error('Grading error:', err);
    res.status(500).json({ error: 'Failed to grade assignment' });
  }
});

// ===== NEW DASHBOARD ENDPOINTS =====

// GET - User Info
router.get('/user-info', requireLogin, async (req, res) => {
  try {
    const sql = 'SELECT user_id, name, email, role, year, branch, department FROM users WHERE user_id = ?';
    const rows = await db.executeQueryRows(sql, [req.session.userId]);
    
    if (rows.length > 0) {
      const user = rows[0];
      res.json({ 
        success: true, 
        user: {
          id: user.user_id,
          name: user.name,
          email: user.email,
          role: user.role,
          year: user.year,
          branch: user.branch,
          department: user.department
        }
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error('Error fetching user info:', err);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

// GET - Student Courses with Grades
router.get('/student-courses', requireLogin, async (req, res) => {
  try {
    if (req.session.userRole !== 'Student') {
      return res.status(403).json({ error: 'Only students can access this' });
    }

    const sql = `
      SELECT 
        c.course_id,
        c.course_code,
        c.course_name,
        c.year,
        c.branch,
        co.semester,
        u.name as teacher_name,
        g.overall_grade,
        g.assignment_grade,
        g.midterm_grade,
        g.final_grade
      FROM enrollments e
      JOIN course_offerings co ON e.offering_id = co.offering_id
      JOIN courses c ON co.course_id = c.course_id
      JOIN users u ON co.instructor_id = u.user_id
      LEFT JOIN grades g ON e.enrollment_id = g.enrollment_id
      WHERE e.student_id = ? AND e.status = 'Active'
      ORDER BY c.year, c.course_code
    `;

    const rows = await db.executeQueryRows(sql, [req.session.userId]);
    res.json({ 
      success: true, 
      courses: rows.map(row => ({
        courseId: row.course_id,
        courseCode: row.course_code,
        courseName: row.course_name,
        year: row.year,
        branch: row.branch,
        semester: row.semester,
        teacherName: row.teacher_name,
        marks: row.overall_grade || 0,
        assignmentGrade: row.assignment_grade || 0,
        midtermGrade: row.midterm_grade || 0,
        finalGrade: row.final_grade || 0
      }))
    });
  } catch (err) {
    console.error('Error fetching student courses:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// GET - Student Enrollments
router.get('/student-enrollments', requireLogin, async (req, res) => {
  try {
    if (req.session.userRole !== 'Student') {
      return res.status(403).json({ error: 'Only students can access this' });
    }

    const sql = `
      SELECT 
        e.enrollment_id,
        c.course_id,
        c.course_code,
        c.course_name,
        c.year,
        c.branch,
        co.semester,
        u.name as teacher_name,
        e.enrollment_date,
        e.status,
        g.overall_grade,
        g.letter_grade
      FROM enrollments e
      JOIN course_offerings co ON e.offering_id = co.offering_id
      JOIN courses c ON co.course_id = c.course_id
      JOIN users u ON co.instructor_id = u.user_id
      LEFT JOIN grades g ON e.enrollment_id = g.enrollment_id
      WHERE e.student_id = ?
      ORDER BY c.year DESC, c.course_code
    `;

    const rows = await db.executeQueryRows(sql, [req.session.userId]);
    res.json({ 
      success: true, 
      enrollments: rows.map(row => ({
        enrollmentId: row.enrollment_id,
        courseId: row.course_id,
        courseCode: row.course_code,
        courseName: row.course_name,
        year: row.year,
        branch: row.branch,
        semester: row.semester,
        teacherName: row.teacher_name,
        enrollmentDate: row.enrollment_date,
        status: row.status,
        grade: row.letter_grade || 'N/A',
        marks: row.overall_grade || 0
      }))
    });
  } catch (err) {
    console.error('Error fetching enrollments:', err);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// GET - Student Assignments grouped by Subject
router.get('/student-assignments', requireLogin, async (req, res) => {
  try {
    if (req.session.userRole !== 'Student') {
      return res.status(403).json({ error: 'Only students can access this' });
    }

    const sql = `
      SELECT 
        a.assignment_id,
        a.title,
        a.description,
        a.due_date,
        a.max_marks,
        c.course_id,
        c.course_code,
        c.course_name,
        asub.marks_obtained,
        asub.feedback,
        asub.submission_date
      FROM assignments a
      JOIN course_offerings co ON a.offering_id = co.offering_id
      JOIN courses c ON co.course_id = c.course_id
      JOIN enrollments e ON e.offering_id = co.offering_id
      LEFT JOIN assignment_submissions asub ON a.assignment_id = asub.assignment_id AND asub.student_id = ?
      WHERE e.student_id = ? AND e.status = 'Active'
      ORDER BY c.course_code, a.due_date DESC
    `;

    const rows = await db.executeQueryRows(sql, [req.session.userId, req.session.userId]);
    
    // Group by subject (course)
    const assignmentsBySubject = {};
    rows.forEach(row => {
      const courseKey = row.course_code;
      if (!assignmentsBySubject[courseKey]) {
        assignmentsBySubject[courseKey] = {
          courseCode: row.course_code,
          courseName: row.course_name,
          courseId: row.course_id,
          assignments: []
        };
      }
      assignmentsBySubject[courseKey].assignments.push({
        assignmentId: row.assignment_id,
        title: row.title,
        description: row.description,
        dueDate: row.due_date,
        maxMarks: row.max_marks,
        marksObtained: row.marks_obtained || null,
        feedback: row.feedback || null,
        submissionDate: row.submission_date || null,
        isSubmitted: row.marks_obtained !== null
      });
    });

    res.json({ 
      success: true, 
      assignmentsBySubject: Object.values(assignmentsBySubject)
    });
  } catch (err) {
    console.error('Error fetching assignments:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET - Instructor/Teacher Courses
router.get('/instructor-courses', requireLogin, async (req, res) => {
  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can access this' });
    }

    const sql = `
      SELECT 
        co.offering_id,
        c.course_id,
        c.course_code,
        c.course_name,
        c.year,
        c.branch,
        co.semester,
        COUNT(DISTINCT e.student_id) as student_count,
        COUNT(DISTINCT a.assignment_id) as assignment_count
      FROM course_offerings co
      JOIN courses c ON co.course_id = c.course_id
      LEFT JOIN enrollments e ON co.offering_id = e.offering_id
      LEFT JOIN assignments a ON co.offering_id = a.offering_id
      WHERE co.instructor_id = ?
      GROUP BY co.offering_id, c.course_id
      ORDER BY c.year, c.course_code
    `;

    const rows = await db.executeQueryRows(sql, [req.session.userId]);
    res.json({ 
      success: true, 
      courses: rows.map(row => ({
        offeringId: row.offering_id,
        courseId: row.course_id,
        courseCode: row.course_code,
        courseName: row.course_name,
        year: row.year,
        branch: row.branch,
        semester: row.semester,
        studentCount: row.student_count || 0,
        assignmentCount: row.assignment_count || 0
      }))
    });
  } catch (err) {
    console.error('Error fetching instructor courses:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// GET - Teacher Enrollments (Recent Students)
router.get('/teacher-enrollments', requireLogin, async (req, res) => {
  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can access this' });
    }

    const sql = `
      SELECT 
        e.enrollment_id,
        u.user_id,
        u.name as student_name,
        u.email,
        u.year,
        u.branch,
        c.course_id,
        c.course_code,
        c.course_name,
        co.semester,
        e.enrollment_date,
        e.status,
        g.overall_grade,
        g.letter_grade
      FROM enrollments e
      JOIN course_offerings co ON e.offering_id = co.offering_id
      JOIN courses c ON co.course_id = c.course_id
      JOIN users u ON e.student_id = u.user_id
      LEFT JOIN grades g ON e.enrollment_id = g.enrollment_id
      WHERE co.instructor_id = ?
      ORDER BY e.enrollment_date DESC
      LIMIT 50
    `;

    const rows = await db.executeQueryRows(sql, [req.session.userId]);
    res.json({ 
      success: true, 
      enrollments: rows.map(row => ({
        enrollmentId: row.enrollment_id,
        studentId: row.user_id,
        studentName: row.student_name,
        email: row.email,
        year: row.year,
        branch: row.branch,
        courseCode: row.course_code,
        courseName: row.course_name,
        semester: row.semester,
        enrollmentDate: row.enrollment_date,
        status: row.status,
        grade: row.letter_grade || 'N/A',
        marks: row.overall_grade || 0
      }))
    });
  } catch (err) {
    console.error('Error fetching teacher enrollments:', err);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// ==================== ASSIGNMENTS ROUTES ====================

// GET - Get all assignments for a course
router.get('/assignments/:offeringId', requireLogin, async (req, res) => {
  const { offeringId } = req.params;

  try {
    const sql = `
      SELECT a.assignment_id, a.title, a.description, a.due_date, a.max_marks, a.created_at,
             u.name as created_by_name, c.course_name
      FROM assignments a
      JOIN users u ON a.created_by = u.user_id
      JOIN course_offerings co ON a.offering_id = co.offering_id
      JOIN courses c ON co.course_id = c.course_id
      WHERE a.offering_id = ?
      ORDER BY a.due_date DESC
    `;

    const rows = await db.executeQueryRows(sql, [offeringId]);

    res.json({
      assignments: rows.map(row => ({
        assignmentId: row.assignment_id,
        title: row.title,
        description: row.description,
        dueDate: row.due_date,
        maxMarks: row.max_marks,
        createdAt: row.created_at,
        createdByName: row.created_by_name,
        courseName: row.course_name
      }))
    });
  } catch (err) {
    console.error('Error fetching assignments:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET - Get student's assignments for enrolled courses
router.get('/my-assignments', requireLogin, async (req, res) => {
  try {
    if (req.session.userRole !== 'Student') {
      return res.status(403).json({ error: 'Only students can view assignments' });
    }

    const sql = `
      SELECT a.assignment_id, a.title, a.description, a.due_date, a.max_marks,
             c.course_name, c.course_code, u.name as instructor_name,
             CASE WHEN asub.submission_id IS NOT NULL THEN 'Submitted' ELSE 'Not Submitted' END as status,
             asub.submission_date, asub.marks_obtained, asub.feedback
      FROM assignments a
      JOIN course_offerings co ON a.offering_id = co.offering_id
      JOIN courses c ON co.course_id = c.course_id
      JOIN users u ON co.instructor_id = u.user_id
      JOIN enrollments e ON co.offering_id = e.offering_id
      LEFT JOIN assignment_submissions asub ON a.assignment_id = asub.assignment_id AND asub.student_id = ?
      WHERE e.student_id = ?
      ORDER BY a.due_date DESC
    `;

    const rows = await db.executeQueryRows(sql, [req.session.userId, req.session.userId]);

    res.json({
      assignments: rows.map(row => ({
        assignmentId: row.assignment_id,
        title: row.title,
        description: row.description,
        dueDate: row.due_date,
        maxMarks: row.max_marks,
        courseName: row.course_name,
        courseCode: row.course_code,
        instructorName: row.instructor_name,
        status: row.status,
        submissionDate: row.submission_date,
        marksObtained: row.marks_obtained,
        feedback: row.feedback
      }))
    });
  } catch (err) {
    console.error('Error fetching student assignments:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// POST - Create new assignment (instructor only)
router.post('/create-assignment', requireLogin, async (req, res) => {
  const { offeringId, title, description, dueDate, maxMarks } = req.body;

  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can create assignments' });
    }

    if (!offeringId || !title || !dueDate) {
      return res.status(400).json({ error: 'offeringId, title, and dueDate are required' });
    }

    const assignmentId = Math.floor(Math.random() * 1000000);
    const sql = `
      INSERT INTO assignments (assignment_id, offering_id, title, description, due_date, max_marks, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await db.executeQuery(sql, [
      assignmentId,
      offeringId,
      title,
      description || null,
      dueDate,
      maxMarks || 100,
      req.session.userId
    ]);

    res.json({ success: true, message: 'Assignment created successfully', assignmentId });
  } catch (err) {
    console.error('Error creating assignment:', err);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// POST - Submit assignment (student upload)
router.post('/submit-assignment', requireLogin, async (req, res) => {
  const { assignmentId } = req.body;

  try {
    if (req.session.userRole !== 'Student') {
      return res.status(403).json({ error: 'Only students can submit assignments' });
    }

    if (!assignmentId) {
      return res.status(400).json({ error: 'assignmentId is required' });
    }

    // Check if already submitted
    const checkSql = 'SELECT * FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?';
    const existing = await db.executeQueryRows(checkSql, [assignmentId, req.session.userId]);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'You have already submitted this assignment' });
    }

    // Create submission record
    const submissionId = Math.floor(Math.random() * 1000000);
    const insertSql = `
      INSERT INTO assignment_submissions (submission_id, assignment_id, student_id, file_path)
      VALUES (?, ?, ?, ?)
    `;

    await db.executeQuery(insertSql, [
      submissionId,
      assignmentId,
      req.session.userId,
      null // File path can be stored here later if needed
    ]);

    res.json({ success: true, message: 'Assignment submitted successfully!' });
  } catch (err) {
    console.error('Error submitting assignment:', err);
    res.status(500).json({ error: 'Failed to submit assignment' });
  }
});

// GET - Get assignment submissions (instructor)
router.get('/assignment-submissions/:assignmentId', requireLogin, async (req, res) => {
  const { assignmentId } = req.params;

  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can view submissions' });
    }

    const sql = `
      SELECT asub.submission_id, asub.assignment_id, asub.student_id, u.name, u.email,
             asub.submission_date, asub.marks_obtained, asub.feedback
      FROM assignment_submissions asub
      JOIN users u ON asub.student_id = u.user_id
      WHERE asub.assignment_id = ?
      ORDER BY asub.submission_date DESC
    `;

    const rows = await db.executeQueryRows(sql, [assignmentId]);

    res.json({
      submissions: rows.map(row => ({
        submissionId: row.submission_id,
        assignmentId: row.assignment_id,
        studentId: row.student_id,
        studentName: row.name,
        studentEmail: row.email,
        submissionDate: row.submission_date,
        marksObtained: row.marks_obtained,
        feedback: row.feedback
      }))
    });
  } catch (err) {
    console.error('Error fetching submissions:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// POST - Grade submission (instructor)
router.post('/grade-submission', requireLogin, async (req, res) => {
  const { submissionId, marks, feedback } = req.body;

  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can grade submissions' });
    }

    if (!submissionId || marks === undefined) {
      return res.status(400).json({ error: 'submissionId and marks are required' });
    }

    const sql = `
      UPDATE assignment_submissions
      SET marks_obtained = ?, feedback = ?
      WHERE submission_id = ?
    `;

    await db.executeQuery(sql, [marks, feedback || null, submissionId]);

    res.json({ success: true, message: 'Submission graded successfully' });
  } catch (err) {
    console.error('Error grading submission:', err);
    res.status(500).json({ error: 'Failed to grade submission' });
  }
});

// GET - Get all assignments for logged-in student (across all enrolled courses)
router.get('/my-assignments', requireLogin, async (req, res) => {
  try {
    if (req.session.userRole !== 'Student') {
      return res.status(403).json({ error: 'Only students can view their assignments' });
    }

    const sql = `
      SELECT DISTINCT
             a.assignment_id,
             a.title,
             a.description,
             a.due_date,
             a.max_marks,
             a.created_at,
             c.course_code,
             c.course_name,
             u.name as instructor_name,
             co.offering_id,
             asub.submission_id,
             asub.submission_date,
             asub.marks_obtained,
             asub.feedback,
             CASE WHEN asub.submission_id IS NOT NULL THEN 'Submitted' ELSE 'Pending' END as status
      FROM assignments a
      JOIN course_offerings co ON a.offering_id = co.offering_id
      JOIN courses c ON co.course_id = c.course_id
      JOIN users u ON co.instructor_id = u.user_id
      JOIN enrollments e ON co.offering_id = e.offering_id
      LEFT JOIN assignment_submissions asub ON a.assignment_id = asub.assignment_id AND asub.student_id = ?
      WHERE e.student_id = ? AND e.status = 'Active'
      ORDER BY a.due_date DESC
    `;

    const rows = await db.executeQueryRows(sql, [req.session.userId, req.session.userId]);

    res.json({
      assignments: rows.map(row => ({
        assignmentId: row.assignment_id,
        title: row.title,
        description: row.description,
        dueDate: row.due_date,
        maxMarks: row.max_marks,
        createdAt: row.created_at,
        courseCode: row.course_code,
        courseName: row.course_name,
        instructorName: row.instructor_name,
        offeringId: row.offering_id,
        submissionId: row.submission_id,
        submissionDate: row.submission_date,
        marksObtained: row.marks_obtained,
        feedback: row.feedback,
        status: row.status
      }))
    });
  } catch (err) {
    console.error('Error fetching student assignments:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET - Get assignments grouped by subject (for student assignments page)
router.get('/assignments-by-subject', requireLogin, async (req, res) => {
  try {
    if (req.session.userRole !== 'Student') {
      return res.status(403).json({ error: 'Only students can view assignments' });
    }

    // Get all enrolled courses
    const coursesSql = `
      SELECT DISTINCT
             co.offering_id,
             c.course_id,
             c.course_code,
             c.course_name,
             u.name as instructor_name,
             COUNT(a.assignment_id) as assignment_count,
             SUM(CASE WHEN asub.submission_id IS NOT NULL THEN 1 ELSE 0 END) as submitted_count
      FROM enrollments e
      JOIN course_offerings co ON e.offering_id = co.offering_id
      JOIN courses c ON co.course_id = c.course_id
      JOIN users u ON co.instructor_id = u.user_id
      LEFT JOIN assignments a ON co.offering_id = a.offering_id
      LEFT JOIN assignment_submissions asub ON a.assignment_id = asub.assignment_id AND asub.student_id = ?
      WHERE e.student_id = ? AND e.status = 'Active'
      GROUP BY co.offering_id, c.course_id, c.course_code, c.course_name, u.name
      ORDER BY c.course_name
    `;

    const courses = await db.executeQueryRows(coursesSql, [req.session.userId, req.session.userId]);

    res.json({
      subjects: courses.map(row => ({
        offeringId: row.offering_id,
        courseId: row.course_id,
        courseCode: row.course_code,
        courseName: row.course_name,
        instructorName: row.instructor_name,
        totalAssignments: row.assignment_count || 0,
        submittedAssignments: row.submitted_count || 0,
        pendingAssignments: (row.assignment_count || 0) - (row.submitted_count || 0)
      }))
    });
  } catch (err) {
    console.error('Error fetching assignments by subject:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET - Get assignments for a specific subject (with submission details)
router.get('/subject-assignments/:offeringId', requireLogin, async (req, res) => {
  try {
    if (req.session.userRole !== 'Student') {
      return res.status(403).json({ error: 'Only students can view assignments' });
    }

    const { offeringId } = req.params;

    // Check if student is enrolled in this course
    const enrollmentSql = `
      SELECT * FROM enrollments
      WHERE student_id = ? AND offering_id = ? AND status = 'Active'
    `;
    const enrollment = await db.executeQueryRows(enrollmentSql, [req.session.userId, offeringId]);

    if (enrollment.length === 0) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }

    const assignmentsSql = `
      SELECT 
             a.assignment_id,
             a.title,
             a.description,
             a.due_date,
             a.max_marks,
             c.course_code,
             c.course_name,
             asub.submission_id,
             asub.submission_date,
             asub.marks_obtained,
             asub.feedback,
             CASE WHEN asub.submission_id IS NOT NULL THEN 'Submitted' ELSE 'Pending' END as status
      FROM assignments a
      JOIN course_offerings co ON a.offering_id = co.offering_id
      JOIN courses c ON co.course_id = c.course_id
      LEFT JOIN assignment_submissions asub ON a.assignment_id = asub.assignment_id AND asub.student_id = ?
      WHERE a.offering_id = ?
      ORDER BY a.due_date DESC
    `;

    const assignments = await db.executeQueryRows(assignmentsSql, [req.session.userId, offeringId]);

    res.json({
      assignments: assignments.map(row => ({
        assignmentId: row.assignment_id,
        title: row.title,
        description: row.description,
        dueDate: row.due_date,
        maxMarks: row.max_marks,
        courseCode: row.course_code,
        courseName: row.course_name,
        submissionId: row.submission_id,
        submissionDate: row.submission_date,
        marksObtained: row.marks_obtained,
        feedback: row.feedback,
        status: row.status
      }))
    });
  } catch (err) {
    console.error('Error fetching subject assignments:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// POST - Submit assignment
router.post('/submit-assignment', requireLogin, async (req, res) => {
  try {
    if (req.session.userRole !== 'Student') {
      return res.status(403).json({ error: 'Only students can submit assignments' });
    }

    const { assignmentId, filePath } = req.body;

    if (!assignmentId) {
      return res.status(400).json({ error: 'assignmentId is required' });
    }

    // Check if already submitted
    const checkSql = `
      SELECT * FROM assignment_submissions
      WHERE assignment_id = ? AND student_id = ?
    `;
    const existing = await db.executeQueryRows(checkSql, [assignmentId, req.session.userId]);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'You have already submitted this assignment' });
    }

    // Insert submission
    const insertSql = `
      INSERT INTO assignment_submissions (assignment_id, student_id, file_path, submission_date)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `;

    await db.executeQuery(insertSql, [assignmentId, req.session.userId, filePath || null]);

    res.json({ success: true, message: 'Assignment submitted successfully' });
  } catch (err) {
    console.error('Assignment submission error:', err);
    res.status(500).json({ error: 'Failed to submit assignment' });
  }
});

// GET - Get student's submission history
router.get('/my-assignment-submissions', requireLogin, async (req, res) => {
  try {
    if (req.session.userRole !== 'Student') {
      return res.status(403).json({ error: 'Only students can view their submissions' });
    }

    const sql = `
      SELECT 
             a.assignment_id,
             a.title,
             c.course_code,
             c.course_name,
             a.due_date,
             a.max_marks,
             asub.submission_date,
             asub.marks_obtained,
             asub.feedback,
             asub.file_path,
             CASE WHEN asub.marks_obtained IS NOT NULL THEN 'Graded' ELSE 'Pending Review' END as review_status
      FROM assignment_submissions asub
      JOIN assignments a ON asub.assignment_id = a.assignment_id
      JOIN course_offerings co ON a.offering_id = co.offering_id
      JOIN courses c ON co.course_id = c.course_id
      WHERE asub.student_id = ?
      ORDER BY asub.submission_date DESC
    `;

    const rows = await db.executeQueryRows(sql, [req.session.userId]);

    res.json({
      submissions: rows.map(row => ({
        assignmentId: row.assignment_id,
        title: row.title,
        courseCode: row.course_code,
        courseName: row.course_name,
        dueDate: row.due_date,
        maxMarks: row.max_marks,
        submissionDate: row.submission_date,
        marksObtained: row.marks_obtained,
        feedback: row.feedback,
        filePath: row.file_path,
        reviewStatus: row.review_status
      }))
    });
  } catch (err) {
    console.error('Error fetching submissions:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

module.exports = router;
