# University ERP System - Full Stack Application

A comprehensive Enterprise Resource Planning (ERP) system for universities, built with Node.js, Express, and Oracle Database. Features role-based access for students and instructors with a modern dark theme UI.

## 🎨 Features

### Frontend
- **Modern Dark Theme** - Blue (#0d6efd) and Black color scheme
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Real-time UI Updates** - Dynamic content loading without page refresh
- **Intuitive Navigation** - Sidebar menu with role-based access

### Backend
- **Express.js Server** - RESTful API architecture
- **Oracle Database** - Enterprise-grade database using oracledb package
- **Session Management** - User authentication and authorization
- **Role-Based Access** - Separate portals for Students and Instructors

### Student Features
1. **Dashboard** - Overview of courses, grades, and announcements
2. **My Courses** - View and search available courses
3. **Enrollments** - Enroll in courses based on branch and year
4. **Timetable** - View class schedule
5. **Grades** - Check semester grades and performance
6. **Faculty Contacts** - Get instructor contact information
7. **Announcements** - View important college updates
8. **Profile** - Manage personal information
9. **Technical Resources** - Access learning materials
10. **Course Materials** - Download assignments and notes

### Instructor Features
1. **Dashboard** - Overview of assigned classes
2. **My Classes** - Manage assigned courses
3. **Students List** - View enrolled students
4. **Upload Grades** - Enter and upload student grades
5. **Course Materials** - Upload study materials
6. **Announcements** - Create class announcements
7. **Profile** - Manage profile information

### Home Page (10+ Sections)
1. **Student Corner** - Course enrollment, grades, timetable
2. **Technical Hub** - Programming labs, database lab, web dev, AI/ML
3. **Notices & Announcements** - Latest college updates
4. **Upcoming Events** - Event calendar and timeline
5. **Faculty Highlights** - Featured faculty members
6. **Placement Updates** - Recruitment statistics
7. **Internship Opportunities** - Available internships
8. **Academic Calendar** - Semester and break schedule
9. **Achievements** - College awards and certifications
10. **Help & Support** - Support channels and FAQ

## 🛠️ Technology Stack

**Frontend:**
- HTML5
- CSS3 (Custom dark theme)
- Vanilla JavaScript
- EJS Templates

**Backend:**
- Node.js
- Express.js
- Express Session (Authentication)

**Database:**
- Oracle Database (11g XE or later)
- oracledb npm package

**Tools & Dependencies:**
- bcryptjs - Password encryption
- body-parser - Request parsing
- cors - Cross-origin requests
- dotenv - Environment variables
- nodemon - Development server

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- Oracle Database 11g XE or later
- Basic knowledge of Node.js and SQL

## ⚙️ Installation & Setup

### 1. Install Dependencies

```bash
cd "c:\Users\vijay\Downloads\DBMS Project"
npm install
```

### 2. Configure Database Connection

Edit `db.js` and update the Oracle connection details:

```javascript
const dbConfig = {
  user: 'system',
  password: 'your_password',  // Change to your Oracle password
  connectString: 'localhost/XE'
};
```

### 3. Create Database Schema

Run the schema setup script to create tables and insert sample data:

```bash
node schema.js
```

This will:
- Create all necessary tables (users, courses, course_offerings, enrollments, grades)
- Insert sample instructors, students, and courses
- Set up sequences for auto-increment IDs

### 4. Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The server will start at: **http://localhost:3000**

## 🔐 Demo Credentials

### Student Login
- **Email:** arun@student.edu
- **Password:** password123
- **Role:** Student

### Instructor Login
- **Email:** rajesh@university.edu
- **Password:** password123
- **Role:** Instructor

## 📁 Project Structure

```
university-erp-system/
├── public/
│   ├── css/
│   │   └── style.css           # Main stylesheet (dark theme)
│   └── js/
│       ├── auth.js             # Authentication logic
│       ├── dashboard.js        # Student dashboard functionality
│       ├── instructor-dashboard.js  # Instructor dashboard
│       └── main.js             # Global utilities
├── views/
│   ├── index.ejs               # Homepage (10+ sections)
│   ├── login.ejs               # Login page
│   ├── register.ejs            # Registration page
│   ├── student-dashboard.ejs   # Student main dashboard
│   ├── instructor-dashboard.ejs # Instructor main dashboard
│   ├── my-courses.ejs          # Student courses view
│   ├── enrollments.ejs         # Student enrollments
│   ├── grades.ejs              # Student grades
│   ├── faculty.ejs             # Faculty contacts
│   ├── announcements.ejs       # Announcements page
│   ├── profile.ejs             # User profile
│   ├── my-classes.ejs          # Instructor classes
│   ├── students-list.ejs       # Instructor students view
│   └── upload-grades.ejs       # Grade upload form
├── routes/
│   ├── auth.js                 # Authentication routes
│   ├── api.js                  # API endpoints
│   └── pages.js                # Page routes
├── db.js                        # Database connection
├── server.js                    # Main server file
├── schema.js                    # Database schema setup
├── package.json                 # Project dependencies
└── README.md                    # This file
```

## 🌐 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/logout` - User logout
- `GET /auth/check-session` - Check login status

### Student APIs
- `GET /api/courses` - Get available courses
- `GET /api/my-enrollments` - Get enrolled courses
- `POST /api/enroll` - Enroll in a course
- `GET /api/my-grades` - Get student grades
- `GET /api/faculty` - Get faculty list

### Instructor APIs
- `GET /api/instructor-courses` - Get assigned courses
- `GET /api/students/:offeringId` - Get course students
- `POST /api/upload-grade` - Upload grade

## 🎨 Dark Theme Colors

- **Primary Blue:** #0d6efd
- **Dark Background:** #0f1419
- **Darker Background:** #1a1f26
- **Card Background:** #1e2330
- **Text Primary:** #ffffff
- **Text Secondary:** #b8bcc8
- **Border Color:** #2d3341

## 🚀 Key Features Implementation

### 1. Login System
- Role selection (Student/Instructor)
- Session-based authentication
- Email and password validation
- Redirect based on role

### 2. Registration System
- Multi-step registration form
- Role-specific fields
- Email uniqueness validation
- Password confirmation

### 3. Course Management
- Courses filtered by branch and year
- Course offering system
- Enrollment with duplicate prevention
- Course instructor assignment

### 4. Grade Management
- Assignment, midterm, and final grades
- Automatic overall grade calculation
- Letter grade assignment
- Grade visibility by student role

### 5. Faculty System
- Faculty listing with contact info
- Department-wise organization
- Email contact option

## 📊 Database Schema

### Users Table
```sql
- user_id (Primary Key)
- name
- email (Unique)
- password
- role (Student/Instructor)
- year (for students)
- branch (for students)
- department (for instructors)
- created_at
```

### Courses Table
```sql
- course_id (Primary Key)
- course_code (Unique)
- course_name
- credits
- branch
- year
- description
```

### Course Offerings Table
```sql
- offering_id (Primary Key)
- course_id (Foreign Key)
- instructor_id (Foreign Key)
- semester
- year
- capacity
- enrolled
```

### Enrollments Table
```sql
- enrollment_id (Primary Key)
- offering_id (Foreign Key)
- student_id (Foreign Key)
- enrollment_date
- status
```

### Grades Table
```sql
- grade_id (Primary Key)
- enrollment_id (Foreign Key)
- assignment_grade
- midterm_grade
- final_grade
- overall_grade
- letter_grade
- updated_at
```

## 🔧 Troubleshooting

### Database Connection Issues
```
Error: Error connecting to Oracle DB

Solution:
1. Check Oracle service is running
2. Verify connection string in db.js
3. Confirm credentials are correct
4. Check network connectivity
```

### Table Already Exists Error
```
Solution: Drop existing tables before running schema.js
Drop table statements at beginning of schema.js
```

### Session Not Persisting
```
Solution:
- Check browser cookies are enabled
- Verify session middleware in server.js
- Clear browser cache and cookies
```

## 📱 Responsive Breakpoints

- **Desktop:** 1024px and above
- **Tablet:** 768px to 1023px
- **Mobile:** Below 768px

## ✅ Testing Checklist

- [ ] Login with student and instructor accounts
- [ ] Register new user
- [ ] View courses and enroll
- [ ] Check grades on grades page
- [ ] Load faculty contacts
- [ ] View announcements
- [ ] Test logout functionality
- [ ] Verify responsive design on mobile
- [ ] Check session persistence

## 📝 Notes

- All demo passwords are set to "password123" for testing
- Session expires after 24 hours
- Files are stored in project directory
- No external file hosting required
- All data is stored in Oracle database

## 🔒 Security Notes

- Implement bcrypt for password hashing in production
- Use environment variables for sensitive data
- Enable HTTPS in production
- Implement CSRF protection
- Add input validation and sanitization
- Implement rate limiting
- Use prepared statements for SQL queries

## 🤝 Contributing

This is a complete ERP system. Feel free to extend with additional features:
- Financial management
- Library management
- Hostel management
- Transport management
- Exam management

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Verify database connection
3. Check browser console for errors
4. Review server logs in terminal

## 📄 License

This project is created for educational purposes.

---

**Created with ❤️ for University Management**

Happy Learning! 🎓
