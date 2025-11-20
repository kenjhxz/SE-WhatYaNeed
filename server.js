const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve only necessary static files (CSS, JS libraries from CDN are used in HTML)
// Not serving entire directory to avoid exposing sensitive files

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'whatyaneed-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: 'strict' // CSRF protection
    }
}));

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized. Please login.' });
    }
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden. Admin access required.' });
    }
};

// ==================== AUTHENTICATION ROUTES ====================

// Register endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, role, location } = req.body;

        // Validation
        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Password validation (minimum 6 characters)
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Role validation
        if (!['requester', 'volunteer', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role specified' });
        }

        // Check if user already exists
        const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        const [result] = await db.query(
            'INSERT INTO users (name, email, password, location, role, verified) VALUES (?, ?, ?, ?, ?, FALSE)',
            [name, email, hashedPassword, location || '', role]
        );

        res.status(201).json({
            message: 'User registered successfully',
            userId: result.insertId
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Validation
        if (!email || !password || !role) {
            return res.status(400).json({ error: 'Email, password, and role are required' });
        }

        // Find user
        const [users] = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, role]);
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials or role' });
        }

        const user = users[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials or role' });
        }

        // Create session
        req.session.user = {
            userId: user.user_id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.name.split(' ').map(n => n[0]).join('').toUpperCase()
        };

        res.json({
            message: 'Login successful',
            user: req.session.user
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.json({ message: 'Logout successful' });
    });
});

// Get current user
app.get('/api/user', isAuthenticated, (req, res) => {
    res.json({ user: req.session.user });
});

// ==================== REQUEST ROUTES ====================

// Get all requests
app.get('/api/requests', async (req, res) => {
    try {
        const { category, urgency, location, search } = req.query;
        
        let query = `
            SELECT r.*, u.name as requester_name 
            FROM requests r 
            JOIN users u ON r.requester_id = u.user_id 
            WHERE 1=1
        `;
        const params = [];

        if (category && category !== 'All Categories') {
            query += ' AND r.category = ?';
            params.push(category);
        }

        if (urgency && urgency !== 'Any Urgency') {
            query += ' AND r.urgency_level = ?';
            params.push(urgency.toLowerCase());
        }

        if (location && location !== 'All Locations') {
            query += ' AND r.location = ?';
            params.push(location);
        }

        if (search) {
            query += ' AND (r.title LIKE ? OR r.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY r.posted_date DESC';

        const [requests] = await db.query(query, params);
        res.json(requests);
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

// Get user's requests
app.get('/api/requests/user', isAuthenticated, async (req, res) => {
    try {
        const [requests] = await db.query(
            'SELECT * FROM requests WHERE requester_id = ? ORDER BY posted_date DESC',
            [req.session.user.userId]
        );
        res.json(requests);
    } catch (error) {
        console.error('Error fetching user requests:', error);
        res.status(500).json({ error: 'Failed to fetch user requests' });
    }
});

// Create new request
app.post('/api/requests', isAuthenticated, async (req, res) => {
    try {
        const { title, description, category, urgency, address } = req.body;

        // Validation
        if (!title || !description || !category || !urgency || !address) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Title validation
        if (title.length < 5 || title.length > 150) {
            return res.status(400).json({ error: 'Title must be between 5 and 150 characters' });
        }

        // Description validation
        if (description.length < 10) {
            return res.status(400).json({ error: 'Description must be at least 10 characters long' });
        }

        // Category validation
        if (category === 'Select a category') {
            return res.status(400).json({ error: 'Please select a valid category' });
        }

        // Urgency validation
        if (urgency === 'Select urgency level') {
            return res.status(400).json({ error: 'Please select urgency level' });
        }

        const urgencyLevel = urgency.toLowerCase();

        const [result] = await db.query(
            'INSERT INTO requests (requester_id, title, description, category, urgency_level, location, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.session.user.userId, title, description, category, urgencyLevel, address, 'open']
        );

        res.status(201).json({
            message: 'Request created successfully',
            requestId: result.insertId
        });
    } catch (error) {
        console.error('Error creating request:', error);
        res.status(500).json({ error: 'Failed to create request' });
    }
});

// Update request status
app.put('/api/requests/:id/status', isAuthenticated, async (req, res) => {
    try {
        const { status } = req.body;
        const requestId = req.params.id;

        // Check if user owns this request or is admin
        const [requests] = await db.query('SELECT * FROM requests WHERE request_id = ?', [requestId]);
        
        if (requests.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const request = requests[0];
        
        if (request.requester_id !== req.session.user.userId && req.session.user.role !== 'admin') {
            return res.status(403).json({ error: 'You do not have permission to update this request' });
        }

        await db.query('UPDATE requests SET status = ? WHERE request_id = ?', [status, requestId]);

        res.json({ message: 'Request status updated successfully' });
    } catch (error) {
        console.error('Error updating request:', error);
        res.status(500).json({ error: 'Failed to update request' });
    }
});

// Delete request
app.delete('/api/requests/:id', isAuthenticated, async (req, res) => {
    try {
        const requestId = req.params.id;

        // Check if user owns this request or is admin
        const [requests] = await db.query('SELECT * FROM requests WHERE request_id = ?', [requestId]);
        
        if (requests.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const request = requests[0];
        
        if (request.requester_id !== req.session.user.userId && req.session.user.role !== 'admin') {
            return res.status(403).json({ error: 'You do not have permission to delete this request' });
        }

        await db.query('DELETE FROM requests WHERE request_id = ?', [requestId]);

        res.json({ message: 'Request deleted successfully' });
    } catch (error) {
        console.error('Error deleting request:', error);
        res.status(500).json({ error: 'Failed to delete request' });
    }
});

// ==================== ADMIN ROUTES ====================

// Get all users (admin only)
app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const [users] = await db.query('SELECT user_id, name, email, location, role, verified FROM users');
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get admin statistics (admin only)
app.get('/api/admin/stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const [userCount] = await db.query('SELECT COUNT(*) as count FROM users');
        const [requestCount] = await db.query('SELECT COUNT(*) as count FROM requests WHERE status = "open"');
        const [offerCount] = await db.query('SELECT COUNT(*) as count FROM help_offers WHERE status = "pending"');

        res.json({
            activeUsers: userCount[0].count,
            pendingRequests: requestCount[0].count,
            pendingOffers: offerCount[0].count
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Approve/deny request (admin only)
app.put('/api/admin/requests/:id/approve', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { approved } = req.body;
        const requestId = req.params.id;

        const status = approved ? 'open' : 'closed';

        await db.query('UPDATE requests SET status = ? WHERE request_id = ?', [status, requestId]);

        res.json({ message: `Request ${approved ? 'approved' : 'denied'} successfully` });
    } catch (error) {
        console.error('Error approving/denying request:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// ==================== NOTIFICATION ROUTES ====================

// Get user notifications
app.get('/api/notifications', isAuthenticated, async (req, res) => {
    try {
        const [notifications] = await db.query(
            'SELECT * FROM notifications WHERE recipient_id = ? ORDER BY sent_date DESC LIMIT 10',
            [req.session.user.userId]
        );
        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// ==================== SERVE FRONTEND ====================

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'WYNWireframes.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
