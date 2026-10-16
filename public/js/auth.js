// Authentication JavaScript
// Handles login, registration, and form validation

// Login Form Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const role = document.querySelector('input[name="role"]:checked').value;

        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, role })
            });

            const data = await response.json();

            if (response.ok) {
                sessionStorage.setItem('user', JSON.stringify(data.user));
                alert('Login successful!');
                
                // Redirect based on role
                if (data.user.role === 'Student') {
                    window.location.href = '/student-dashboard';
                } else if (data.user.role === 'Instructor') {
                    window.location.href = '/instructor-dashboard';
                }
            } else {
                alert(data.error || 'Login failed');
            }
        } catch (err) {
            console.error('Login error:', err);
            alert('An error occurred during login');
        }
    });
}

// Registration Form Handler
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const step2 = document.getElementById('step-2');
        if (!step2 || !step2.classList.contains('active')) {
            return; // Prevent submission if not on final step
        }

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const role = document.querySelector('input[name="role"]:checked').value;
        const year = document.getElementById('year').value;
        const branch = document.getElementById('branch').value;
        const department = document.getElementById('department').value;

        // Validation
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        if (role === 'Student' && (!year || !branch)) {
            alert('Please select year and branch');
            return;
        }

        if (role === 'Instructor' && !department) {
            alert('Please select department');
            return;
        }

        try {
            const response = await fetch('/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    confirmPassword,
                    role,
                    year,
                    branch,
                    department
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message);
                window.location.href = '/login';
            } else {
                alert(data.error || 'Registration failed');
            }
        } catch (err) {
            console.error('Registration error:', err);
            alert('An error occurred during registration');
        }
    });
}

// Step Navigation
function goToStep(stepNumber) {
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');

    if (stepNumber === 1) {
        if (step2) step2.classList.remove('active');
        if (step1) step1.classList.add('active');
    } else if (stepNumber === 2) {
        if (step1) step1.classList.remove('active');
        if (step2) step2.classList.add('active');
    }
}

// Toggle Student/Instructor Fields
function toggleStudentFields() {
    const role = document.querySelector('input[name="role"]:checked').value;
    const studentFields = document.getElementById('student-specific-fields');
    const instructorFields = document.getElementById('instructor-specific-fields');
    const yearInput = document.getElementById('year');
    const branchInput = document.getElementById('branch');
    const departmentInput = document.getElementById('department');

    if (role === 'Student') {
        if (studentFields) studentFields.style.display = 'block';
        if (instructorFields) instructorFields.style.display = 'none';
        if (yearInput) yearInput.required = true;
        if (branchInput) branchInput.required = true;
        if (departmentInput) departmentInput.required = false;
    } else {
        if (studentFields) studentFields.style.display = 'none';
        if (instructorFields) instructorFields.style.display = 'block';
        if (yearInput) yearInput.required = false;
        if (branchInput) branchInput.required = false;
        if (departmentInput) departmentInput.required = true;
    }
}

// Logout Function
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

// Update Navigation based on Login Status
async function updateNavigation() {
    try {
        const response = await fetch('/auth/check-session');
        const data = await response.json();

        const authButtons = document.getElementById('auth-buttons');
        if (!authButtons) return;

        if (data.loggedIn) {
            authButtons.innerHTML = `
                <span style="color: var(--primary-color); font-weight: 600;">
                    Welcome, ${data.user.name}
                </span>
                <a href="#" onclick="logout()" class="btn-login">Logout</a>
            `;
        }
    } catch (err) {
        console.error('Error checking session:', err);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    updateNavigation();
    toggleStudentFields();
});
