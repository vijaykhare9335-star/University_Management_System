// Comprehensive API Routes - Enhanced Features
// Teacher-Student mapping, Attendance, Assignments, Results & Certificates

const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware
const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// ============= TEACHER ASSIGNMENT ENDPOINTS =============

// GET - Get teacher's subjects with enrolled students (for a specific student like y2comp1)
router.get('/student-teachers/:studentId', requireLogin, async (req, res) => {
  const { studentId } = req.params;
  
  try {
    const sql = `
      SELECT DISTINCT 
        u.user_id as teacher_id,
        u.name as teacher_name,
        u.email as teacher_email,
        c.course_id,
        c.course_code,
        c.course_name,
        co.offering_id,
        COUNT(DISTINCT e.student_id) as total_students_enrolled
      FROM enrollments e
      JOIN course_offerings co ON e.offering_id = co.offering_id
      JOIN courses c ON co.course_id = c.course_id
      JOIN users u ON co.instructor_id = u.user_id
      WHERE e.student_id = ? AND e.status = 'Active'
      GROUP BY co.offering_id, u.user_id
      ORDER BY c.course_name
    `;

    const rows = await db.executeQueryRows(sql, [studentId]);

    res.json({
      success: true,
      teacherSubjects: rows.map(row => ({
        teacherId: row.teacher_id,
        teacherName: row.teacher_name,
        teacherEmail: row.teacher_email,
        courseId: row.course_id,
        courseCode: row.course_code,
        courseName: row.course_name,
        offeringId: row.offering_id,
        enrolledStudents: row.total_students_enrolled
      }))
    });
  } catch (err) {
    console.error('Error fetching teacher assignments:', err);
    res.status(500).json({ error: 'Failed to fetch teacher information' });
  }
});

