# Create an updated JavaScript file that will connect to the Go backend API
js_content = '''// Application state and data
let users = [];
let currentUser = null;

// API Configuration
const API_BASE_URL = 'http://localhost:8080/api';

// API Functions
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        showLoading(true);
        const response = await fetch(url, finalOptions);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.message || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        showNotification(error.message, 'error');
        throw error;
    } finally {
        showLoading(false);
    }
}

async function fetchUsers() {
    try {
        const response = await apiCall('/users');
        users = response.data || [];
        renderUsersTable();
        showNotification(`Loaded ${users.length} users successfully`, 'success');
    } catch (error) {
        console.error('Failed to fetch users:', error);
    }
}

async function createUser(userData) {
    try {
        const response = await apiCall('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        users.push(response.data);
        renderUsersTable();
        updateUserSelects();
        showNotification('User created successfully', 'success');
        return response.data;
    } catch (error) {
        console.error('Failed to create user:', error);
        throw error;
    }
}

async function updateUser(userId, userData) {
    try {
        const response = await apiCall(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
        const index = users.findIndex(u => u.id === userId);
        if (index !== -1) {
            users[index] = response.data;
        }
        renderUsersTable();
        updateUserSelects();
        showNotification('User updated successfully', 'success');
        return response.data;
    } catch (error) {
        console.error('Failed to update user:', error);
        throw error;
    }
}

async function deleteUser(userId) {
    try {
        await apiCall(`/users/${userId}`, {
            method: 'DELETE'
        });
        users = users.filter(u => u.id !== userId);
        renderUsersTable();
        updateUserSelects();
        showNotification('User deleted successfully', 'success');
    } catch (error) {
        console.error('Failed to delete user:', error);
        throw error;
    }
}

async function getUserById(userId) {
    try {
        const response = await apiCall(`/users/${userId}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw error;
    }
}

// UI Helper Functions
function showLoading(show) {
    const existingLoader = document.querySelector('.loading-overlay');
    if (show) {
        if (!existingLoader) {
            const loader = document.createElement('div');
            loader.className = 'loading-overlay';
            loader.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Loading...</p>
                </div>
            `;
            document.body.appendChild(loader);
        }
    } else {
        if (existingLoader) {
            existingLoader.remove();
        }
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Tab Navigation
function switchTab(tabName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    
    // Update page title
    const titles = {
        'users-list': 'Users List',
        'add-user': 'Add User',
        'update-user': 'Update User',
        'user-details': 'User Details',
        'api-docs': 'API Documentation'
    };
    document.getElementById('page-title').textContent = titles[tabName];
    
    // Load data based on tab
    if (tabName === 'users-list') {
        fetchUsers();
    } else if (tabName === 'update-user' || tabName === 'user-details') {
        updateUserSelects();
    }
}

// Users List Functions
function renderUsersTable() {
    const tableBody = document.getElementById('users-table-body');
    tableBody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.fullName || '-'}</td>
            <td>
                <span class="role-badge role-badge--${user.role}">
                    ${user.role}
                </span>
            </td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td class="actions">
                <button class="btn btn--small btn--secondary" onclick="editUser(${user.id})">
                    Edit
                </button>
                <button class="btn btn--small btn--danger" onclick="confirmDeleteUser(${user.id})">
                    Delete
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (user) {
        // Switch to update tab
        switchTab('update-user');
        
        // Pre-fill form
        document.getElementById('update-user-select').value = userId;
        loadUserForUpdate();
    }
}

function confirmDeleteUser(userId) {
    const user = users.find(u => u.id === userId);
    if (user && confirm(`Are you sure you want to delete user "${user.username}"?`)) {
        deleteUser(userId);
    }
}

function refreshUsers() {
    fetchUsers();
}

// Add User Form
function handleAddUserForm() {
    const form = document.getElementById('add-user-form');
    const formData = new FormData(form);
    
    const userData = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        fullName: formData.get('fullName'),
        role: formData.get('role')
    };
    
    // Basic validation
    if (!userData.username || !userData.email || !userData.password) {
        showNotification('Username, email, and password are required', 'error');
        return;
    }
    
    createUser(userData).then(() => {
        form.reset();
        switchTab('users-list');
    }).catch(error => {
        // Error already handled in apiCall
    });
}

// Update User Functions
function updateUserSelects() {
    const updateSelect = document.getElementById('update-user-select');
    const detailsSelect = document.getElementById('details-user-select');
    
    [updateSelect, detailsSelect].forEach(select => {
        if (select) {
            select.innerHTML = '<option value="">Select a user...</option>';
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${user.username} (${user.email})`;
                select.appendChild(option);
            });
        }
    });
}

function loadUserForUpdate() {
    const userId = document.getElementById('update-user-select').value;
    if (!userId) return;
    
    const user = users.find(u => u.id == userId);
    if (user) {
        document.getElementById('update-username').value = user.username;
        document.getElementById('update-email').value = user.email;
        document.getElementById('update-fullName').value = user.fullName || '';
        document.getElementById('update-role').value = user.role;
        document.getElementById('update-password').value = '';
    }
}

function handleUpdateUserForm() {
    const userId = document.getElementById('update-user-select').value;
    if (!userId) {
        showNotification('Please select a user to update', 'error');
        return;
    }
    
    const form = document.getElementById('update-user-form');
    const formData = new FormData(form);
    
    const userData = {};
    
    // Only include fields that have values
    if (formData.get('username')) userData.username = formData.get('username');
    if (formData.get('email')) userData.email = formData.get('email');
    if (formData.get('password')) userData.password = formData.get('password');
    if (formData.get('fullName')) userData.fullName = formData.get('fullName');
    if (formData.get('role')) userData.role = formData.get('role');
    
    updateUser(parseInt(userId), userData).then(() => {
        loadUserForUpdate(); // Refresh the form with updated data
        showNotification('User updated successfully', 'success');
    }).catch(error => {
        // Error already handled in apiCall
    });
}

// User Details Functions
function loadUserDetails() {
    const userId = document.getElementById('details-user-select').value;
    const detailsContainer = document.getElementById('user-details-content');
    
    if (!userId) {
        detailsContainer.innerHTML = '<p>Please select a user to view details.</p>';
        return;
    }
    
    getUserById(parseInt(userId)).then(user => {
        detailsContainer.innerHTML = `
            <div class="user-details">
                <div class="detail-group">
                    <label>ID:</label>
                    <span>${user.id}</span>
                </div>
                <div class="detail-group">
                    <label>Username:</label>
                    <span>${user.username}</span>
                </div>
                <div class="detail-group">
                    <label>Email:</label>
                    <span>${user.email}</span>
                </div>
                <div class="detail-group">
                    <label>Full Name:</label>
                    <span>${user.fullName || 'Not provided'}</span>
                </div>
                <div class="detail-group">
                    <label>Role:</label>
                    <span class="role-badge role-badge--${user.role}">${user.role}</span>
                </div>
                <div class="detail-group">
                    <label>Password Hash:</label>
                    <span class="password-hash">${user.password}</span>
                </div>
                <div class="detail-group">
                    <label>Created At:</label>
                    <span>${new Date(user.createdAt).toLocaleString()}</span>
                </div>
                <div class="detail-group">
                    <label>Updated At:</label>
                    <span>${new Date(user.updatedAt).toLocaleString()}</span>
                </div>
            </div>
        `;
    }).catch(error => {
        detailsContainer.innerHTML = '<p>Failed to load user details.</p>';
    });
}

// API Documentation
const apiEndpoints = [
    {
        method: "GET",
        endpoint: "/api/users",
        description: "Retrieve all users",
        authentication: "Required"
    },
    {
        method: "GET",
        endpoint: "/api/users/:id",
        description: "Retrieve user by ID",
        authentication: "Required"
    },
    {
        method: "POST",
        endpoint: "/api/users",
        description: "Create new user with password hashing",
        authentication: "Admin only"
    },
    {
        method: "PUT",
        endpoint: "/api/users/:id",
        description: "Update existing user",
        authentication: "Admin or Owner"
    },
    {
        method: "DELETE",
        endpoint: "/api/users/:id",
        description: "Delete user",
        authentication: "Admin only"
    },
    {
        method: "GET",
        endpoint: "/api/health",
        description: "Health check endpoint",
        authentication: "None"
    }
];

function renderAPIDocumentation() {
    const container = document.getElementById('api-docs-content');
    container.innerHTML = `
        <div class="api-docs">
            <h3>Available Endpoints</h3>
            <p>Base URL: <code>${API_BASE_URL}</code></p>
            <div class="endpoints-list">
                ${apiEndpoints.map(endpoint => `
                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method method--${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                            <span class="endpoint-path">${endpoint.endpoint}</span>
                        </div>
                        <div class="endpoint-details">
                            <p>${endpoint.description}</p>
                            <p><strong>Authentication:</strong> ${endpoint.authentication}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const tabName = item.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // Forms
    document.getElementById('add-user-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleAddUserForm();
    });
    
    document.getElementById('update-user-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleUpdateUserForm();
    });
    
    document.getElementById('update-user-select')?.addEventListener('change', loadUserForUpdate);
    document.getElementById('details-user-select')?.addEventListener('change', loadUserDetails);
    
    // Initialize
    switchTab('users-list');
    renderAPIDocumentation();
    
    // Check API connection
    apiCall('/health').then(() => {
        showNotification('Connected to API server', 'success');
    }).catch(() => {
        showNotification('Failed to connect to API server. Make sure the Go backend is running on localhost:8080', 'error');
    });
});

// Export functions for global access
window.switchTab = switchTab;
window.refreshUsers = refreshUsers;
window.editUser = editUser;
window.confirmDeleteUser = confirmDeleteUser;
window.loadUserForUpdate = loadUserForUpdate;
window.loadUserDetails = loadUserDetails;
'''

# Write the updated JavaScript file
with open('app_backend.js', 'w') as f:
    f.write(js_content)

print("Created updated JavaScript file that connects to the Go backend API")
print("Files created:")
print("1. main.go - Complete Go REST API with GORM and PostgreSQL")
print("2. go.mod - Go module file with dependencies")
print("3. .env.example - Environment configuration template")
print("4. schema.sql - PostgreSQL database schema")
print("5. docker-compose.yml - Docker composition for easy deployment")
print("6. Dockerfile - Container definition")
print("7. README.md - Complete documentation")
print("8. app_backend.js - Updated frontend that connects to Go API")