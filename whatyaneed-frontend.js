// WhatYaNeed - Frontend with SESSION FIX
const API_URL = 'http://localhost:3000/api';

let currentUser = null;
let allRequests = [];
let notificationPollingInterval = null;
let selectedFilter = null; // For dashboard card filtering
let selectedImageFile = null; // For profile image upload

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 WhatYaNeed Frontend Initialized');
    console.log('📡 API URL:', API_URL);
    initializeEventListeners();
    checkAuthStatus();
    loadHomeRequests();
});

// ==================== EVENT LISTENERS ====================
function initializeEventListeners() {
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const closeLogin = document.getElementById('close-login');
    const closeRegister = document.getElementById('close-register');
    const switchToRegister = document.getElementById('switch-to-register');
    const switchToLogin = document.getElementById('switch-to-login');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const requestForm = document.getElementById('request-form');

    // Profile dropdown and notification bell
    const profileTrigger = document.getElementById('profile-trigger');
    const profileDropdown = document.getElementById('profile-dropdown');
    const notificationBell = document.getElementById('notification-bell');
    const notificationDropdown = document.getElementById('notification-dropdown');
    const viewProfileLink = document.getElementById('view-profile-link');
    const manageAccountLink = document.getElementById('manage-account-link');
    const logoutLink = document.getElementById('logout-link');
    const gotoManageAccount = document.getElementById('goto-manage-account');

    // Manage account forms
    const updateProfileForm = document.getElementById('update-profile-form');
    const changePasswordForm = document.getElementById('change-password-form');
    const selectImageBtn = document.getElementById('select-image-btn');
    const profileImageInput = document.getElementById('profile-image-input');
    const uploadImageBtn = document.getElementById('upload-image-btn');
    const switchRoleBtn = document.getElementById('switch-role-btn');

    // Search bar
    const homeSearch = document.getElementById('home-search');
    const homeSearchBtn = document.getElementById('home-search-btn');

    loginBtn.addEventListener('click', () => loginModal.style.display = 'flex');
    registerBtn.addEventListener('click', () => registerModal.style.display = 'flex');
    closeLogin.addEventListener('click', () => loginModal.style.display = 'none');
    closeRegister.addEventListener('click', () => registerModal.style.display = 'none');

    switchToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginModal.style.display = 'none';
        registerModal.style.display = 'flex';
    });

    switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerModal.style.display = 'none';
        loginModal.style.display = 'flex';
    });

    // Profile dropdown toggle
    if (profileTrigger) {
        profileTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
            notificationDropdown.classList.remove('show');
        });
    }

    // Notification bell toggle
    if (notificationBell) {
        notificationBell.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationDropdown.classList.toggle('show');
            profileDropdown.classList.remove('show');
            if (notificationDropdown.classList.contains('show')) {
                loadNotificationsDropdown();
            }
        });
    }

    // Profile navigation
    if (viewProfileLink) {
        viewProfileLink.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToSection('view-profile');
            profileDropdown.classList.remove('show');
        });
    }

    if (manageAccountLink) {
        manageAccountLink.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToSection('manage-account');
            profileDropdown.classList.remove('show');
        });
    }

    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }

    if (gotoManageAccount) {
        gotoManageAccount.addEventListener('click', () => {
            navigateToSection('manage-account');
        });
    }

    // Manage account forms
    if (updateProfileForm) {
        updateProfileForm.addEventListener('submit', handleUpdateProfile);
    }

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleChangePassword);
    }

    // Profile image upload
    if (selectImageBtn) {
        selectImageBtn.addEventListener('click', () => {
            profileImageInput.click();
        });
    }

    if (profileImageInput) {
        profileImageInput.addEventListener('change', handleImageSelect);
    }

    if (uploadImageBtn) {
        uploadImageBtn.addEventListener('click', handleImageUpload);
    }

    // Role switch
    if (switchRoleBtn) {
        switchRoleBtn.addEventListener('click', handleRoleSwitch);
    }

    // Search functionality
    if (homeSearch) {
        homeSearch.addEventListener('input', handleSearch);
    }

    if (homeSearchBtn) {
        homeSearchBtn.addEventListener('click', handleSearch);
    }

    document.querySelectorAll('.user-type').forEach(type => {
        type.addEventListener('click', function () {
            const parent = this.parentElement;
            parent.querySelectorAll('.user-type').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });

    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    requestForm.addEventListener('submit', handleCreateRequest);

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetSection = this.getAttribute('data-section');
            navigateToSection(targetSection);
        });
    });

    // Click outside to close dropdowns
    const offersModal = document.getElementById('offers-modal');
    window.addEventListener('click', function (e) {
        if (e.target === loginModal) loginModal.style.display = 'none';
        if (e.target === registerModal) registerModal.style.display = 'none';
        if (e.target === offersModal) offersModal.style.display = 'none';

        if (profileDropdown && profileTrigger && !profileTrigger.contains(e.target)) {
            profileDropdown.classList.remove('show');
        }
        if (notificationDropdown && notificationBell && !notificationBell.contains(e.target)) {
            notificationDropdown.classList.remove('show');
        }
    });
}