// GET - Get teacher's students for a subject
router.get('/teacher-students/:offeringId', requireLogin, async (req, res) => {
  const { offeringId } = req.params;

  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can access this' });
    }

    const sql = `
      SELECT u.user_id, u.name, u.email, u.year, u.branch, e.enrollment_id
      FROM enrollments e
      JOIN users u ON e.student_id = u.user_id
      WHERE e.offering_id = ? AND e.status = 'Active'
      ORDER BY u.name
    `;

    const rows = await db.executeQueryRows(sql, [offeringId]);

    res.json({
      success: true,
      students: rows.map(row => ({
        studentId: row.user_id,
        studentName: row.name,
        studentEmail: row.email,
        year: row.year,
        branch: row.branch,
        enrollmentId: row.enrollment_id
      })),
      totalCount: rows.length
    });
  } catch (err) {
    console.error('Error fetching teacher students:', err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// ============= ATTENDANCE ENDPOINTS =============

// GET - Get student's attendance records (by date and subject)
router.get('/my-attendance', requireLogin, async (req, res) => {
  try {
    if (req.session.userRole !== 'Student') {
      return res.status(403).json({ error: 'Only students can view attendance' });
    }

    const sql = `
      SELECT 
        c.course_name,
        c.course_code,
        a.date,
        a.status,
        u.name as marked_by_name
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.enrollment_id
      JOIN course_offerings co ON e.offering_id = co.offering_id
      JOIN courses c ON co.course_id = c.course_id
      JOIN users u ON a.marked_by = u.user_id
      WHERE e.student_id = ?
      ORDER BY c.course_name, a.date DESC
    `;

    const rows = await db.executeQueryRows(sql, [req.session.userId]);

    // Group by subject
    const attendanceBySubject = {};
    rows.forEach(row => {
      if (!attendanceBySubject[row.course_name]) {
        attendanceBySubject[row.course_name] = {
          courseCode: row.course_code,
          records: [],
          presentCount: 0,
          absentCount: 0
        };
      }
      attendanceBySubject[row.course_name].records.push({
        date: row.date,
        status: row.status,
        markedBy: row.marked_by_name
      });
      if (row.status === 'Present') {
        attendanceBySubject[row.course_name].presentCount++;
      } else {
        attendanceBySubject[row.course_name].absentCount++;
      }
    });

    res.json({
      success: true,
      attendance: attendanceBySubject
    });
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// GET - Get attendance for specific subject by date
router.get('/attendance-by-subject/:offeringId', requireLogin, async (req, res) => {
  const { offeringId } = req.params;

  try {
    if (req.session.userRole === 'Student') {
      // Student viewing their own attendance
      const sql = `
        SELECT a.date, a.status
        FROM attendance a
        JOIN enrollments e ON a.enrollment_id = e.enrollment_id
        WHERE e.offering_id = ? AND e.student_id = ?
        ORDER BY a.date DESC
      `;
      const rows = await db.executeQueryRows(sql, [offeringId, req.session.userId]);
      return res.json({ success: true, attendance: rows });
    } else if (req.session.userRole === 'Instructor') {
      // Teacher viewing all students' attendance
      const sql = `
        SELECT u.user_id, u.name, a.date, a.status
        FROM enrollments e
        JOIN users u ON e.student_id = u.user_id
        LEFT JOIN attendance a ON e.enrollment_id = a.enrollment_id
        WHERE e.offering_id = ?
        ORDER BY u.name, a.date DESC
      `;
      const rows = await db.executeQueryRows(sql, [offeringId]);
      return res.json({ success: true, attendance: rows });
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// POST - Mark attendance for multiple students
router.post('/mark-attendance', requireLogin, async (req, res) => {
  const { offeringId, date, attendanceRecords } = req.body;

  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can mark attendance' });
    }

    for (const record of attendanceRecords) {
      const { enrollmentId, status } = record;

      // Check if already exists
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

// ============= ASSIGNMENT ENDPOINTS =============

// GET - Get assignments for student (filtered by subject)
router.get('/my-assignments', requireLogin, async (req, res) => {
  try {
    if (req.session.userRole !== 'Student') {
      return res.status(403).json({ error: 'Only students can view assignments' });
    }

    const sql = `
      SELECT 
        a.assignment_id,
        a.title,
        a.description,
        a.due_date,
        a.max_marks,
        c.course_name,
        c.course_code,
        co.offering_id,
        u.name as teacher_name,
        asub.submission_id,
        asub.marks_obtained,
        asub.submission_date,
        asub.feedback,
        asub.file_path
      FROM assignments a
      JOIN course_offerings co ON a.offering_id = co.offering_id
      JOIN courses c ON co.course_id = c.course_id
      JOIN users u ON co.instructor_id = u.user_id
      JOIN enrollments e ON co.offering_id = e.offering_id
      LEFT JOIN assignment_submissions asub ON a.assignment_id = asub.assignment_id AND asub.student_id = ?
      WHERE e.student_id = ? AND e.status = 'Active'
      ORDER BY c.course_name, a.due_date DESC
    `;

    const rows = await db.executeQueryRows(sql, [req.session.userId, req.session.userId]);

    const assignmentsBySubject = {};
    rows.forEach(row => {
      if (!assignmentsBySubject[row.course_name]) {
        assignmentsBySubject[row.course_name] = {
          courseCode: row.course_code,
          offeringId: row.offering_id,
          teacherName: row.teacher_name,
          assignments: []
        };
      }
      assignmentsBySubject[row.course_name].assignments.push({
        assignmentId: row.assignment_id,
        title: row.title,
        description: row.description,
        dueDate: row.due_date,
        maxMarks: row.max_marks,
        submitted: !!row.submission_id,
        submissionDate: row.submission_date,
        marksObtained: row.marks_obtained,
        feedback: row.feedback,
        filePath: row.file_path
      });
    });

    res.json({
      success: true,
      assignments: assignmentsBySubject
    });
  } catch (err) {
    console.error('Error fetching assignments:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET - Get assignments for teacher's subject
router.get('/teacher-assignments/:offeringId', requireLogin, async (req, res) => {
  const { offeringId } = req.params;

  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can access this' });
    }

    const sql = `
      SELECT a.assignment_id, a.title, a.description, a.due_date, a.max_marks,
             COUNT(asub.submission_id) as submitted_count
      FROM assignments a
      LEFT JOIN assignment_submissions asub ON a.assignment_id = asub.assignment_id
      WHERE a.offering_id = ?
      GROUP BY a.assignment_id
      ORDER BY a.due_date DESC
    `;

    const rows = await db.executeQueryRows(sql, [offeringId]);

    res.json({
      success: true,
      assignments: rows.map(row => ({
        assignmentId: row.assignment_id,
        title: row.title,
        description: row.description,
        dueDate: row.due_date,
        maxMarks: row.max_marks,
        submittedCount: row.submitted_count
      }))
    });
  } catch (err) {
    console.error('Error fetching assignments:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// POST - Create assignment (instructor)
router.post('/create-assignment', requireLogin, async (req, res) => {
  const { offeringId, title, description, dueDate, maxMarks } = req.body;

  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can create assignments' });
    }

    await db.executeQuery(
      `INSERT INTO assignments (offering_id, title, description, due_date, max_marks, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [offeringId, title, description, dueDate, maxMarks, req.session.userId]
    );

    res.json({ success: true, message: 'Assignment created successfully' });
  } catch (err) {
    console.error('Error creating assignment:', err);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// POST - Submit assignment
router.post('/submit-assignment', requireLogin, async (req, res) => {
  const { assignmentId, filePath } = req.body;

  try {
    if (req.session.userRole !== 'Student') {
      return res.status(403).json({ error: 'Only students can submit assignments' });
    }

    // Check if already submitted
    const checkSql = 'SELECT * FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?';
    const existing = await db.executeQueryRows(checkSql, [assignmentId, req.session.userId]);

    if (existing.length > 0) {
      // Update
      await db.executeQuery(
        `UPDATE assignment_submissions SET file_path = ?, submission_date = CURRENT_TIMESTAMP 
         WHERE assignment_id = ? AND student_id = ?`,
        [filePath, assignmentId, req.session.userId]
      );
    } else {
      // Insert
      await db.executeQuery(
        `INSERT INTO assignment_submissions (assignment_id, student_id, file_path, submission_date)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [assignmentId, req.session.userId, filePath]
      );
    }

    res.json({ success: true, message: 'Assignment submitted successfully' });
  } catch (err) {
    console.error('Error submitting assignment:', err);
    res.status(500).json({ error: 'Failed to submit assignment' });
  }
});

// POST - Grade assignment
router.post('/grade-assignment', requireLogin, async (req, res) => {
  const { submissionId, marksObtained, feedback } = req.body;

  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can grade assignments' });
    }

    await db.executeQuery(
      `UPDATE assignment_submissions SET marks_obtained = ?, feedback = ? WHERE submission_id = ?`,
      [marksObtained, feedback, submissionId]
    );

    res.json({ success: true, message: 'Assignment graded successfully' });
  } catch (err) {
    console.error('Error grading assignment:', err);
    res.status(500).json({ error: 'Failed to grade assignment' });
  }
});

// GET - Get submission details for teacher
router.get('/assignment-submissions/:assignmentId', requireLogin, async (req, res) => {
  const { assignmentId } = req.params;

  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can access this' });
    }

    const sql = `
      SELECT u.user_id, u.name, asub.submission_id, asub.marks_obtained, 
             asub.feedback, asub.submission_date, asub.file_path
      FROM assignment_submissions asub
      JOIN users u ON asub.student_id = u.user_id
      WHERE asub.assignment_id = ?
      ORDER BY u.name
    `;

    const rows = await db.executeQueryRows(sql, [assignmentId]);

    res.json({
      success: true,
      submissions: rows.map(row => ({
        studentId: row.user_id,
        studentName: row.name,
        submissionId: row.submission_id,
        marksObtained: row.marks_obtained,
        feedback: row.feedback,
        submissionDate: row.submission_date,
        filePath: row.file_path
      }))
    });
  } catch (err) {
    console.error('Error fetching submissions:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// ============= SUBJECT-WISE GRADES ENDPOINTS =============

// GET - Get subject-wise grades for student
router.get('/subject-wise-grades', requireLogin, async (req, res) => {
  try {
    if (req.session.userRole !== 'Student') {
      return res.status(403).json({ error: 'Only students can view grades' });
    }

    const sql = `
      SELECT 
        c.course_name,
        c.course_code,
        co.offering_id,
        u.name as teacher_name,
        g.assignment_grade,
        g.midterm_grade,
        g.final_grade,
        g.overall_grade,
        g.letter_grade,
        (SELECT COUNT(*) FROM assignment_submissions WHERE student_id = ? 
         AND assignment_id IN (SELECT assignment_id FROM assignments WHERE offering_id = co.offering_id)) as assignments_submitted
      FROM enrollments e
      JOIN course_offerings co ON e.offering_id = co.offering_id
      JOIN courses c ON co.course_id = c.course_id
      JOIN users u ON co.instructor_id = u.user_id
      LEFT JOIN grades g ON e.enrollment_id = g.enrollment_id
      WHERE e.student_id = ? AND e.status = 'Active'
      ORDER BY c.course_name
    `;

    const rows = await db.executeQueryRows(sql, [req.session.userId, req.session.userId]);

    res.json({
      success: true,
      subjectGrades: rows.map(row => ({
        courseName: row.course_name,
        courseCode: row.course_code,
        offeringId: row.offering_id,
        teacherName: row.teacher_name,
        assignmentGrade: row.assignment_grade,
        midtermGrade: row.midterm_grade,
        finalGrade: row.final_grade,
        overallGrade: row.overall_grade,
        letterGrade: row.letter_grade,
        assignmentsSubmitted: row.assignments_submitted
      }))
    });
  } catch (err) {
    console.error('Error fetching subject-wise grades:', err);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
});

// ============= RESULTS & CERTIFICATES =============

// GET - Get results for student
router.get('/my-results', requireLogin, async (req, res) => {
  try {
    if (req.session.userRole !== 'Student') {
      return res.status(403).json({ error: 'Only students can view results' });
    }

    const sql = `
      SELECT r.result_id, c.course_name, c.course_code, r.assignment_marks, 
             r.midterm_marks, r.final_marks, r.total_marks, r.grade, r.semester,
             r.academic_year, r.published_date
      FROM results r
      JOIN enrollments e ON r.enrollment_id = e.enrollment_id
      JOIN course_offerings co ON e.offering_id = co.offering_id
      JOIN courses c ON co.course_id = c.course_id
      WHERE e.student_id = ?
      ORDER BY r.academic_year DESC, r.semester DESC
    `;

    const rows = await db.executeQueryRows(sql, [req.session.userId]);

    res.json({
      success: true,
      results: rows.map(row => ({
        resultId: row.result_id,
        courseName: row.course_name,
        courseCode: row.course_code,
        assignmentMarks: row.assignment_marks,
        midtermMarks: row.midterm_marks,
        finalMarks: row.final_marks,
        totalMarks: row.total_marks,
        grade: row.grade,
        semester: row.semester,
        academicYear: row.academic_year,
        publishedDate: row.published_date
      }))
    });
  } catch (err) {
    console.error('Error fetching results:', err);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// POST - Publish results (instructor)
router.post('/publish-results', requireLogin, async (req, res) => {
  const { offeringId, semester, academicYear } = req.body;

  try {
    if (req.session.userRole !== 'Instructor') {
      return res.status(403).json({ error: 'Only instructors can publish results' });
    }

    const sql = `
      INSERT INTO results (enrollment_id, assignment_marks, midterm_marks, final_marks, total_marks, grade, semester, academic_year)
      SELECT e.enrollment_id, g.assignment_grade, g.midterm_grade, g.final_grade, g.overall_grade, g.letter_grade, ?, ?
      FROM enrollments e
      JOIN grades g ON e.enrollment_id = g.enrollment_id
      WHERE e.offering_id = ? AND g.overall_grade IS NOT NULL
    `;

    await db.executeQuery(sql, [semester, academicYear, offeringId]);

    res.json({ success: true, message: 'Results published successfully' });
  } catch (err) {
    console.error('Error publishing results:', err);
    res.status(500).json({ error: 'Failed to publish results' });
  }
});

// GET - Generate certificate HTML for download
router.get('/certificate/:enrollmentId', requireLogin, async (req, res) => {
  const { enrollmentId } = req.params;

  try {
    const sql = `
      SELECT u.name, u.year, c.course_name, r.grade, r.total_marks, 
             r.academic_year, r.semester
      FROM enrollments e
      JOIN users u ON e.student_id = u.user_id
      JOIN results r ON e.enrollment_id = r.enrollment_id
      JOIN course_offerings co ON e.offering_id = co.offering_id
      JOIN courses c ON co.course_id = c.course_id
      WHERE e.enrollment_id = ? AND (? = e.student_id OR ? = (SELECT instructor_id FROM course_offerings WHERE offering_id = e.offering_id))
    `;

    const rows = await db.executeQueryRows(sql, [enrollmentId, req.session.userId, req.session.userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Result not found' });
    }

    const result = rows[0];
    const certificateHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Certificate - ${result.name}</title>
    <style>
        body { font-family: 'Georgia', serif; margin: 0; padding: 20px; }
        .certificate-container {
            width: 900px;
            height: 600px;
            margin: 0 auto;
            border: 10px solid #2c3e50;
            padding: 40px;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            position: relative;
        }
        .certificate-header {
            text-align: center;
            margin-bottom: 30px;
        }
        .university-name {
            font-size: 32px;
            font-weight: bold;
            color: #2c3e50;
            margin: 0;
        }
        .certificate-title {
            font-size: 48px;
            font-weight: bold;
            color: #e74c3c;
            margin: 20px 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }
        .certificate-body {
            text-align: center;
            margin: 40px 0;
        }
        .certificate-body p {
            font-size: 16px;
            margin: 15px 0;
        }
        .student-name {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
            text-decoration: underline;
            margin: 20px 0;
        }
        .course-details {
            margin: 30px 0;
            border-top: 2px solid #2c3e50;
            border-bottom: 2px solid #2c3e50;
            padding: 20px;
        }
        .detail-row {
            display: flex;
            justify-content: space-around;
            margin: 10px 0;
            font-size: 14px;
        }
        .detail-label {
            font-weight: bold;
        }
        .badge {
            display: inline-block;
            background: #f39c12;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-weight: bold;
            margin: 10px;
        }
        .certificate-footer {
            text-align: center;
            margin-top: 40px;
            font-size: 12px;
            color: #7f8c8d;
        }
        .seal {
            position: absolute;
            bottom: 30px;
            right: 40px;
            width: 100px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="certificate-container">
        <div class="certificate-header">
            <h1 class="university-name">University of Excellence</h1>
            <h2 class="certificate-title">Certificate of Achievement</h2>
        </div>
        
        <div class="certificate-body">
            <p>This is to certify that</p>
            <div class="student-name">${result.name}</div>
            <p>has successfully completed the course</p>
            <div style="font-size: 20px; font-weight: bold; color: #27ae60; margin: 15px 0;">
                ${result.course_name}
            </div>
            <p>and has demonstrated exceptional skills and knowledge</p>
            
            <div class="course-details">
                <div class="detail-row">
                    <span><span class="detail-label">Academic Year:</span> ${result.academic_year}</span>
                    <span><span class="detail-label">Semester:</span> ${result.semester}</span>
                </div>
                <div class="detail-row">
                    <span><span class="detail-label">Total Marks:</span> ${result.total_marks}</span>
                    <span><span class="detail-label">Grade:</span> <span class="badge">${result.grade}</span></span>
                </div>
                <div class="detail-row">
                    <span><span class="detail-label">Year:</span> Year ${result.year}</span>
                </div>
            </div>
            
            <p>In recognition of this achievement, we proudly present this certificate.</p>
        </div>
        
        <div class="certificate-footer">
            <p>Certificate Generated: ${new Date().toLocaleDateString()}</p>
            <p>This is an official certificate from the University</p>
        </div>
        
        <div class="seal">
            ✓ Official<br>
            Certificate
        </div>
    </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Certificate_${result.name}.html"`);
    res.send(certificateHTML);
  } catch (err) {
    console.error('Error generating certificate:', err);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
});

module.exports = router;
