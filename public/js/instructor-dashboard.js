// Instructor Dashboard JavaScript
// Handles instructor-specific functionality

// Load instructor's courses
async function loadInstructorCourses() {
    try {
        const response = await fetch('/api/instructor-courses', { credentials: 'include' });
        const data = await response.json();

        if (response.ok) {
            displayInstructorCourses(data.courses);
            document.getElementById('classCount').textContent = data.courses.length;
        }
    } catch (err) {
        console.error('Error loading courses:', err);
    }
}

// Display instructor courses
function displayInstructorCourses(courses) {
    const container = document.getElementById('classesContainer');
    if (!container) return;

    if (courses.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No classes assigned</p>';
        return;
    }

    container.innerHTML = courses.map(course => `
        <div class="course-card">
            <div class="course-code">${course.courseCode}</div>
            <h3>${course.courseName}</h3>
            <div class="course-stats">
                <div class="course-stat">
                    <i class="fas fa-users"></i>
                    <span>${course.enrolled} students</span>
                </div>
                <div class="course-stat">
                    <i class="fas fa-calendar"></i>
                    <span>${course.semester}</span>
                </div>
            </div>
            <div class="course-actions">
                <button onclick="viewStudents(${course.offeringId})">
                    <i class="fas fa-list"></i> View Students
                </button>
                <button onclick="uploadGrades(${course.offeringId})">
                    <i class="fas fa-upload"></i> Upload Grades
                </button>
            </div>
        </div>
    `).join('');
}

// View students in a course
async function viewStudents(offeringId) {
    try {
        const response = await fetch(`/api/students/${offeringId}`, { credentials: 'include' });
        const data = await response.json();

        if (response.ok) {
            displayStudentsList(data.students);
        }
    } catch (err) {
        console.error('Error loading students:', err);
        alert('Failed to load students');
    }
}

// Display students list
function displayStudentsList(students) {
    if (students.length === 0) {
        alert('No students enrolled');
        return;
    }

    let htmlList = '<div class="students-modal-content"><h3>Enrolled Students</h3><table style="width: 100%; color: var(--text-primary);">';
    htmlList += '<tr style="border-bottom: 1px solid var(--border-color);"><th>Name</th><th>Email</th><th>Grade</th></tr>';

    students.forEach(student => {
        htmlList += `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td>${student.name}</td>
                <td>${student.email}</td>
                <td>${student.letterGrade || '-'}</td>
            </tr>
        `;
    });

    htmlList += '</table></div>';

    // Display in a modal-like view
    alert(`${students.length} students enrolled in this course`);
}

// Upload grades placeholder
function uploadGrades(offeringId) {
    alert('Redirect to grades upload page for offering: ' + offeringId);
    window.location.href = `/upload-grades?offering=${offeringId}`;
}