// ==================== AUTH FUNCTIONS ====================
async function checkAuthStatus() {
    try {
        console.log('🔍 Checking authentication status...');
        const response = await fetch(`${API_URL}/auth/me`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateUIAfterLogin();
            console.log('✅ Authenticated as:', currentUser.email);
        } else {
            currentUser = null;
            console.log('ℹ️  Not authenticated');
        }
    } catch (error) {
        console.log('ℹ️  Auth check failed:', error.message);
        currentUser = null;
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        console.log('🔐 Attempting login for:', email);

        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // CRITICAL!
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            console.log('✅ Login successful:', currentUser.email);

            // CRITICAL: Wait a moment for session to propagate
            await new Promise(resolve => setTimeout(resolve, 100));

            updateUIAfterLogin();
            document.getElementById('login-modal').style.display = 'none';
            alert(`Welcome back, ${data.user.name}!`);

            // Navigate based on role
            if (currentUser.role === 'requester') {
                navigateToSection('requester-dashboard');
                // WAIT before loading dashboard data
                setTimeout(() => loadRequesterDashboard(), 200);
            } else if (currentUser.role === 'volunteer') {
                navigateToSection('browse');
                setTimeout(() => loadBrowseRequests(), 200);
            } else if (currentUser.role === 'admin') {
                window.location.href = 'admin.html';
            }
        } else {
            console.error('❌ Login failed:', data.error);
            alert(data.error || 'Login failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        alert('Connection error. Make sure the backend server is running on http://localhost:3000');
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const location = document.getElementById('register-location').value;
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    const role = document.querySelector('#register-modal .user-type.active').dataset.role;

    if (password !== confirm) {
        alert("Passwords don't match!");
        return;
    }

    if (password.length < 6) {
        alert("Password must be at least 6 characters long!");
        return;
    }

    try {
        console.log('📝 Attempting registration for:', email);

        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role, location })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Registration successful');
            alert('Registration successful! Please login with your credentials.');
            document.getElementById('register-modal').style.display = 'none';
            document.getElementById('login-modal').style.display = 'flex';
            document.getElementById('login-email').value = email;
        } else {
            console.error('❌ Registration failed:', data.error);
            alert(data.error || 'Registration failed. Please try again.');
        }
    } catch (error) {
        console.error('❌ Registration error:', error);
        alert('Connection error. Please try again.');
    }
}

async function handleLogout() {
    try {
        console.log('🚪 Logging out...');

        await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });

        currentUser = null;

        // Stop notification polling
        if (notificationPollingInterval) {
            clearInterval(notificationPollingInterval);
            notificationPollingInterval = null;
        }

        document.getElementById('user-actions').style.display = 'flex';
        document.getElementById('user-profile').style.display = 'none';

        document.getElementById('nav-browse').style.display = 'none';
        document.getElementById('nav-my-requests').style.display = 'none';
        document.getElementById('nav-create').style.display = 'none';
        document.getElementById('nav-my-offers').style.display = 'none';

        navigateToSection('home');
        console.log('✅ Logged out successfully');
        alert('You have been logged out successfully.');
    } catch (error) {
        console.error('❌ Logout error:', error);
        alert('Logout failed. Please try again.');
    }
}

// ==================== UI UPDATE FUNCTIONS ====================
function updateUIAfterLogin() {
    console.log('🎨 Updating UI for user:', currentUser.email);

    document.getElementById('user-actions').style.display = 'none';
    document.getElementById('user-profile').style.display = 'flex';

    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-role').textContent =
        currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);

    // Update avatars
    updateAvatars();

    // Update profile pages
    updateProfilePages();

    document.getElementById('nav-browse').style.display = 'none';
    document.getElementById('nav-my-requests').style.display = 'none';
    document.getElementById('nav-create').style.display = 'none';
    document.getElementById('nav-my-offers').style.display = 'none';

    if (currentUser.role === 'requester') {
        document.getElementById('nav-my-requests').style.display = 'list-item';
        document.getElementById('nav-create').style.display = 'list-item';
    } else if (currentUser.role === 'volunteer') {
        document.getElementById('nav-browse').style.display = 'list-item';
        document.getElementById('nav-my-offers').style.display = 'list-item';
    }

    // Start notification polling
    startNotificationPolling();
}

function updateAvatars() {
    const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const avatarElements = [
        document.getElementById('user-avatar'),
        document.getElementById('profile-avatar-large'),
        document.getElementById('avatar-preview')
    ];

    avatarElements.forEach(element => {
        if (element) {
            if (currentUser.profile_image) {
                element.innerHTML = `<img src="${currentUser.profile_image}" alt="Profile">`;
            } else {
                element.innerHTML = initials; // Clear any existing images and show initials
            }
        }
    });
}

