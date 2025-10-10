// Application state and data
let users = [
    {
        id: 1,
        username: "admin",
        email: "admin@example.com",
        password: "$argon2id$v=19$m=65536,t=3,p=2$abc123def456",
        fullName: "System Administrator",
        role: "admin",
        createdAt: "2024-01-15T10:30:00Z",
        updatedAt: "2024-01-15T10:30:00Z"
    },
    {
        id: 2,
        username: "jdoe",
        email: "john.doe@example.com",
        password: "$bcrypt$2b$12$xyz789uvw012",
        fullName: "John Doe",
        role: "user",
        createdAt: "2024-02-20T14:15:00Z",
        updatedAt: "2024-02-22T09:45:00Z"
    },
    {
        id: 3,
        username: "moderator1",
        email: "mod@example.com",
        password: "$argon2id$v=19$m=65536,t=3,p=2$def456ghi789",
        fullName: "Jane Smith",
        role: "moderator",
        createdAt: "2024-03-10T11:20:00Z",
        updatedAt: "2024-03-10T11:20:00Z"
    },
    {
        id: 4,
        username: "testuser",
        email: "test@example.com",
        password: "$bcrypt$2b$12$mno345pqr678",
        fullName: "Test User",
        role: "user",
        createdAt: "2024-03-25T16:00:00Z",
        updatedAt: "2024-03-25T16:00:00Z"
    }
];

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
        method: "POST",
        endpoint: "/api/auth/login",
        description: "User login with credential validation",
        authentication: "None"
    },
    {
        method: "POST",
        endpoint: "/api/auth/logout",
        description: "User logout",
        authentication: "Required"
    }
];

let currentDeleteUserId = null;
let nextUserId = 5;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeForms();
    renderUsersTable();
    populateUserSelects();
    renderAPIDocumentation();
});

// Navigation functionality
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('page-title');

    navItems.forEach(navItem => {
        navItem.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all nav items and tab contents
            navItems.forEach(item => item.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked nav item and corresponding tab
            this.classList.add('active');
            const targetTabElement = document.getElementById(targetTab);
            if (targetTabElement) {
                targetTabElement.classList.add('active');
            }
            
            // Update page title
            const titles = {
                'users-list': 'Users List',
                'add-user': 'Add New User',
                'update-user': 'Update User',
                'user-details': 'User Details',
                'api-docs': 'API Documentation'
            };
            pageTitle.textContent = titles[targetTab] || 'User CRUD REST API';
        });
    });
}

// Form initialization
function initializeForms() {
    // Add user form
    const addUserForm = document.getElementById('add-user-form');
    if (addUserForm) {
        addUserForm.addEventListener('submit', handleAddUser);
    }
    
    // Update user form
    const updateUserForm = document.getElementById('update-user-form');
    if (updateUserForm) {
        updateUserForm.addEventListener('submit', handleUpdateUser);
    }
    
    const updateUserSelect = document.getElementById('update-user-select');
    if (updateUserSelect) {
        updateUserSelect.addEventListener('change', handleUpdateUserSelect);
    }
    
    // User details select
    const detailsUserSelect = document.getElementById('details-user-select');
    if (detailsUserSelect) {
        detailsUserSelect.addEventListener('change', handleUserDetailsSelect);
    }
}

// Render users table
function renderUsersTable() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.fullName}</td>
            <td><span class="role-badge role-badge--${user.role}">${user.role}</span></td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-edit" onclick="editUser(${user.id})" title="Edit User">
                        ✏️
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteUser(${user.id})" title="Delete User">
                        🗑️
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Populate user select dropdowns
function populateUserSelects() {
    const updateSelect = document.getElementById('update-user-select');
    const detailsSelect = document.getElementById('details-user-select');
    
    if (updateSelect) {
        // Clear existing options (keep first option)
        updateSelect.innerHTML = '<option value="">Choose a user...</option>';
        
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.fullName} (${user.username})`;
            updateSelect.appendChild(option);
        });
    }
    
    if (detailsSelect) {
        // Clear existing options (keep first option)
        detailsSelect.innerHTML = '<option value="">Choose a user...</option>';
        
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.fullName} (${user.username})`;
            detailsSelect.appendChild(option);
        });
    }
}

