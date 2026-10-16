// Dashboard JavaScript
// Handles student dashboard functionality

// Load student statistics
async function loadStudentStats() {
    try {
        const response = await fetch('/api/student-stats', { credentials: 'include' });
        const data = await response.json();

        if (response.ok) {
            updateStatsDisplay(data.stats);
        } else {
            console.error('Error loading stats:', data.error);
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

// Update stats display with animations
function updateStatsDisplay(stats) {
    const enrolledCount = document.getElementById('enrolledCount');
    const totalGPA = document.getElementById('totalGPA');

    // Remove loading animation
    document.querySelectorAll('.stat-box').forEach(box => {
        box.classList.remove('loading');
    });

    if (enrolledCount && stats.enrolledCourses !== undefined) {
        animateNumber(enrolledCount, 0, stats.enrolledCourses, 1000);
    }

    if (totalGPA && stats.gpa !== undefined) {
        animateNumber(totalGPA, 0, stats.gpa, 1000);
    }
}

// Animate number counting up
function animateNumber(element, start, end, duration) {
    const startTime = performance.now();
    const endValue = parseFloat(end) || 0;

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = start + (endValue - start) * easeOut;

        element.textContent = endValue % 1 === 0 ? Math.round(currentValue) : currentValue.toFixed(2);

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// Navigate to different sections
function navigateToSection(section) {
    switch(section) {
        case 'my-courses':
            window.location.href = '/my-courses';
            break;
        case 'grades':
            window.location.href = '/grades';
            break;
        default:
            break;
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadStudentStats();
    loadMyCourses();
    loadEnrollmentsSummary();
    loadAssignmentsSummary();
});

// Fetch and display enrolled courses
async function loadMyCourses() {
    try {
        const response = await fetch('/api/my-enrollments', { credentials: 'include' });
        const data = await response.json();

        if (response.ok) {
            displayEnrolledCourses(data.enrollments);
        } else {
            console.error('Error loading enrollments:', data.error);
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

// Fetch and display all available courses
async function loadAvailableCourses() {
    try {
        const response = await fetch('/api/courses', { credentials: 'include' });
        const data = await response.json();

        if (response.ok) {
            displayCourses(data.courses);
        } else {
            console.error('Error loading courses:', data.error);
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

// Display courses in grid
function displayCourses(courses) {
    const container = document.getElementById('coursesContainer');
    if (!container) return;

    if (courses.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No courses available</p>';
        return;
    }

    container.innerHTML = courses.map(course => `
        <div class="course-card">
            <div class="course-code">${course.courseCode}</div>
            <h3>${course.courseName}</h3>
            <p class="course-info">Credits: ${course.credits}</p>
            <div class="course-instructor">
                <i class="fas fa-user"></i>
                <span>${course.instructorName}</span>
            </div>
            <div class="course-stats">
                <div class="course-stat">
                    <i class="fas fa-book"></i>
                    <span>${course.branch}</span>
                </div>
            </div>
            <div class="course-actions">
                <button onclick="enrollCourse(${course.offeringId})">
                    <i class="fas fa-edit"></i> Enroll
                </button>
                <button onclick="viewCourseDetails('${course.courseName}')">
                    <i class="fas fa-info-circle"></i> Details
                </button>
            </div>
        </div>
    `).join('');
}

// Display enrolled courses
function displayEnrolledCourses(enrollments) {
    const container = document.getElementById('coursesContainer');
    if (!container) return;

    if (enrollments.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">You are not enrolled in any courses</p>';
        return;
    }

    container.innerHTML = enrollments.map(enrollment => `
        <div class="course-card" style="border-left: 4px solid var(--success);">
            <div class="course-code">${enrollment.courseCode}</div>
            <h3>${enrollment.courseName}</h3>
            <p class="course-info">Credits: ${enrollment.credits}</p>
            <div class="course-instructor">
                <i class="fas fa-user"></i>
                <span>${enrollment.instructorName}</span>
            </div>
            <div class="course-stats">
                <div class="course-stat">
                    <i class="fas fa-check-circle"></i>
                    <span>Enrolled - ${enrollment.semester}</span>
                </div>
            </div>
            <div class="course-actions">
                <button onclick="viewCourseDetails('${enrollment.courseName}')" style="flex: 1;">
                    <i class="fas fa-book"></i> View Materials
                </button>
                <button onclick="viewCourseForum('${enrollment.courseName}')" style="flex: 1;">
                    <i class="fas fa-comments"></i> Forum
                </button>
            </div>
        </div>
    `).join('');
}

// Enroll in a course
async function enrollCourse(offeringId) {
    if (!confirm('Are you sure you want to enroll in this course?')) {
        return;
    }

    try {
        const response = await fetch('/api/enroll', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ offeringId }),
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            alert('Enrollment successful!');
            
            // Reload all dashboard sections
            loadAvailableCourses();
            loadMyCourses();
            loadEnrollmentsSummary();
            loadAssignmentsSummary();
            loadGrades();
            
            // If on dashboard, reload everything after 1 second
            if (window.location.pathname === '/student-dashboard') {
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        } else {
            alert(data.error || 'Enrollment failed');
        }
    } catch (err) {
        console.error('Enrollment error:', err);
        alert('An error occurred');
    }
}

// Fetch and display grades
async function loadGrades() {
    try {
        const response = await fetch('/api/my-grades', { credentials: 'include' });
        const data = await response.json();

        if (response.ok) {
            displayGrades(data.grades);
        } else {
            console.error('Error loading grades:', data.error);
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

// Display grades in table
function displayGrades(grades) {
    const container = document.getElementById('gradesContainer');
    if (!container) return;

    if (grades.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No grades available yet</p>';
        return;
    }

    const gradesHTML = `
        <table class="grades-table">
            <thead>
                <tr>
                    <th>Course Code</th>
                    <th>Course Name</th>
                    <th>Assignment</th>
                    <th>Midterm</th>
                    <th>Final</th>
                    <th>Overall</th>
                    <th>Grade</th>
                </tr>
            </thead>
            <tbody>
                ${grades.map(grade => `
                    <tr>
                        <td>${grade.courseCode}</td>
                        <td>${grade.courseName}</td>
                        <td>${grade.assignmentGrade || '-'}</td>
                        <td>${grade.midtermGrade || '-'}</td>
                        <td>${grade.finalGrade || '-'}</td>
                        <td>${grade.overallGrade ? grade.overallGrade.toFixed(2) : '-'}</td>
                        <td style="color: var(--primary-color); font-weight: 600;">${grade.letterGrade || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = gradesHTML;
}

// Filter courses
function filterCourses(type) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (type === 'all') {
        loadAvailableCourses();
    } else if (type === 'enrolled') {
        loadMyCourses();
    } else if (type === 'available') {
        loadAvailableCourses();
    }
}

// Search courses
function searchCourses() {
    const searchTerm = document.getElementById('courseSearch')?.value.toLowerCase() || '';
    const cards = document.querySelectorAll('.course-card');

    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

// ==================== ASSIGNMENTS FUNCTIONS ====================

// Fetch and display assignments summary for dashboard
async function loadAssignmentsSummary() {
    try {
        const response = await fetch('/api/my-assignments', { credentials: 'include' });
        const data = await response.json();

        if (response.ok) {
            displayAssignmentsSummary(data.assignments);
        } else {
            console.error('Error loading assignments:', data.error);
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

// Load enrollments for the "All Enrollments" section on main dashboard
async function loadEnrollmentsSummary() {
    try {
        const response = await fetch('/api/my-enrollments', { credentials: 'include' });
        const data = await response.json();

        if (response.ok) {
            displayEnrollmentsSummary(data.enrollments);
        } else {
            console.error('Error loading enrollments:', data.error);
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

// Display enrollments in table format for "All Enrollments" section
function displayEnrollmentsSummary(enrollments) {
    const container = document.getElementById('enrollmentsContainer');
    if (!container) return;

    if (enrollments.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No enrollments yet. Browse available courses and enroll in subjects of your choice.</p>';
        return;
    }

    let html = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: var(--bg-secondary); border-bottom: 2px solid var(--primary-color);">
                    <th style="padding: 12px; text-align: left; color: var(--primary-color);">Course Code</th>
                    <th style="padding: 12px; text-align: left; color: var(--primary-color);">Course Name</th>
                    <th style="padding: 12px; text-align: left; color: var(--primary-color);">Instructor</th>
                    <th style="padding: 12px; text-align: left; color: var(--primary-color);">Credits</th>
                </tr>
            </thead>
            <tbody>
                ${enrollments.map(enrollment => `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 12px; color: var(--primary-color); font-weight: 600;">${enrollment.courseCode}</td>
                        <td style="padding: 12px;">${enrollment.courseName}</td>
                        <td style="padding: 12px;">${enrollment.instructorName}</td>
                        <td style="padding: 12px;">${enrollment.credits}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// Display assignments in summary table format for dashboard
function displayAssignmentsSummary(assignments) {
    const container = document.getElementById('assignmentsContainer');
    if (!container) return;

    if (assignments.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No assignments available for your enrolled courses</p>';
        return;
    }

    // Sort by due date
    const sorted = assignments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    // Show only next 5 assignments
    const upcoming = sorted.slice(0, 5);

    let html = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: var(--bg-secondary); border-bottom: 2px solid var(--primary-color);">
                    <th style="padding: 12px; text-align: left; color: var(--primary-color);">Assignment</th>
                    <th style="padding: 12px; text-align: left; color: var(--primary-color);">Course</th>
                    <th style="padding: 12px; text-align: left; color: var(--primary-color);">Due Date</th>
                    <th style="padding: 12px; text-align: center; color: var(--primary-color);">Status</th>
                </tr>
            </thead>
            <tbody>
                ${upcoming.map(assignment => {
                    const dueDate = new Date(assignment.dueDate);
                    const today = new Date();
                    const isOverdue = dueDate < today;
                    const isSubmitted = assignment.status === 'Submitted';
                    
                    let statusClass = isSubmitted ? '#4CAF50' : isOverdue ? '#f44336' : '#FFC107';
                    let statusText = isSubmitted ? '✓ Submitted' : isOverdue ? '⚠ Overdue' : '⏳ Pending';
                    
                    return `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 12px; color: var(--primary-color); font-weight: 600;">${assignment.title}</td>
                            <td style="padding: 12px;">${assignment.courseCode} - ${assignment.courseName}</td>
                            <td style="padding: 12px;">${dueDate.toLocaleDateString()}</td>
                            <td style="padding: 12px; text-align: center;">
                                <span style="background: ${statusClass}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                    ${statusText}
                                </span>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// Fetch and display all assignments
async function loadAssignments() {
    try {
        const response = await fetch('/api/my-assignments', { credentials: 'include' });
        const data = await response.json();

        console.log('Assignments API Response:', data); // Debug log

        if (response.ok) {
            if (data.assignments && data.assignments.length > 0) {
                displayAssignments(data.assignments);
            } else {
                console.warn('No assignments returned from API');
                const container = document.getElementById('assignmentsContainer');
                if (container) {
                    container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px 20px;">No assignments available for your enrolled courses</p>';
                }
            }
        } else {
            console.error('Error loading assignments:', data.error);
            const container = document.getElementById('assignmentsContainer');
            if (container) {
                container.innerHTML = `<p style="text-align: center; color: #f44336; padding: 40px 20px;">Error: ${data.error}</p>`;
            }
        }
    } catch (err) {
        console.error('Fetch error:', err);
        const container = document.getElementById('assignmentsContainer');
        if (container) {
            container.innerHTML = `<p style="text-align: center; color: #f44336; padding: 40px 20px;">Failed to load assignments</p>`;
        }
    }
}

// Display assignments in list
function displayAssignments(assignments) {
    const container = document.getElementById('assignmentsContainer');
    if (!container) return;

    if (!assignments || assignments.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px 20px;">No assignments available for your enrolled courses</p>';
        return;
    }

    try {
        const assignmentsHTML = assignments.map(assignment => {
            const dueDate = new Date(assignment.dueDate);
            const today = new Date();
            const isOverdue = dueDate < today;
            const isSubmitted = assignment.status === 'Submitted';
            
            const borderColor = isSubmitted ? '#4CAF50' : isOverdue ? '#f44336' : '#2196F3';
            const bgColor = isSubmitted ? '#e8f5e9' : isOverdue ? '#ffebee' : '#e3f2fd';
            const statusColor = isSubmitted ? '#4CAF50' : isOverdue ? '#f44336' : '#FFC107';
            const statusText = isSubmitted ? '✓ SUBMITTED' : isOverdue ? '⚠ OVERDUE' : '⏳ PENDING';

            return `
                <div class="assignment-card" style="border-left: 4px solid ${borderColor}; background: ${bgColor}; margin-bottom: 15px; padding: 15px; border-radius: 8px;">
                    <div class="assignment-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <h3 style="margin: 0; color: #333;">${assignment.title || 'Untitled'}</h3>
                        <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; white-space: nowrap;">
                            ${statusText}
                        </span>
                    </div>
                    <div class="assignment-details" style="margin: 10px 0;">
                        <p style="margin: 5px 0;"><strong>Course:</strong> ${assignment.courseCode || 'N/A'} - ${assignment.courseName || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>Instructor:</strong> ${assignment.instructorName || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
                        <p style="margin: 5px 0;"><strong>Max Marks:</strong> ${assignment.maxMarks || 100}</p>
                        ${assignment.description ? `<p style="margin: 5px 0;"><strong>Description:</strong> ${assignment.description}</p>` : ''}
                        ${isSubmitted ? `
                            <p style="margin: 5px 0;"><strong>Submitted On:</strong> ${new Date(assignment.submissionDate).toLocaleString()}</p>
                            ${assignment.marksObtained ? `<p style="margin: 5px 0;"><strong>Marks:</strong> ${assignment.marksObtained}/${assignment.maxMarks || 100}</p>` : ''}
                            ${assignment.feedback ? `<p style="margin: 5px 0;"><strong>Feedback:</strong> ${assignment.feedback}</p>` : ''}
                        ` : ''}
                    </div>
                    ${!isSubmitted ? `
                        <button onclick="submitAssignment(${assignment.assignmentId})" style="width: 100%; padding: 10px; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px; font-weight: 600;">
                            Submit Assignment
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');

        container.innerHTML = assignmentsHTML;
    } catch (err) {
        console.error('Error displaying assignments:', err);
        container.innerHTML = '<p style="text-align: center; color: #f44336; padding: 40px 20px;">Error displaying assignments</p>';
    }
}

// Submit assignment
async function submitAssignment(assignmentId) {
    if (!confirm('Are you sure you want to submit this assignment?')) {
        return;
    }

    try {
        const response = await fetch('/api/submit-assignment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ assignmentId }),
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message);
            loadAssignments();
        } else {
            alert(data.error || 'Submission failed');
        }
    } catch (err) {
        console.error('Submission error:', err);
        alert('An error occurred while submitting');
    }
}

// View course details (placeholder)
function viewCourseDetails(courseName) {
    alert(`Viewing details for: ${courseName}`);
    // In a real application, this would open a detailed view
}

// View course forum (placeholder)
function viewCourseForum(courseName) {
    alert(`Opening forum for: ${courseName}`);
    // In a real application, this would open the course forum
}

// Open profile
function openProfile() {
    window.location.href = '/profile';
}

// Load faculty list
async function loadFaculty() {
    try {
        const response = await fetch('/api/faculty', { credentials: 'include' });
        const data = await response.json();

        if (response.ok) {
            displayFaculty(data.faculty);
        }
    } catch (err) {
        console.error('Error loading faculty:', err);
    }
}

// Display faculty
function displayFaculty(faculty) {
    const container = document.getElementById('facultyContainer');
    if (!container) return;

    container.innerHTML = faculty.map(prof => `
        <div class="faculty-card">
            <div class="faculty-avatar"><i class="fas fa-user"></i></div>
            <h4>${prof.name}</h4>
            <p class="faculty-title">${prof.department}</p>
            <p class="faculty-email">📧 ${prof.email}</p>
            <div class="contact-actions">
                <button class="btn" onclick="sendEmail('${prof.email}')">Send Email</button>
            </div>
        </div>
    `).join('');
}

// Send email (placeholder)
function sendEmail(email) {
    alert(`Opening email client for: ${email}`);
    // In a real application, this would integrate with an email service
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Load courses on dashboard
    if (document.getElementById('coursesContainer')) {
        loadAvailableCourses();
    }

    // Load grades on grades page
    if (document.getElementById('gradesContainer')) {
        loadGrades();
    }

    // Load faculty on faculty page
    if (document.getElementById('facultyContainer')) {
        loadFaculty();
    }

    // Add search listener
    const searchInput = document.getElementById('courseSearch');
    if (searchInput) {
        searchInput.addEventListener('input', searchCourses);
    }
});