function updateProfilePages() {
    if (!currentUser) return;

    // Update View Profile page
    document.getElementById('profile-display-name').textContent = currentUser.name;
    document.getElementById('profile-role-badge').textContent =
        currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    document.getElementById('profile-info-name').textContent = currentUser.name;
    document.getElementById('profile-info-email').textContent = currentUser.email;
    document.getElementById('profile-info-role').textContent =
        currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    document.getElementById('profile-info-location').textContent = currentUser.location || 'Not specified';
    document.getElementById('profile-info-status').textContent = currentUser.verified ? 'Verified' : 'Active';

    // Update Manage Account page
    document.getElementById('profile-name').value = currentUser.name;
    document.getElementById('profile-location').value = currentUser.location || '';
    document.getElementById('current-role-display').textContent =
        currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);

    const targetRole = currentUser.role === 'requester' ? 'Volunteer' : 'Requester';
    document.getElementById('target-role').textContent = targetRole;

    // Check role switch cooldown
    checkRoleSwitchCooldown();
}


function navigateToSection(sectionId) {
    console.log('📄 Navigating to:', sectionId);

    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active-section');
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active-section');

        // Load data with delay to ensure session is ready
        if (sectionId === 'browse') {
            setTimeout(() => loadBrowseRequests(), 100);
        }
        if (sectionId === 'requester-dashboard') {
            setTimeout(() => {
                loadRequesterDashboard();
                // Initialize dashboard card filtering after dashboard loads
                setTimeout(() => initializeDashboardCardFiltering(), 200);
            }, 100);
        }
        if (sectionId === 'volunteer-dashboard') {
            setTimeout(() => {
                loadVolunteerDashboard();
                // Initialize dashboard card filtering after dashboard loads
                setTimeout(() => initializeDashboardCardFiltering(), 200);
            }, 100);
        }
        if (sectionId === 'view-profile') {
            updateProfilePages();
        }
        if (sectionId === 'manage-account') {
            updateProfilePages();
        }
    }
}

// ==================== REQUEST FUNCTIONS ====================
async function loadHomeRequests() {
    try {
        console.log('📥 Loading home requests...');

        const response = await fetch(`${API_URL}/requests`);
        const data = await response.json();

        if (response.ok) {
            allRequests = data.requests;
            displayHomeRequests(data.requests.slice(0, 6));
            console.log(`✅ Loaded ${data.requests.length} requests`);
        }
    } catch (error) {
        console.error('❌ Error loading requests:', error);
        document.getElementById('home-requests-grid').innerHTML =
            '<p style="color: var(--warning);">Error loading requests. Server may be offline.</p>';
    }
}

function displayHomeRequests(requests) {
    const grid = document.getElementById('home-requests-grid');

    if (requests.length === 0) {
        grid.innerHTML = '<p>No requests available at the moment.</p>';
        return;
    }

    grid.innerHTML = requests.map(request => createRequestCard(request, false)).join('');
}

async function loadBrowseRequests() {
    try {
        console.log('📥 Loading browse requests...');

        const response = await fetch(`${API_URL}/requests`);
        const data = await response.json();

        if (response.ok) {
            displayBrowseRequests(data.requests);
        }
    } catch (error) {
        console.error('❌ Error loading requests:', error);
    }
}

function displayBrowseRequests(requests) {
    const grid = document.getElementById('browse-requests-grid');

    if (requests.length === 0) {
        grid.innerHTML = '<p>No open requests available at the moment.</p>';
        return;
    }

    grid.innerHTML = requests.map(request => createRequestCard(request, true)).join('');

    document.querySelectorAll('.offer-help-btn').forEach(btn => {
        btn.addEventListener('click', () => handleOfferHelp(btn.dataset.requestId));
    });
}

async function handleCreateRequest(e) {
    e.preventDefault();

    if (!currentUser) {
        alert('Please login to create a request.');
        return;
    }

    if (currentUser.role !== 'requester') {
        alert('Only requesters can create requests.');
        return;
    }

    const title = document.getElementById('request-title').value;
    const description = document.getElementById('request-description').value;
    const category = document.getElementById('request-category').value;
    const urgency_level = document.getElementById('request-urgency').value;
    const location = document.getElementById('request-location').value;

    console.log('📤 Creating request...');

    try {
        const response = await fetch(`${API_URL}/requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // CRITICAL!
            body: JSON.stringify({ title, description, category, urgency_level, location })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Request created:', data.request_id);
            alert('Request created successfully!');
            document.getElementById('request-form').reset();
            navigateToSection('requester-dashboard');
            setTimeout(() => loadRequesterDashboard(), 200);
        } else {
            console.error('❌ Request creation failed:', data);

            if (response.status === 401) {
                alert('Session expired. Please login again.');
                currentUser = null;
                updateUIAfterLogin();
            } else {
                alert(data.error || 'Failed to create request.');
            }
        }
    } catch (error) {
        console.error('❌ Error creating request:', error);
        alert('Connection error. Please try again.');
    }
}

async function handleOfferHelp(requestId) {
    if (!currentUser) {
        alert('Please login as a volunteer to offer help.');
        document.getElementById('login-modal').style.display = 'flex';
        return;
    }

    if (currentUser.role !== 'volunteer') {
        alert('Only volunteers can offer help.');
        return;
    }

    console.log('🤝 Offering help for request:', requestId);

    try {
        const response = await fetch(`${API_URL}/offers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // CRITICAL!
            body: JSON.stringify({ request_id: requestId })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Offer submitted');
            alert('Your help offer has been submitted successfully!');
            loadBrowseRequests();
        } else {
            if (response.status === 401) {
                alert('Session expired. Please login again.');
                currentUser = null;
                document.getElementById('login-modal').style.display = 'flex';
            } else {
                alert(data.error || 'Failed to submit offer.');
            }
        }
    } catch (error) {
        console.error('❌ Error submitting offer:', error);
        alert('Connection error. Please try again.');
    }
}

