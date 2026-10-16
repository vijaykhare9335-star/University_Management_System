# Setup and Installation Guide

## Quick Start

### Step 1: Prerequisites Check
Make sure you have:
- Node.js installed (`node --version`)
- npm installed (`npm --version`)
- Oracle Database running
- Oracle JDBC driver for oracledb

### Step 2: Navigate to Project Directory
```bash
cd c:\Users\vijay\Downloads\DBMS Project
```

### Step 3: Install Dependencies
```bash
npm install
```

This will install:
- express
- oracledb
- express-session
- bcryptjs
- body-parser
- cors
- dotenv
- ejs

### Step 4: Configure Oracle Database
1. Open `db.js`
2. Update connection details:
```javascript
const dbConfig = {
  user: 'system',
  password: 'YOUR_ORACLE_PASSWORD',
  connectString: 'localhost/XE'
};
```

### Step 5: Create Database Tables
```bash
node schema.js
```

Expected output:
```
Connected to Oracle Database
--- Creating USERS table ---
USERS table created
--- Creating COURSES table ---
COURSES table created
[... more tables ...]
✓ All tables created and data inserted successfully!
```

### Step 6: Start the Application
```bash
npm start
```

Server will start at: **http://localhost:3000**

### Step 7: Access the Application
1. Open browser
2. Go to: http://localhost:3000
3. Explore the homepage

## Login Credentials

### Student Account
- Email: arun@student.edu
- Password: password123
- Click Login → Select "Student"

### Instructor Account
- Email: rajesh@university.edu
- Password: password123
- Click Login → Select "Instructor"

## Features to Test

### For Students:
1. ✅ View Dashboard
2. ✅ Browse Courses (filtered by your year and branch)
3. ✅ Enroll in Courses
4. ✅ View Grades
5. ✅ Check Announcements
6. ✅ Contact Faculty
7. ✅ View Profile

### For Instructors:
1. ✅ View Dashboard
2. ✅ View Assigned Classes
3. ✅ View Enrolled Students
4. ✅ Upload Grades
5. ✅ Create Announcements
6. ✅ Manage Profile

## File Organization

```
DBMS Project/
├── 📄 README.md                    ← Project overview
├── 📄 SETUP_GUIDE.md              ← This file
├── 📄 package.json                ← Dependencies
├── 📄 server.js                   ← Main server
├── 📄 db.js                       ← Database connection
├── 📄 schema.js                   ← Database setup
│
├── 📁 routes/
│   ├── auth.js                    ← Login/Registration
│   ├── api.js                     ← API endpoints
│   └── pages.js                   ← Page routes
│
├── 📁 views/
│   ├── index.ejs                  ← Homepage
│   ├── login.ejs                  ← Login page
│   ├── register.ejs               ← Registration page
│   ├── student-dashboard.ejs      ← Student home
│   ├── instructor-dashboard.ejs   ← Instructor home
│   └── [other pages]
│
├── 📁 public/
│   ├── 📁 css/
│   │   └── style.css              ← Dark theme styling
│   └── 📁 js/
│       ├── main.js                ← Global functions
│       ├── auth.js                ← Authentication logic
│       ├── dashboard.js           ← Student dashboard
│       └── instructor-dashboard.js ← Instructor dashboard
```

## Key Screens

### 1. Homepage (/)
- 10+ informational sections
- Course highlights, faculty, placements
- Responsive design with smooth scrolling

### 2. Login (/login)
- Role selection (Student/Instructor)
- Email and password fields
- Demo credentials link

### 3. Register (/register)
- Multi-step registration
- Student: Year + Branch
- Instructor: Department
- Email uniqueness check

### 4. Student Dashboard (/student-dashboard)
- Course overview cards
- Announcements feed
- Quick action buttons
- Academic progress tracker

### 5. Instructor Dashboard (/instructor-dashboard)
- Class assignments
- Student enrollment stats
- Grade upload shortcuts
- Recent enrollments

## Database Tables

### Users
```
user_id | name | email | password | role | year | branch | department
```

### Courses
```
course_id | course_code | course_name | credits | branch | year | description
```

