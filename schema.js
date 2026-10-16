// Database Schema Setup Script
// Run this script to create all necessary tables: node schema.js

const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'university_erp'
};

async function createTables() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL Database');

    // Drop existing tables if they exist (for fresh setup)
    const dropTables = [
      'DROP TABLE IF EXISTS assignment_submissions',
      'DROP TABLE IF EXISTS assignments',
      'DROP TABLE IF EXISTS attendance',
      'DROP TABLE IF EXISTS grades',
      'DROP TABLE IF EXISTS enrollments',
      'DROP TABLE IF EXISTS course_offerings',
      'DROP TABLE IF EXISTS courses',
      'DROP TABLE IF EXISTS timetable',
      'DROP TABLE IF EXISTS results',
      'DROP TABLE IF EXISTS users'
    ];

    for (const dropSql of dropTables) {
      try {
        await connection.execute(dropSql);
        console.log(`Dropped table: ${dropSql.split(' ')[4]}`);
      } catch (err) {
        // Table may not exist, ignore
      }
    }

    // Create USERS table
    console.log('\n--- Creating USERS table ---');
    await connection.execute(`
      CREATE TABLE users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL,
        year INT,
        branch VARCHAR(50),
        department VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('USERS table created');

    // Create COURSES table
    console.log('\n--- Creating COURSES table ---');
    await connection.execute(`
      CREATE TABLE courses (
        course_id INT AUTO_INCREMENT PRIMARY KEY,
        course_code VARCHAR(20) UNIQUE NOT NULL,
        course_name VARCHAR(100) NOT NULL,
        credits INT NOT NULL,
        branch VARCHAR(50) NOT NULL,
        year INT NOT NULL,
        description VARCHAR(500)
      )
    `);
    console.log('COURSES table created');

    // Create COURSE_OFFERINGS table
    console.log('\n--- Creating COURSE_OFFERINGS table ---');
    await connection.execute(`
      CREATE TABLE course_offerings (
        offering_id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        instructor_id INT NOT NULL,
        semester VARCHAR(20) NOT NULL,
        year INT NOT NULL,
        capacity INT DEFAULT 60,
        enrolled INT DEFAULT 0,
        FOREIGN KEY (course_id) REFERENCES courses(course_id),
        FOREIGN KEY (instructor_id) REFERENCES users(user_id)
      )
    `);
    console.log('COURSE_OFFERINGS table created');
    // Create ENROLLMENTS table
    console.log('\n--- Creating ENROLLMENTS table ---');
    await connection.execute(`
      CREATE TABLE enrollments (
        enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
        offering_id INT NOT NULL,
        student_id INT NOT NULL,
        enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'Active',
        FOREIGN KEY (offering_id) REFERENCES course_offerings(offering_id),
        FOREIGN KEY (student_id) REFERENCES users(user_id),
        UNIQUE(offering_id, student_id)
      )
    `);
    console.log('ENROLLMENTS table created');

    // Create GRADES table
    console.log('\n--- Creating GRADES table ---');
    await connection.execute(`
      CREATE TABLE grades (
        grade_id INT AUTO_INCREMENT PRIMARY KEY,
        enrollment_id INT NOT NULL,
        assignment_grade DECIMAL(5,2),
        midterm_grade DECIMAL(5,2),
        final_grade DECIMAL(5,2),
        overall_grade DECIMAL(5,2),
        letter_grade VARCHAR(2),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id)
      )
    `);
    console.log('GRADES table created');

    // Create ATTENDANCE table
    console.log('\n--- Creating ATTENDANCE table ---');
    try {
      await connection.execute(`
        CREATE TABLE attendance (
          attendance_id INT AUTO_INCREMENT PRIMARY KEY,
          enrollment_id INT NOT NULL,
          date DATE NOT NULL,
          status VARCHAR(10) NOT NULL DEFAULT 'Present',
          marked_by INT NOT NULL,
          marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id),
          FOREIGN KEY (marked_by) REFERENCES users(user_id),
          UNIQUE(enrollment_id, date)
        )
      `);
      console.log('ATTENDANCE table created');
    } catch (err) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('ATTENDANCE table already exists, skipping...');
      } else {
        throw err;
      }
    }

    // Create ASSIGNMENTS table
    console.log('\n--- Creating ASSIGNMENTS table ---');
    try {
      await connection.execute(`
        CREATE TABLE assignments (
          assignment_id INT AUTO_INCREMENT PRIMARY KEY,
          offering_id INT NOT NULL,
          title VARCHAR(100) NOT NULL,
          description TEXT,
          due_date DATE NOT NULL,
          max_marks INT NOT NULL DEFAULT 100,
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (offering_id) REFERENCES course_offerings(offering_id),
          FOREIGN KEY (created_by) REFERENCES users(user_id)
        )
      `);
      console.log('ASSIGNMENTS table created');
    } catch (err) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('ASSIGNMENTS table already exists, skipping...');
      } else {
        throw err;
      }
    }

    // Create ASSIGNMENT_SUBMISSIONS table
    console.log('\n--- Creating ASSIGNMENT_SUBMISSIONS table ---');
    try {
      await connection.execute(`
        CREATE TABLE assignment_submissions (
          submission_id INT AUTO_INCREMENT PRIMARY KEY,
          assignment_id INT NOT NULL,
          student_id INT NOT NULL,
          submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          marks_obtained DECIMAL(5,2),
          feedback TEXT,
          file_path VARCHAR(255),
          FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id),
          FOREIGN KEY (student_id) REFERENCES users(user_id),
          UNIQUE(assignment_id, student_id)
        )
      `);
      console.log('ASSIGNMENT_SUBMISSIONS table created');
    } catch (err) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('ASSIGNMENT_SUBMISSIONS table already exists, skipping...');
      } else {
        throw err;
      }
    }

    // Create TIMETABLE table
    console.log('\n--- Creating TIMETABLE table ---');
    try {
      await connection.execute(`
        CREATE TABLE timetable (
          timetable_id INT AUTO_INCREMENT PRIMARY KEY,
          offering_id INT NOT NULL,
          day_of_week VARCHAR(10) NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          room_no VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (offering_id) REFERENCES course_offerings(offering_id)
        )
      `);
      console.log('TIMETABLE table created');
    } catch (err) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('TIMETABLE table already exists, skipping...');
      } else {
        throw err;
      }
    }

    // Create RESULTS table
    console.log('\n--- Creating RESULTS table ---');
    try {
      await connection.execute(`
        CREATE TABLE results (
          result_id INT AUTO_INCREMENT PRIMARY KEY,
          enrollment_id INT NOT NULL,
          assignment_marks DECIMAL(5,2),
          midterm_marks DECIMAL(5,2),
          final_marks DECIMAL(5,2),
          total_marks DECIMAL(5,2),
          grade VARCHAR(2),
          semester VARCHAR(20),
          academic_year VARCHAR(10),
          published_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id)
        )
      `);
      console.log('RESULTS table created');
    } catch (err) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('RESULTS table already exists, skipping...');
      } else {
        throw err;
      }
    }

    // Insert sample data
    console.log('\n--- Inserting Comprehensive Sample Data ---');

    // Insert instructors
    const instructors = [
      {id: 1, name: 'Dr. Rajesh Kumar', email: 'rajesh@university.edu', department: 'CSE'},
      {id: 2, name: 'Dr. Priya Sharma', email: 'priya@university.edu', department: 'CSE'},
      {id: 3, name: 'Dr. Amit Patel', email: 'amit@university.edu', department: 'CSE'},
      {id: 4, name: 'Dr. Neha Singh', email: 'neha@university.edu', department: 'CSE'},
      {id: 5, name: 'Dr. Vikram Desai', email: 'vikram@university.edu', department: 'CSE'},
      {id: 6, name: 'Dr. Anjali Verma', email: 'anjali@university.edu', department: 'CSE'},
      {id: 7, name: 'Dr. Rahul Gupta', email: 'rahul@university.edu', department: 'CSE'},
      {id: 8, name: 'Dr. Pooja Kale', email: 'pooja@university.edu', department: 'CSE'},
      {id: 9, name: 'Dr. Sanjay Joshi', email: 'sanjay@university.edu', department: 'CSE'},
      {id: 10, name: 'Dr. Divya Rao', email: 'divya@university.edu', department: 'CSE'},
      {id: 11, name: 'Dr. Arun Mehta', email: 'arun@university.edu', department: 'CSE'},
      {id: 12, name: 'Dr. Ritika Das', email: 'ritika@university.edu', department: 'CSE'},
      {id: 13, name: 'Dr. Manish Sharma', email: 'manish@university.edu', department: 'CSE'},
      {id: 14, name: 'Dr. Sneha Bhat', email: 'sneha@university.edu', department: 'CSE'},
      {id: 15, name: 'Dr. Harsh Patel', email: 'harsh@university.edu', department: 'CSE'}
    ];

    for (const inst of instructors) {
      await connection.execute(
        `INSERT INTO users (user_id, name, email, password, role, department) 
         VALUES (?, ?, ?, 'password123', 'Instructor', ?)`,
        [inst.id, inst.name, inst.email, inst.department]
      );
    }
    console.log(`Inserted ${instructors.length} instructors`);

    // Insert 60+ students (Year 1, 2, 3)
    const students = [
      // Year 1 - Computer - 20 students
      ...Array.from({length: 20}, (_, i) => ({
        id: 16 + i, 
        name: `Student_Y1_Comp_${String(i+1).padStart(2, '0')}`, 
        email: `y1comp${i+1}@student.edu`, 
        year: 1, 
        branch: 'Computer'
      })),
      // Year 2 - Computer - 20 students
      ...Array.from({length: 20}, (_, i) => ({
        id: 36 + i, 
        name: `Student_Y2_Comp_${String(i+1).padStart(2, '0')}`, 
        email: `y2comp${i+1}@student.edu`, 
        year: 2, 
        branch: 'Computer'
      })),
      // Year 3 - Computer - 20 students
      ...Array.from({length: 20}, (_, i) => ({
        id: 56 + i, 
        name: `Student_Y3_Comp_${String(i+1).padStart(2, '0')}`, 
        email: `y3comp${i+1}@student.edu`, 
        year: 3, 
        branch: 'Computer'
      }))
    ];

    for (const student of students) {
      await connection.execute(
        `INSERT INTO users (user_id, name, email, password, role, year, branch) 
         VALUES (?, ?, ?, 'password123', 'Student', ?, ?)`,
        [student.id, student.name, student.email, student.year, student.branch]
      );
    }
    console.log(`Inserted ${students.length} students`);

    // Insert Computer Engineering courses
    const courses = [
      // Year 1 Semester 1
      {id: 1, code: 'CS101', name: 'Engineering Mathematics I', credits: 4, branch: 'Computer', year: 1},
      {id: 2, code: 'CS102', name: 'Engineering Physics', credits: 4, branch: 'Computer', year: 1},
      {id: 3, code: 'CS103', name: 'Basic Electrical Engineering', credits: 4, branch: 'Computer', year: 1},
      {id: 4, code: 'CS104', name: 'Programming in C', credits: 4, branch: 'Computer', year: 1},
      {id: 5, code: 'CS105', name: 'Engineering Graphics', credits: 3, branch: 'Computer', year: 1},
      {id: 6, code: 'CS106', name: 'Professional Communication', credits: 2, branch: 'Computer', year: 1},
      {id: 7, code: 'CS107L', name: 'Programming Lab', credits: 2, branch: 'Computer', year: 1},
      
      // Year 1 Semester 2
      {id: 8, code: 'CS201', name: 'Engineering Mathematics II', credits: 4, branch: 'Computer', year: 1},
      {id: 9, code: 'CS202', name: 'Data Structures', credits: 4, branch: 'Computer', year: 1},
      {id: 10, code: 'CS203', name: 'Object Oriented Programming', credits: 4, branch: 'Computer', year: 1},
      {id: 11, code: 'CS204', name: 'Digital Electronics', credits: 4, branch: 'Computer', year: 1},
      {id: 12, code: 'CS205', name: 'Computer Organization', credits: 3, branch: 'Computer', year: 1},
      {id: 13, code: 'CS206', name: 'Environmental Studies', credits: 2, branch: 'Computer', year: 1},
      {id: 14, code: 'CS207L', name: 'OOP Lab', credits: 2, branch: 'Computer', year: 1},
      
      // Year 2 Semester 3
      {id: 15, code: 'CS301', name: 'Theory of Computation', credits: 4, branch: 'Computer', year: 2},
      {id: 16, code: 'CS302', name: 'Software Engineering', credits: 4, branch: 'Computer', year: 2},
      {id: 17, code: 'CS303', name: 'Computer Networks', credits: 4, branch: 'Computer', year: 2},
      {id: 18, code: 'CS304', name: 'Database Management Systems', credits: 4, branch: 'Computer', year: 2},
      {id: 19, code: 'CS305', name: 'Operating Systems', credits: 4, branch: 'Computer', year: 2},
      {id: 20, code: 'CS306E', name: 'Elective I - AI Fundamentals', credits: 3, branch: 'Computer', year: 2},
      
      // Year 2 Semester 4
      {id: 21, code: 'CS401', name: 'Compiler Design', credits: 4, branch: 'Computer', year: 2},
      {id: 22, code: 'CS402', name: 'Design and Analysis of Algorithms', credits: 4, branch: 'Computer', year: 2},
      {id: 23, code: 'CS403', name: 'Web Technologies', credits: 4, branch: 'Computer', year: 2},
      {id: 24, code: 'CS404', name: 'Machine Learning', credits: 4, branch: 'Computer', year: 2},
      {id: 25, code: 'CS405E', name: 'Elective II - Cloud Computing', credits: 3, branch: 'Computer', year: 2},
      
      // Year 3 Semester 5
      {id: 26, code: 'CS501', name: 'Artificial Intelligence', credits: 4, branch: 'Computer', year: 3},
      {id: 27, code: 'CS502', name: 'Information Security', credits: 4, branch: 'Computer', year: 3},
      {id: 28, code: 'CS503', name: 'Microprocessors', credits: 4, branch: 'Computer', year: 3},
      {id: 29, code: 'CS504', name: 'Data Mining', credits: 3, branch: 'Computer', year: 3},
      
      // Year 3 Semester 6
      {id: 30, code: 'CS601', name: 'Big Data Analytics', credits: 4, branch: 'Computer', year: 3},
      {id: 31, code: 'CS602', name: 'Internet of Things', credits: 4, branch: 'Computer', year: 3},
      {id: 32, code: 'CS603', name: 'Advanced Web Development', credits: 3, branch: 'Computer', year: 3}
    ];

    for (const course of courses) {
      await connection.execute(
        `INSERT INTO courses (course_id, course_code, course_name, credits, branch, year, description) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [course.id, course.code, course.name, course.credits, course.branch, course.year, `${course.name} - Comprehensive course covering theory and practical applications`]
      );
    }
    console.log(`Inserted ${courses.length} courses`);

    // Insert course offerings (EACH TEACHER TEACHES 3 COURSES)
    let offeringId = 1;
    const offerings = [];
    const coursesPerInstructor = 3;
    
    for (let instructorIdx = 0; instructorIdx < instructors.length; instructorIdx++) {
      const instructorId = instructorIdx + 1;
      // Assign 3 courses to this instructor
      for (let courseIdx = 0; courseIdx < coursesPerInstructor; courseIdx++) {
        const courseId = (instructorIdx * coursesPerInstructor + courseIdx) % courses.length + 1;
        const courseData = courses.find(c => c.id === courseId);
        const semester = courseData.year === 1 ? (courseIdx === 0 ? 'Sem1' : 'Sem2') : courseData.year === 2 ? (courseIdx === 0 ? 'Sem3' : 'Sem4') : 'Sem5';
        
        await connection.execute(
          `INSERT INTO course_offerings (offering_id, course_id, instructor_id, semester, year, capacity) 
           VALUES (?, ?, ?, ?, 2024, 50)`,
          [offeringId, courseId, instructorId, semester]
        );
        offerings.push({offering_id: offeringId, course_id: courseId, instructor_id: instructorId, year: courseData.year});
        offeringId++;
      }
    }
    console.log(`\n✓ Inserted ${offerings.length} course offerings (3 per instructor)`);

    // Insert enrollments (50 STUDENTS PER COURSE)
    let enrollId = 1;
    const enrollments = [];
    for (const offering of offerings) {
      const studentYear = offering.year;
      const yearStudents = students.filter(s => s.year === studentYear);
      
      // Enroll up to 50 students per course
      const studentsToEnroll = yearStudents.slice(0, 50);
      for (const student of studentsToEnroll) {
        try {
          await connection.execute(
            `INSERT INTO enrollments (enrollment_id, offering_id, student_id, status) 
             VALUES (?, ?, ?, 'Active')`,
            [enrollId, offering.offering_id, student.id]
          );
          enrollments.push({enrollment_id: enrollId, offering_id: offering.offering_id, student_id: student.id});
          enrollId++;
        } catch (err) {
          // Duplicate entry, skip
        }
      }
    }
    console.log(`✓ Inserted ${enrollments.length} enrollments (50 students per course)`);

    // Insert attendance records (multiple entries per student)
    const attendanceRecords = [];
    for (const enrollment of enrollments.slice(0, 100)) {
      for (let d = 5; d <= 25; d += 5) {
        const status = Math.random() > 0.15 ? 'Present' : 'Absent';
        await connection.execute(
          `INSERT INTO attendance (enrollment_id, date, status, marked_by) 
           VALUES (?, ?, ?, ?)`,
          [enrollment.enrollment_id, `2024-02-${String(d).padStart(2, '0')}`, status, 1 + Math.floor(Math.random() * 5)]
        );
        attendanceRecords.push({enrollment_id: enrollment.enrollment_id});
      }
    }
    console.log(`✓ Inserted ${attendanceRecords.length} attendance records`);

    // Insert assignments (5-6 PER COURSE)
    let assignmentId = 1;
    const assignments = [];
    const assignmentTitles = [
      'Assignment 1 - Introduction to Concepts',
      'Assignment 2 - Problem Solving Basics',
      'Assignment 3 - Intermediate Practice',
      'Assignment 4 - Advanced Topics',
      'Assignment 5 - Case Study Analysis',
      'Assignment 6 - Final Project'
    ];
    
    for (const offering of offerings) {
      // Create 5-6 assignments per course
      const assignmentCount = 5 + Math.floor(Math.random() * 2); // 5 or 6
      for (let a = 0; a < assignmentCount; a++) {
        const dueDate = new Date(2024, 0, 10 + (a * 10));
        await connection.execute(
          `INSERT INTO assignments (offering_id, title, description, due_date, max_marks, created_by) 
           VALUES (?, ?, ?, ?, 100, ?)`,
          [offering.offering_id, assignmentTitles[a], `${assignmentTitles[a]} - Detailed assignment for Course ${offering.course_id}. Students should submit well-documented solutions.`, dueDate.toISOString().split('T')[0], offering.instructor_id]
        );
        assignments.push({assignment_id: assignmentId, offering_id: offering.offering_id});
        assignmentId++;
      }
    }
    console.log(`✓ Inserted ${assignments.length} assignments (5-6 per course)`);

    // Insert assignment submissions
    for (const assignment of assignments) {
      const enrollmentForCourse = enrollments.filter(e => e.offering_id === assignment.offering_id);
      // Get submissions from first 30 students for each assignment
      for (const enrollment of enrollmentForCourse.slice(0, 30)) {
        const marksObtained = Math.floor(Math.random() * 40) + 60;
        try {
          await connection.execute(
            `INSERT INTO assignment_submissions (assignment_id, student_id, marks_obtained, feedback) 
             VALUES (?, ?, ?, ?)`,
            [assignment.assignment_id, enrollment.student_id, marksObtained, 'Great work! Well explained.']
          );
        } catch (err) {
          // Duplicate, skip
        }
      }
    }
    console.log(`✓ Inserted assignment submissions`);

    // Insert timetable entries (schedule classes)
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = [
      {start: '09:00', end: '10:30'},
      {start: '10:45', end: '12:15'},
      {start: '13:00', end: '14:30'},
      {start: '14:45', end: '16:15'}
    ];
    
    for (let i = 0; i < offerings.length; i++) {
      const dayIndex = i % 5;
      const timeIndex = Math.floor(i / 5) % 4;
      const roomNo = `Room ${101 + (i % 10)}`;
      
      await connection.execute(
        `INSERT INTO timetable (offering_id, day_of_week, start_time, end_time, room_no) 
         VALUES (?, ?, ?, ?, ?)`,
        [offerings[i].offering_id, days[dayIndex], timeSlots[timeIndex].start, timeSlots[timeIndex].end, roomNo]
      );
    }
    console.log(`✓ Inserted timetable entries`);

    // Insert results for students
    let resultId = 1;
    for (const enrollment of enrollments.slice(0, 200)) {
      const assignment = Math.floor(Math.random() * 40) + 60;
      const midterm = Math.floor(Math.random() * 30) + 60;
      const final = Math.floor(Math.random() * 40) + 60;
      const total = Math.round((assignment * 0.2 + midterm * 0.3 + final * 0.5) * 10) / 10;
      let grade = 'F';
      if (total >= 90) grade = 'A';
      else if (total >= 80) grade = 'B';
      else if (total >= 70) grade = 'C';
      else if (total >= 60) grade = 'D';
      
      const semesterMap = {1: 'Sem1', 2: 'Sem2', 3: 'Sem3', 4: 'Sem4', 5: 'Sem5', 6: 'Sem6'};
      const offeringIndex = offerings.findIndex(o => o.offering_id === enrollment.offering_id);
      const semester = Object.values(semesterMap)[Math.floor(offeringIndex / 3) % 6];
      
      try {
        await connection.execute(
          `INSERT INTO results (result_id, enrollment_id, assignment_marks, midterm_marks, final_marks, total_marks, grade, semester, academic_year) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, '2023-24')`,
          [resultId, enrollment.enrollment_id, assignment, midterm, final, total, grade, semester]
        );
        resultId++;
      } catch (err) {
        // Duplicate, skip
      }
    }
    console.log(`✓ Inserted results`);

    console.log('\n✓ All tables created and data inserted successfully!');

  } catch (err) {
    console.error('Error creating tables:', err);
    process.exit(1);
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}

// Run the setup
createTables();