// ==================== DASHBOARD FUNCTIONS ====================
async function loadRequesterDashboard() {
    if (!currentUser || currentUser.role !== 'requester') return;

    console.log('📊 Loading requester dashboard...');

    try {
        const response = await fetch(`${API_URL}/requester/requests`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            displayRequesterRequests(data.requests);
            loadRequesterStats(data.requests);
        } else if (response.status === 401) {
            console.error('❌ Session expired');
            alert('Session expired. Please login again.');
            currentUser = null;
            navigateToSection('home');
        }
    } catch (error) {
        console.error('❌ Error loading requester dashboard:', error);
    }

    // Load notifications without blocking
    loadNotifications('requester-notifications');
}

function displayRequesterRequests(requests) {
    const grid = document.getElementById('requester-requests-grid');

    if (requests.length === 0) {
        grid.innerHTML = '<p>You haven\'t created any requests yet. <a href="#" onclick="navigateToSection(\'create\')">Create your first request</a></p>';
        return;
    }

    grid.innerHTML = requests.map(request => createRequesterRequestCard(request)).join('');

    // Attach event handlers
    document.querySelectorAll('.view-offers-btn').forEach(btn => {
        btn.addEventListener('click', () => handleViewOffers(btn.dataset.requestId, btn.dataset.requestTitle));
    });

    document.querySelectorAll('.open-chat-btn').forEach(btn => {
        btn.addEventListener('click', () => openChatbox(btn.dataset.requestId, btn.dataset.requestTitle));
    });

    document.querySelectorAll('.view-location-btn').forEach(btn => {
        btn.addEventListener('click', () => openLocationMap(btn.dataset.requestId));
    });
}

function loadRequesterStats(requests) {
    const activeCount = requests.filter(r => r.status === 'open').length;
    const completedCount = requests.filter(r => r.status === 'closed').length;
    const pendingOffers = requests.reduce((sum, r) => sum + (r.pending_offers || 0), 0);

    document.getElementById('requester-stats').innerHTML = `
        <div class="dashboard-card">
            <i class="fas fa-list-alt"></i>
            <h3>Active Requests</h3>
            <p>${activeCount} Open</p>
        </div>
        <div class="dashboard-card">
            <i class="fas fa-users"></i>
            <h3>Pending Offers</h3>
            <p>${pendingOffers} Offers</p>
        </div>
        <div class="dashboard-card">
            <i class="fas fa-check-circle"></i>
            <h3>Completed</h3>
            <p>${completedCount} Requests</p>
        </div>
    `;
}

async function loadVolunteerDashboard() {
    if (!currentUser || currentUser.role !== 'volunteer') return;

    console.log('📊 Loading volunteer dashboard...');

    try {
        const response = await fetch(`${API_URL}/volunteer/offers`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            displayVolunteerOffers(data.offers);
            loadVolunteerStats(data.offers);
        } else if (response.status === 401) {
            console.error('❌ Session expired');
            alert('Session expired. Please login again.');
            currentUser = null;
            navigateToSection('home');
        }
    } catch (error) {
        console.error('❌ Error loading volunteer dashboard:', error);
    }

    loadNotifications('volunteer-notifications');
}

function displayVolunteerOffers(offers) {
    const grid = document.getElementById('volunteer-offers-grid');

    if (offers.length === 0) {
        grid.innerHTML = '<p>You haven\'t offered help yet. <a href="#" onclick="navigateToSection(\'browse\')">Browse available requests</a></p>';
        return;
    }

    grid.innerHTML = offers.map(offer => createVolunteerOfferCard(offer)).join('');

    // Attach event handlers
    document.querySelectorAll('.open-chat-btn').forEach(btn => {
        btn.addEventListener('click', () => openChatbox(btn.dataset.requestId, btn.dataset.requestTitle));
    });

    document.querySelectorAll('.share-location-btn').forEach(btn => {
        btn.addEventListener('click', () => requestGeolocation());
    });
}