// Load overall statistics
async function loadInstructorStats() {
    try {
        const response = await fetch('/api/instructor-courses', { credentials: 'include' });
        const data = await response.json();

        if (response.ok) {
            let totalStudents = 0;
            data.courses.forEach(course => {
                totalStudents += course.enrolled;
            });

            document.getElementById('classCount').textContent = data.courses.length;
            document.getElementById('studentCount').textContent = totalStudents;
        }
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

// Load course selection for instructor pages
async function loadCourseSelect() {
    const courseSelect = document.getElementById('courseSelect');
    const noStudents = document.getElementById('noStudents');
    if (!courseSelect) return;

    const assignForm = document.getElementById('assignCourseForm');
    const path = assignForm ? '/api/available-courses' : '/api/instructor-courses';

    try {
        const response = await fetch(path, { credentials: 'include' });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to load courses');
        }

        if (assignForm) {
            courseSelect.innerHTML = '<option value="">Select a course</option>' + data.courses.map(course => `
                <option value="${course.courseId}">${course.courseName} (${course.courseCode})</option>
            `).join('');
        } else {
            courseSelect.innerHTML = '<option value="">Select a course</option>' + data.courses.map(course => `
                <option value="${course.offeringId}">${course.courseName} (${course.courseCode})</option>
            `).join('');
            if (noStudents) {
                noStudents.textContent = 'Select a course to view students';
                noStudents.style.display = 'block';
            }
        }
    } catch (err) {
        console.error('Error loading course selector:', err);
        if (courseSelect) {
            courseSelect.innerHTML = '<option value="">Unable to load courses</option>';
            courseSelect.disabled = true;
        }
        if (noStudents) {
            noStudents.textContent = 'Unable to load courses.';
            noStudents.style.display = 'block';
        }
    }
}

// Handle assign course submission
async function setupAssignCourseForm() {
    const assignForm = document.getElementById('assignCourseForm');
    if (!assignForm) return;

    const assignCourseMessage = document.getElementById('assignCourseMessage');

    assignForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const courseId = document.getElementById('courseSelect').value;
        const semester = document.getElementById('semester').value;
        const year = document.getElementById('offeringYear').value;

        if (!courseId || !semester || !year) {
            if (assignCourseMessage) {
                assignCourseMessage.style.display = 'block';
                assignCourseMessage.style.color = '#ff6b6b';
                assignCourseMessage.textContent = 'Please complete all fields.';
            }
            return;
        }

        try {
            const response = await fetch('/api/course-offering', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ courseId, semester, year })
            });

            const data = await response.json();
            if (response.ok) {
                if (assignCourseMessage) {
                    assignCourseMessage.style.display = 'block';
                    assignCourseMessage.style.color = '#31c576';
                    assignCourseMessage.textContent = data.message || 'Course assigned successfully.';
                }
                assignForm.reset();
            } else {
                if (assignCourseMessage) {
                    assignCourseMessage.style.display = 'block';
                    assignCourseMessage.style.color = '#ff6b6b';
                    assignCourseMessage.textContent = data.error || 'Failed to assign course.';
                }
            }
        } catch (err) {
            console.error('Error assigning course:', err);
            if (assignCourseMessage) {
                assignCourseMessage.style.display = 'block';
                assignCourseMessage.style.color = '#ff6b6b';
                assignCourseMessage.textContent = 'An error occurred while assigning the course.';
            }
        }
    });
}

// Load students for selected course
async function loadCourseStudents() {
    const courseSelect = document.getElementById('courseSelect');
    const studentsList = document.getElementById('studentsList');
    const studentsTable = document.getElementById('studentsTable');
    const noStudents = document.getElementById('noStudents');
    const selectedOffering = courseSelect?.value;

    if (!selectedOffering) {
        if (studentsTable) studentsTable.style.display = 'none';
        if (noStudents) {
            noStudents.textContent = 'Select a course to view students';
            noStudents.style.display = 'block';
        }
        return;
    }

    try {
        const response = await fetch(`/api/students/${selectedOffering}`, { credentials: 'include' });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to load students');
        }

        if (!data.students || data.students.length === 0) {
            if (studentsTable) studentsTable.style.display = 'none';
            if (noStudents) {
                noStudents.textContent = 'No students enrolled in this course yet';
                noStudents.style.display = 'block';
            }
            return;
        }

        if (studentsTable) studentsTable.style.display = 'table';
        if (noStudents) noStudents.style.display = 'none';

        studentsList.innerHTML = data.students.map(student => `
            <tr>
                <td>${student.name}</td>
                <td>${student.email}</td>
                <td>${student.studentId || '-'}</td>
                <td>${student.letterGrade || 'Not graded'}</td>
                <td>
                    <button class="btn btn-secondary" onclick="window.location.href='/upload-grades?offering=${selectedOffering}'">
                        Upload Grade
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error loading course students:', err);
        if (studentsTable) studentsTable.style.display = 'none';
        if (noStudents) {
            noStudents.textContent = 'Unable to load students for this course.';
            noStudents.style.display = 'block';
        }
    }
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        fetch('/auth/logout')
            .then(() => {
                sessionStorage.removeItem('user');
                window.location.href = '/';
            })
            .catch(err => {
                console.error('Logout error:', err);
                alert('Logout failed');
            });
    }
}

// Open profile
function openProfile() {
    window.location.href = '/profile';
}

// Initialize instructor dashboard
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('classesContainer')) {
        loadInstructorCourses();
        loadInstructorStats();
    }

    if (document.getElementById('courseSelect')) {
        loadCourseSelect();
    }

    if (document.getElementById('assignCourseForm')) {
        setupAssignCourseForm();
    }
});
