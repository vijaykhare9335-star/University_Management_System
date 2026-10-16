// Main JavaScript
// Global utilities and common functions

// Alert notification function
function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <div style="padding: 1rem; background-color: ${type === 'error' ? 'rgba(255, 82, 82, 0.1)' : 'rgba(13, 110, 253, 0.1)'}; 
                    border-left: 4px solid ${type === 'error' ? 'var(--danger)' : 'var(--primary-color)'}; 
                    border-radius: 0.5rem; margin-bottom: 1rem;">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}
        </div>
    `;
    document.body.insertBefore(alert, document.body.firstChild);
    setTimeout(() => alert.remove(), 5000);
}

// Global logout function
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

// Check if user is logged in
async function checkLogin() {
    try {
        const response = await fetch('/auth/check-session');
        const data = await response.json();
        return data.loggedIn;
    } catch (err) {
        console.error('Error checking login:', err);
        return false;
    }
}

// Format date
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Format time
function formatTime(date) {
    return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Smooth scroll behavior
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Initialize theme
function initializeTheme() {
    const theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    
    // Add focus management to forms
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
            let isValid = true;
            
            inputs.forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    input.style.borderColor = 'var(--danger)';
                } else {
                    input.style.borderColor = '';
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                showAlert('Please fill all required fields', 'error');
            }
        });
    });
});

// API Helper Functions
const API = {
    async get(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (err) {
            console.error('API GET error:', err);
            throw err;
        }
    },
    
    async post(url, data) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (err) {
            console.error('API POST error:', err);
            throw err;
        }
    }
};

// Export for use in other files
window.showAlert = showAlert;
window.logout = logout;
window.checkLogin = checkLogin;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.API = API;