function loadVolunteerStats(offers) {
    const activeCount = offers.filter(o => o.status === 'pending' || o.status === 'accepted').length;
    const acceptedCount = offers.filter(o => o.status === 'accepted').length;

    document.getElementById('volunteer-stats').innerHTML = `
        <div class="dashboard-card">
            <i class="fas fa-hand-holding-heart"></i>
            <h3>Active Offers</h3>
            <p>${activeCount} Pending</p>
        </div>
        <div class="dashboard-card">
            <i class="fas fa-check-circle"></i>
            <h3>Accepted Offers</h3>
            <p>${acceptedCount} Tasks</p>
        </div>
        <div class="dashboard-card">
            <i class="fas fa-star"></i>
            <h3>Your Rating</h3>
            <p>4.9/5 Stars</p>
        </div>
    `;
}

// FIXED: Don't fail if notifications return empty
async function loadNotifications(containerId) {
    try {
        const response = await fetch(`${API_URL}/notifications`, {
            credentials: 'include'
        });

        const container = document.getElementById(containerId);

        if (response.ok) {
            const data = await response.json();

            if (data.notifications && data.notifications.length > 0) {
                container.innerHTML = data.notifications.map(notif => `
                    <div class="notification">
                        <h4><i class="fas fa-bell"></i> Notification</h4>
                        <p>${notif.message}</p>
                        <small>${new Date(notif.sent_date).toLocaleString()}</small>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p>No notifications yet.</p>';
            }
        } else {
            // Don't show error for notifications
            container.innerHTML = '<p>No notifications available.</p>';
        }
    } catch (error) {
        console.log('ℹ️  Could not load notifications (non-critical)');
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<p>No notifications available.</p>';
        }
    }
}

// ==================== HELPER FUNCTIONS ====================
function createRequestCard(request, showOfferButton) {
    const urgencyMap = { low: 'Low', medium: 'Moderate', high: 'Urgent' };

    return `
        <div class="post-card">
            <div class="post-image">
                <i class="fas fa-${getCategoryIcon(request.category)} fa-3x"></i>
            </div>
            <div class="post-content">
                <h3 class="post-title">${request.title}</h3>
                <div class="post-details">
                    <span><i class="fas fa-user"></i> ${request.requester_name}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${request.location || 'N/A'}</span>
                </div>
                <p class="post-description">${request.description}</p>
                <span class="post-status status-${request.urgency_level === 'high' ? 'urgent' : 'open'}">
                    ${urgencyMap[request.urgency_level] || request.urgency_level}
                </span>
                ${showOfferButton && currentUser && currentUser.role === 'volunteer' ? `
                    <div class="card-actions">
                        <button class="btn btn-primary offer-help-btn" data-request-id="${request.request_id}">
                            Offer Help
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function createRequesterRequestCard(request) {
    const statusMap = { open: 'Open', help_offered: 'Help Offered', closed: 'Completed' };

    return `
        <div class="post-card">
            <div class="post-image">
                <i class="fas fa-${getCategoryIcon(request.category)} fa-3x"></i>
            </div>
            <div class="post-content">
                <h3 class="post-title">${request.title}</h3>
                <div class="post-details">
                    <span><i class="fas fa-map-marker-alt"></i> ${request.location || 'N/A'}</span>
                    <span><i class="fas fa-clock"></i> ${new Date(request.posted_date).toLocaleDateString()}</span>
                </div>
                <p class="post-description">${request.description}</p>
                <span class="post-status status-${request.status === 'open' ? 'open' : 'completed'}">
                    ${statusMap[request.status]} ${request.pending_offers > 0 ? `- ${request.pending_offers} Offers` : ''}
                </span>
                ${request.pending_offers > 0 ? `
                    <div class="card-actions" style="margin-top: 1rem;">
                        <button class="btn btn-primary view-offers-btn" data-request-id="${request.request_id}" data-request-title="${escapeHtml(request.title)}">
                            <i class="fas fa-users"></i> View Offers (${request.pending_offers})
                        </button>
                    </div>
                ` : ''}
                ${request.status === 'help_offered' ? `
                    <div class="card-actions" style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                        <button class="btn btn-primary open-chat-btn" data-request-id="${request.request_id}" data-request-title="${escapeHtml(request.title)}">
                            <i class="fas fa-comments"></i> Chat
                        </button>
                        <button class="btn btn-success view-location-btn" data-request-id="${request.request_id}">
                            <i class="fas fa-map-marker-alt"></i> View Location
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function createVolunteerOfferCard(offer) {
    const statusMap = { pending: 'Pending', accepted: 'Accepted', declined: 'Declined' };

    return `
        <div class="post-card">
            <div class="post-image">
                <i class="fas fa-hand-holding-heart fa-3x"></i>
            </div>
            <div class="post-content">
                <h3 class="post-title">${offer.title}</h3>
                <div class="post-details">
                    <span><i class="fas fa-user"></i> ${offer.requester_name}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${offer.location || 'N/A'}</span>
                </div>
                <p class="post-description">${offer.description}</p>
                <span class="post-status status-${offer.status === 'accepted' ? 'completed' : 'pending'}">
                    ${statusMap[offer.status]}
                </span>
                ${offer.status === 'accepted' ? `
    <div class="card-actions" style="margin-top: 1rem; display: flex; gap: 0.5rem;">
        <button class="btn btn-primary open-chat-btn" data-request-id="${offer.request_id}" data-request-title="${escapeHtml(offer.title)}">
            <i class="fas fa-comments"></i> Chat with Requester
        </button>
        <button class="btn btn-outline share-location-btn">
            <i class="fas fa-map-marker-alt"></i> Share Location
        </button>
    </div>
` : ''}
            </div>
        </div>
    `;
}

function getCategoryIcon(category) {
    const icons = {
        'Home Repair': 'tools',
        'Groceries': 'shopping-cart',
        'Transportation': 'car',
        'Technology': 'laptop',
        'Errand': 'running',
        'Other': 'hand-holding-heart'
    };
    return icons[category] || 'hand-holding-heart';
}

// ==================== NOTIFICATION FUNCTIONS ====================

function startNotificationPolling() {
    // Clear any existing interval
    if (notificationPollingInterval) {
        clearInterval(notificationPollingInterval);
    }

    // Load immediately
    loadUnreadNotificationCount();

    // Poll every 30 seconds
    notificationPollingInterval = setInterval(() => {
        loadUnreadNotificationCount();
    }, 30000);
}

async function loadUnreadNotificationCount() {
    try {
        const response = await fetch(`${API_URL}/notifications/unread-count`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            const badge = document.getElementById('notification-badge');
            if (data.count > 0) {
                badge.textContent = data.count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.log('ℹ️  Could not load notification count');
    }
}

async function loadNotificationsDropdown() {
    try {
        const response = await fetch(`${API_URL}/notifications`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            const list = document.getElementById('notification-list');

            if (data.notifications && data.notifications.length > 0) {
                list.innerHTML = data.notifications.map(notif => `
                    <div class="notification-item ${notif.is_read ? '' : 'unread'}" data-id="${notif.notification_id}">
                        <p>${notif.message}</p>
                        <small>${new Date(notif.sent_date).toLocaleString()}</small>
                    </div>
                `).join('');

                // Add click handlers to mark as read
                list.querySelectorAll('.notification-item.unread').forEach(item => {
                    item.addEventListener('click', () => markNotificationAsRead(item.dataset.id));
                });
            } else {
                list.innerHTML = '<p class="no-notifications">No new notifications</p>';
            }
        }
    } catch (error) {
        console.log('ℹ️  Could not load notifications');
    }
}

async function markNotificationAsRead(notificationId) {
    try {
        const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
            method: 'PATCH',
            credentials: 'include'
        });

        if (response.ok) {
            // Reload notifications
            loadNotificationsDropdown();
            loadUnreadNotificationCount();
        }
    } catch (error) {
        console.log('ℹ️  Could not mark notification as read');
    }
}

// ==================== PROFILE MANAGEMENT FUNCTIONS ====================

async function handleUpdateProfile(e) {
    e.preventDefault();

    const name = document.getElementById('profile-name').value;
    const location = document.getElementById('profile-location').value;

    try {
        const response = await fetch(`${API_URL}/auth/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, location })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            updateUIAfterLogin();
            alert('Profile updated successfully!');
        } else {
            alert(data.error || 'Failed to update profile');
        }
    } catch (error) {
        console.error('❌ Update profile error:', error);
        alert('Connection error. Please try again.');
    }
}

async function handleChangePassword(e) {
    e.preventDefault();

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;

    if (newPassword !== confirmPassword) {
        alert('New passwords do not match!');
        return;
    }

    if (newPassword.length < 6) {
        alert('New password must be at least 6 characters!');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Password changed successfully!');
            document.getElementById('change-password-form').reset();
        } else {
            alert(data.error || 'Failed to change password');
        }
    } catch (error) {
        console.error('❌ Change password error:', error);
        alert('Connection error. Please try again.');
    }
}

function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
        alert('Image size must be less than 2MB');
        return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }

    selectedImageFile = file;

    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('avatar-preview');
        preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        document.getElementById('upload-image-btn').disabled = false;
    };
    reader.readAsDataURL(file);
}