### Course Offerings
```
offering_id | course_id | instructor_id | semester | year | capacity | enrolled
```

### Enrollments
```
enrollment_id | offering_id | student_id | enrollment_date | status
```

### Grades
```
grade_id | enrollment_id | assignment_grade | midterm_grade | final_grade | overall_grade | letter_grade
```

## Sample Data Included

### Students (4 enrolled):
- Arun Singh (Year 1, Computer)
- Priya Desai (Year 1, Computer)
- Vikram Gupta (Year 2, IT)
- Neha Verma (Year 2, IT)
- Rahul Sharma (Year 1, Mechanical)
- Anjali Singh (Year 3, Computer)

### Instructors (3):
- Dr. Rajesh Kumar (CSE)
- Dr. Priya Sharma (IT)
- Dr. Amit Patel (Mechanical)

### Courses (8):
- CS101: Data Structures
- CS102: Database Systems
- CS103: Web Development
- IT101: Network Fundamentals
- IT102: Cloud Computing
- ME101: Engineering Mechanics
- AL301: Applied Mathematics
- CS201: Software Engineering

## API Endpoints Reference

### Authentication
```
POST /auth/login
POST /auth/register
GET /auth/logout
GET /auth/check-session
```

### Student APIs
```
GET /api/courses
GET /api/my-enrollments
POST /api/enroll
GET /api/my-grades
GET /api/faculty
```

### Instructor APIs
```
GET /api/instructor-courses
GET /api/students/:offeringId
POST /api/upload-grade
```

## Troubleshooting

### Problem: "Error connecting to Oracle DB"
**Solution:**
1. Check if Oracle service is running
2. Verify password in db.js
3. Check connectString is correct
4. Try: `sqlplus system@XE` to test connection

### Problem: "Cannot find module 'oracledb'"
**Solution:**
1. Reinstall dependencies: `npm install`
2. Check if oracledb compiled correctly
3. Update Node to latest LTS version

### Problem: "Table already exists"
**Solution:**
1. Manually drop tables from sqlplus
2. Or modify schema.js to drop existing tables first

### Problem: "Port 3000 already in use"
**Solution:**
Change port in server.js or stop the running process

## Performance Tips

1. **Database Optimization:**
   - Add indexes to frequently queried columns
   - Consider connection pooling for high traffic

2. **Frontend Optimization:**
   - CSS is minified but can be further optimized
   - Consider lazy loading course cards
   - Implement pagination for large datasets

3. **Server Optimization:**
   - Use compression middleware
   - Implement caching for faculty data
   - Add rate limiting

## Security Recommendations

For Production:
1. Hash passwords with bcrypt
2. Use environment variables (.env file)
3. Enable HTTPS
4. Implement CSRF tokens
5. Add input validation
6. Implement rate limiting
7. Add security headers
8. Validate all user inputs
9. Use prepared statements (already in code)
10. Implement JWT for API authentication

## Extending the System

### Add New Features:
1. **Email Notifications**
   - npm install nodemailer

2. **File Upload**
   - npm install multer

3. **Advanced Scheduling**
   - npm install node-schedule

4. **Real-time Chat**
   - npm install socket.io

5. **PDF Generation**
   - npm install pdfkit

## Development Mode

For development with auto-reload:
```bash
npm install -g nodemon
npm run dev
```

## Production Deployment

1. Set NODE_ENV=production
2. Use process manager (PM2)
3. Enable HTTPS
4. Set up reverse proxy (Nginx)
5. Configure database backups
6. Monitor logs and performance

## Support Matrix

| Feature | Status | Notes |
|---------|--------|-------|
| User Authentication | ✅ Complete | Supports Student & Instructor |
| Course Management | ✅ Complete | Filtering by branch/year |
| Enrollment | ✅ Complete | Prevents duplicates |
| Grades | ✅ Complete | Automatic calculation |
| Faculty Directory | ✅ Complete | Searchable |
| Announcements | ✅ Complete | Timeline view |
| Dashboard | ✅ Complete | Role-based |
| Responsive Design | ✅ Complete | Mobile optimized |

---

**Enjoy your University ERP System! 🎓**