// Handle add user form submission
async function handleAddUser(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const btnText = submitButton.querySelector('.btn-text');
    const loadingSpinner = submitButton.querySelector('.loading-spinner');
    
    // Show loading state
    if (btnText) btnText.style.display = 'none';
    if (loadingSpinner) loadingSpinner.classList.remove('hidden');
    submitButton.disabled = true;
    
    // Simulate API delay
    await delay(1500);
    
    try {
        const userData = {
            id: nextUserId++,
            username: document.getElementById('add-username').value,
            email: document.getElementById('add-email').value,
            password: generateHashedPassword(document.getElementById('add-password').value),
            fullName: document.getElementById('add-fullname').value,
            role: document.getElementById('add-role').value,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Validate unique username and email
        if (users.some(user => user.username === userData.username)) {
            throw new Error('Username already exists');
        }
        if (users.some(user => user.email === userData.email)) {
            throw new Error('Email already exists');
        }
        
        users.push(userData);
        renderUsersTable();
        populateUserSelects();
        form.reset();
        
        showToast('User created successfully!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        // Hide loading state
        if (btnText) btnText.style.display = 'inline';
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
        submitButton.disabled = false;
    }
}

// Handle update user selection
function handleUpdateUserSelect(event) {
    const userId = parseInt(event.target.value);
    const form = document.getElementById('update-user-form');
    
    if (!form) return;
    
    if (userId) {
        const user = users.find(u => u.id === userId);
        if (user) {
            // Pre-fill form
            const usernameField = document.getElementById('update-username');
            const emailField = document.getElementById('update-email');
            const fullnameField = document.getElementById('update-fullname');
            const roleField = document.getElementById('update-role');
            const passwordField = document.getElementById('update-password');
            
            if (usernameField) usernameField.value = user.username;
            if (emailField) emailField.value = user.email;
            if (fullnameField) fullnameField.value = user.fullName;
            if (roleField) roleField.value = user.role;
            if (passwordField) passwordField.value = '';
            
            form.style.display = 'block';
        }
    } else {
        form.style.display = 'none';
    }
}

// Handle update user form submission
async function handleUpdateUser(event) {
    event.preventDefault();
    
    const userId = parseInt(document.getElementById('update-user-select').value);
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const btnText = submitButton.querySelector('.btn-text');
    const loadingSpinner = submitButton.querySelector('.loading-spinner');
    
    // Show loading state
    if (btnText) btnText.style.display = 'none';
    if (loadingSpinner) loadingSpinner.classList.remove('hidden');
    submitButton.disabled = true;
    
    // Simulate API delay
    await delay(1500);
    
    try {
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            throw new Error('User not found');
        }
        
        const updatedData = {
            username: document.getElementById('update-username').value,
            email: document.getElementById('update-email').value,
            fullName: document.getElementById('update-fullname').value,
            role: document.getElementById('update-role').value,
            updatedAt: new Date().toISOString()
        };
        
        // Validate unique username and email (excluding current user)
        if (users.some(user => user.id !== userId && user.username === updatedData.username)) {
            throw new Error('Username already exists');
        }
        if (users.some(user => user.id !== userId && user.email === updatedData.email)) {
            throw new Error('Email already exists');
        }
        
        // Update password if provided
        const newPassword = document.getElementById('update-password').value;
        if (newPassword) {
            updatedData.password = generateHashedPassword(newPassword);
        }
        
        // Update user
        users[userIndex] = { ...users[userIndex], ...updatedData };
        
        renderUsersTable();
        populateUserSelects();
        
        showToast('User updated successfully!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        // Hide loading state
        if (btnText) btnText.style.display = 'inline';
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
        submitButton.disabled = false;
    }
}

// Handle user details selection
function handleUserDetailsSelect(event) {
    const userId = parseInt(event.target.value);
    const detailsCard = document.getElementById('user-details-card');
    
    if (!detailsCard) return;
    
    if (userId) {
        const user = users.find(u => u.id === userId);
        if (user) {
            // Populate details
            const fields = {
                'detail-id': user.id,
                'detail-username': user.username,
                'detail-email': user.email,
                'detail-fullname': user.fullName,
                'detail-role': user.role,
                'detail-password': user.password,
                'detail-created': formatDate(user.createdAt),
                'detail-updated': formatDate(user.updatedAt)
            };
            
            Object.keys(fields).forEach(fieldId => {
                const element = document.getElementById(fieldId);
                if (element) {
                    element.textContent = fields[fieldId];
                }
            });
            
            detailsCard.classList.remove('hidden');
        }
    } else {
        detailsCard.classList.add('hidden');
    }
}

// Edit user function
function editUser(userId) {
    // Switch to update tab
    const updateTab = document.querySelector('[data-tab="update-user"]');
    if (updateTab) {
        updateTab.click();
        
        // Small delay to ensure tab is switched
        setTimeout(() => {
            // Select user in dropdown
            const updateSelect = document.getElementById('update-user-select');
            if (updateSelect) {
                updateSelect.value = userId;
                updateSelect.dispatchEvent(new Event('change'));
            }
        }, 100);
    }
}

// Delete user function
function deleteUser(userId) {
    const user = users.find(u => u.id === userId);
    if (user) {
        currentDeleteUserId = userId;
        const userInfoElement = document.getElementById('delete-user-info');
        if (userInfoElement) {
            userInfoElement.textContent = `${user.fullName} (${user.username})`;
        }
        const modal = document.getElementById('delete-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }
}

// Confirm delete
async function confirmDelete() {
    if (currentDeleteUserId) {
        const modal = document.getElementById('delete-modal');
        if (modal) modal.classList.add('loading');
        
        // Simulate API delay
        await delay(1000);
        
        try {
            const userIndex = users.findIndex(u => u.id === currentDeleteUserId);
            if (userIndex !== -1) {
                const deletedUser = users[userIndex];
                users.splice(userIndex, 1);
                
                renderUsersTable();
                populateUserSelects();
                closeDeleteModal();
                
                showToast(`User "${deletedUser.username}" deleted successfully!`, 'success');
            }
        } catch (error) {
            showToast('Failed to delete user', 'error');
        } finally {
            if (modal) modal.classList.remove('loading');
        }
    }
}

// Close delete modal
function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    currentDeleteUserId = null;
}

// Cancel update
function cancelUpdate() {
    const updateSelect = document.getElementById('update-user-select');
    const updateForm = document.getElementById('update-user-form');
    
    if (updateSelect) updateSelect.value = '';
    if (updateForm) updateForm.style.display = 'none';
}

// Refresh users
async function refreshUsers() {
    const button = event.target;
    if (!button) return;
    
    const originalText = button.textContent;
    
    button.textContent = 'Refreshing...';
    button.disabled = true;
    
    // Simulate API delay
    await delay(1000);
    
    renderUsersTable();
    populateUserSelects();
    
    button.textContent = originalText;
    button.disabled = false;
    
    showToast('Users refreshed successfully!', 'info');
}

// Render API documentation
function renderAPIDocumentation() {
    const container = document.getElementById('api-docs-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    apiEndpoints.forEach(endpoint => {
        const endpointDiv = document.createElement('div');
        endpointDiv.className = 'api-endpoint';
        
        endpointDiv.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <span class="api-method api-method--${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                <span class="api-path">${endpoint.endpoint}</span>
            </div>
            <div class="api-description">${endpoint.description}</div>
            <div class="api-auth">
                <strong>Authentication:</strong> ${endpoint.authentication}
            </div>
        `;
        
        container.appendChild(endpointDiv);
    });
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function generateHashedPassword(password) {
    // Simulate different hashing algorithms
    const algorithms = ['$bcrypt$2b$12$', '$argon2id$v=19$m=65536,t=3,p=2$'];
    const algorithm = algorithms[Math.floor(Math.random() * algorithms.length)];
    const hash = Math.random().toString(36).substr(2, 12);
    return algorithm + hash;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Toast notification system
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    
    toast.innerHTML = `
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="closeToast(this)">×</button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto close after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            closeToast(toast.querySelector('.toast-close'));
        }
    }, 5000);
}

function closeToast(closeButton) {
    if (!closeButton) return;
    
    const toast = closeButton.parentNode;
    toast.style.animation = 'slideOut 0.3s ease-in forwards';
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

// Add slide out animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Modal event listeners
document.addEventListener('click', function(event) {
    const modal = document.getElementById('delete-modal');
    if (modal && (event.target === modal || event.target.classList.contains('modal-overlay'))) {
        closeDeleteModal();
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeDeleteModal();
    }
});

// Form validation
document.addEventListener('DOMContentLoaded', function() {
    const addUserForm = document.getElementById('add-user-form');
    const updateUserForm = document.getElementById('update-user-form');
    
    if (addUserForm) {
        addUserForm.addEventListener('input', function(event) {
            validateForm(event.target);
        });
    }
    
    if (updateUserForm) {
        updateUserForm.addEventListener('input', function(event) {
            validateForm(event.target);
        });
    }
});

function validateForm(input) {
    const field = input;
    const value = field.value.trim();
    
    // Remove existing error styling
    field.classList.remove('error');
    
    // Email validation
    if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            field.classList.add('error');
            return false;
        }
    }
    
    // Password strength validation
    if (field.type === 'password' && value && field.id.includes('add')) {
        if (value.length < 8) {
            field.classList.add('error');
            return false;
        }
    }
    
    return true;
}

// Add error styles
const errorStyle = document.createElement('style');
errorStyle.textContent = `
    .form-control.error {
        border-color: var(--color-error);
        box-shadow: 0 0 0 3px rgba(var(--color-error-rgb), 0.2);
    }
`;
document.head.appendChild(errorStyle);