async function handleImageUpload() {
    if (!selectedImageFile) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const imageData = e.target.result;

        try {
            const response = await fetch(`${API_URL}/user/profile-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ imageData })
            });

            const data = await response.json();

            if (response.ok) {
                currentUser.profile_image = data.imageData;
                updateAvatars();
                alert('Profile image uploaded successfully!');
                document.getElementById('upload-image-btn').disabled = true;
            } else {
                alert(data.error || 'Failed to upload image');
            }
        } catch (error) {
            console.error('❌ Upload image error:', error);
            alert('Connection error. Please try again.');
        }
    };
    reader.readAsDataURL(selectedImageFile);
}

async function handleRoleSwitch() {
    if (!confirm('Are you sure you want to switch roles? You can only switch once every 24 hours.')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/user/switch-role`, {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            updateUIAfterLogin();
            alert(`Role switched successfully! You are now a ${data.newRole}.`);

            // Navigate to appropriate dashboard
            if (data.newRole === 'requester') {
                navigateToSection('requester-dashboard');
            } else {
                navigateToSection('browse');
            }
        } else {
            if (data.remainingHours) {
                alert(`Role switch cooldown active. You can switch again in ${data.remainingHours} hours.`);
            } else {
                alert(data.error || 'Failed to switch role');
            }
        }
    } catch (error) {
        console.error('❌ Switch role error:', error);
        alert('Connection error. Please try again.');
    }
}

function checkRoleSwitchCooldown() {
    const cooldownMessage = document.getElementById('cooldown-message');
    const switchBtn = document.getElementById('switch-role-btn');

    if (!currentUser.last_role_switch) {
        cooldownMessage.style.display = 'none';
        switchBtn.disabled = false;
        return;
    }

    const lastSwitch = new Date(currentUser.last_role_switch).getTime();
    const now = Date.now();
    const timeSinceSwitch = now - lastSwitch;
    const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours

    if (timeSinceSwitch < cooldownPeriod) {
        const remainingTime = cooldownPeriod - timeSinceSwitch;
        const hoursRemaining = Math.ceil(remainingTime / (60 * 60 * 1000));
        cooldownMessage.textContent = `Cooldown active. You can switch roles again in ${hoursRemaining} hours.`;
        cooldownMessage.style.display = 'block';
        switchBtn.disabled = true;
    } else {
        cooldownMessage.style.display = 'none';
        switchBtn.disabled = false;
    }
}

// ==================== SEARCH FUNCTIONALITY ====================

function handleSearch() {
    const searchTerm = document.getElementById('home-search').value.toLowerCase().trim();

    if (!searchTerm) {
        displayHomeRequests(allRequests.slice(0, 6));
        return;
    }

    const filtered = allRequests.filter(request => {
        return request.title.toLowerCase().includes(searchTerm) ||
            request.description.toLowerCase().includes(searchTerm) ||
            (request.category && request.category.toLowerCase().includes(searchTerm)) ||
            (request.location && request.location.toLowerCase().includes(searchTerm));
    });

    displayHomeRequests(filtered);
}

// ==================== DASHBOARD CARD FILTERING ====================

function initializeDashboardCardFiltering() {
    // This will be called when dashboard is loaded
    document.querySelectorAll('.dashboard-card').forEach(card => {
        card.addEventListener('click', function () {
            // Remove active class from all cards
            document.querySelectorAll('.dashboard-card').forEach(c => c.classList.remove('active'));

            // Add active class to clicked card
            this.classList.add('active');

            // Get filter type from card content
            const cardText = this.querySelector('h3').textContent;

            // Apply filter based on card type
            if (cardText.includes('Active')) {
                selectedFilter = 'active';
            } else if (cardText.includes('Pending')) {
                selectedFilter = 'pending';
            } else if (cardText.includes('Completed')) {
                selectedFilter = 'completed';
            }

            // Reload dashboard with filter
            if (currentUser.role === 'requester') {
                loadRequesterDashboard();
            } else if (currentUser.role === 'volunteer') {
                loadVolunteerDashboard();
            }
        });
    });
}

// ==================== URGENT TIMER FUNCTIONALITY ====================

function addUrgentTimers() {
    // Add timers to all urgent requests
    document.querySelectorAll('.post-card').forEach(card => {
        const urgencyElement = card.querySelector('.status-urgent');
        if (urgencyElement) {
            const requestId = card.querySelector('.offer-help-btn')?.dataset.requestId;
            if (requestId) {
                // TODO: Implement full timer functionality when urgent_timer_start is populated in database
                // For now, display a static indicator for urgent requests
                const timerHTML = `
                    <div class="urgent-timer">
                        <i class="fas fa-clock"></i>
                        <span>Urgent Request</span>
                    </div>
                `;
                const contentDiv = card.querySelector('.post-content');
                if (contentDiv && !contentDiv.querySelector('.urgent-timer')) {
                    contentDiv.insertAdjacentHTML('beforeend', timerHTML);
                }
            }
        }
    });
}

// ==================== OFFERS MANAGEMENT ====================

async function handleViewOffers(requestId, requestTitle) {
    const offersModal = document.getElementById('offers-modal');
    const offersModalTitle = document.getElementById('offers-modal-title');
    const offersList = document.getElementById('offers-list');
    const closeOffers = document.getElementById('close-offers');

    if (offersModalTitle) {
        offersModalTitle.textContent = `Offers for: ${requestTitle}`;
    }

    if (offersModal) {
        offersModal.style.display = 'flex';
    }

    if (offersList) {
        offersList.innerHTML = '<p>Loading offers...</p>';
    }

    // Close modal handler
    if (closeOffers) {
        closeOffers.onclick = () => {
            offersModal.style.display = 'none';
        };
    }

    try {
        const response = await fetch(`${API_URL}/requests/${requestId}/offers`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load offers');
        }

        const data = await response.json();
        displayOffers(data.offers, requestId);

    } catch (error) {
        console.error('Load offers error:', error);
        if (offersList) {
            offersList.innerHTML = '<p>Failed to load offers. Please try again.</p>';
        }
        showNotification('Failed to load offers', 'error');
    }
}

function displayOffers(offers, requestId) {
    const offersList = document.getElementById('offers-list');

    if (!offers || offers.length === 0) {
        offersList.innerHTML = '<p>No offers yet for this request.</p>';
        return;
    }

    const offersHTML = offers.map(offer => {
        const initials = getInitials(offer.volunteer_name);
        const statusClass = offer.status === 'accepted' ? 'accepted' : 'pending';

        return `
            <div class="offer-item">
                <div class="offer-avatar">${initials}</div>
                <div class="offer-details">
                    <h4>${escapeHtml(offer.volunteer_name)}</h4>
                    <p><i class="fas fa-envelope"></i> ${escapeHtml(offer.volunteer_email)}</p>
                    ${offer.volunteer_location ? `<p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(offer.volunteer_location)}</p>` : ''}
                    <p><i class="fas fa-clock"></i> Offered on ${new Date(offer.offer_date).toLocaleDateString()}</p>
                    <span class="offer-status ${statusClass}">${offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}</span>
                </div>
                ${offer.status === 'pending' ? `
                    <div class="offer-actions">
                        <button class="btn btn-success accept-offer-btn" data-offer-id="${offer.offer_id}" data-request-id="${requestId}">
                            <i class="fas fa-check"></i> Accept
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    offersList.innerHTML = offersHTML;

    // Attach accept handlers
    document.querySelectorAll('.accept-offer-btn').forEach(btn => {
        btn.addEventListener('click', () => handleAcceptOffer(btn.dataset.offerId, btn.dataset.requestId));
    });
}

async function handleAcceptOffer(offerId, requestId) {
    if (!confirm('Are you sure you want to accept this offer? This will notify the volunteer.')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/offers/${offerId}/accept`, {
            method: 'PATCH',
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to accept offer');
        }

        showNotification('Offer accepted successfully!', 'success');

        // Close modal
        const offersModal = document.getElementById('offers-modal');
        if (offersModal) {
            offersModal.style.display = 'none';
        }

        // Reload requester dashboard
        await loadRequesterDashboard();

    } catch (error) {
        console.error('Accept offer error:', error);
        showNotification(error.message || 'Failed to accept offer', 'error');
    }
}

// ==================== UTILITY FUNCTIONS ====================

// Helper function to get initials from name
function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

// Helper function for escaping HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== GEOLOCATION SHARING ====================

async function requestGeolocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }

    if (!confirm('Share your current location? This will be visible to requesters for accepted offers.')) {
        return;
    }

    // Show loading message
    const loadingMsg = document.createElement('div');
    loadingMsg.id = 'geolocation-loading';
    loadingMsg.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4361ee;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    loadingMsg.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        Getting your location... (this may take 30 seconds)
    `;
    document.body.appendChild(loadingMsg);

    console.log('📍 Requesting location with 30s timeout...');

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            const accuracy = position.coords.accuracy;

            console.log('📍 Location obtained:', { latitude, longitude, accuracy });

            // Remove loading message
            const loading = document.getElementById('geolocation-loading');
            if (loading) loading.remove();

            try {
                const response = await fetch(`${API_URL}/user/location`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ latitude, longitude })
                });

                if (response.ok) {
                    showNotification('Location shared successfully! Requesters can now see your location.', 'success');
                    console.log('✅ Location updated on server');
                } else {
                    const error = await response.json();
                    showNotification('Failed to share location: ' + (error.error || 'Unknown error'), 'error');
                    console.error('Location update failed:', error);
                }
            } catch (error) {
                console.error('Location update error:', error);
                showNotification('Failed to share location. Please try again.', 'error');
            }
        },
        (error) => {
            // Remove loading message
            const loading = document.getElementById('geolocation-loading');
            if (loading) loading.remove();

            console.error('Geolocation error:', error);
            
            let errorMessage = 'Unable to get your location. ';
            let suggestion = '';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Location access was denied.';
                    suggestion = 'Please allow location access in your browser settings and try again.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location information is unavailable.';
                    suggestion = 'Make sure location services are enabled on your device.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Location request timed out.';
                    suggestion = 'This can happen indoors or in areas with poor GPS signal. Try:\n' +
                                '1. Moving near a window\n' +
                                '2. Going outside\n' +
                                '3. Enabling WiFi for better location accuracy\n' +
                                '4. Trying again in a moment';
                    break;
                default:
                    errorMessage += 'An unknown error occurred.';
                    suggestion = 'Please try again later.';
            }
            
            showNotification(errorMessage + '\n\n' + suggestion, 'error');
        },
        {
            enableHighAccuracy: true,    // Request GPS (more accurate but slower)
            timeout: 30000,               // Wait up to 30 seconds (increased from 10)
            maximumAge: 60000             // Accept cached location up to 1 minute old
        }
    );
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#4361ee'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        max-width: 400px;
        white-space: pre-wrap;
        animation: slideIn 0.3s ease-out;
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: start; gap: 0.5rem;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <div>${message}</div>
        </div>
    `;
    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}


window.requestGeolocation = requestGeolocation;
window.navigateToSection = navigateToSection;