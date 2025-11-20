// WhatYaNeed Backend Server - ULTIMATE FIX
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CRITICAL FIX: Parse body BEFORE session
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CRITICAL FIX: CORS Configuration - Must allow specific origin
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// CRITICAL FIX: Session configuration
app.use(session({
    secret: 'whatyaneed-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    name: 'sessionId',
    cookie: { 
        secure: false,           // false for HTTP
        httpOnly: false,          // CRITICAL: false so cookies work
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'none',        // CRITICAL: 'none' for cross-origin
        path: '/'
    },
    proxy: true                   // CRITICAL: trust proxy
}));

// CRITICAL: Add headers middleware AFTER session
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    next();
});

// Session debugging
app.use((req, res, next) => {
    console.log('=== REQUEST ===');
    console.log('URL:', req.url);
    console.log('Method:', req.method);
    console.log('Origin:', req.headers.origin);
    console.log('Session ID:', req.sessionID);
    console.log('Session User:', req.session.user);
    console.log('Cookie:', req.headers.cookie);
    console.log('===============');
    next();
});

// Database pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'WhatYaNeed',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection()
    .then(connection => {
        console.log('✓ Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('✗ Database connection failed:', err.message);
    });

// Auth middleware
const isAuthenticated = (req, res, next) => {
    console.log('🔒 Auth Check - User:', req.session.user);
    
    if (req.session && req.session.user) {
        console.log('✓ User authenticated:', req.session.user.email);
        next();
    } else {
        console.log('✗ User not authenticated');
        res.status(401).json({ error: 'Unauthorized. Please login.' });
    }
};

const hasRole = (...roles) => {
    return (req, res, next) => {
        if (req.session.user && roles.includes(req.session.user.role)) {
            next();
        } else {
            res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
        }
    };
};

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role, location } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (!['requester', 'volunteer'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const [existing] = await pool.query(
            'SELECT user_id FROM users WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            'INSERT INTO users (name, email, password, role, location, verified) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, hashedPassword, role, location || null, false]
        );

        console.log('✓ User registered:', email);

        res.status(201).json({
            message: 'Registration successful',
            user: {
                id: result.insertId,
                name,
                email,
                role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login - FIXED
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('🔐 Login attempt:', email);

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            console.log('✗ User not found:', email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.log('✗ Invalid password for:', email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // CRITICAL: Create session BEFORE saving
        req.session.user = {
            id: user.user_id,
            name: user.name,
            email: user.email,
            role: user.role,
            location: user.location,
            verified: user.verified
        };

        // CRITICAL: Save session and wait
        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    reject(err);
                } else {
                    console.log('✓ Session saved for:', email);
                    console.log('✓ Session ID:', req.sessionID);
                    console.log('✓ Session data:', req.session.user);
                    resolve();
                }
            });
        });

        res.json({
            message: 'Login successful',
            user: req.session.user
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed: ' + error.message });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    const email = req.session.user?.email;
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('sessionId');
        console.log('✓ User logged out:', email);
        res.json({ message: 'Logout successful' });
    });
});

// Get current user
app.get('/api/auth/me', isAuthenticated, (req, res) => {
    console.log('✓ Returning user:', req.session.user.email);
    res.json({ user: req.session.user });
});

// Test route
app.get('/api/test-session', (req, res) => {
    res.json({ 
        hasSession: !!req.session,
        hasUser: !!req.session?.user,
        user: req.session?.user || null,
        sessionId: req.sessionID,
        cookies: req.headers.cookie
    });
});

// ==================== REQUEST ROUTES ====================

app.get('/api/requests', async (req, res) => {
    try {
        const { category, urgency, location, search } = req.query;
        
        let query = `
            SELECT r.*, u.name as requester_name, u.email as requester_email
            FROM requests r
            JOIN users u ON r.requester_id = u.user_id
            WHERE r.status = 'open'
        `;
        const params = [];

        if (category) {
            query += ' AND r.category = ?';
            params.push(category);
        }
        if (urgency) {
            query += ' AND r.urgency_level = ?';
            params.push(urgency);
        }
        if (location) {
            query += ' AND r.location LIKE ?';
            params.push(`%${location}%`);
        }
        if (search) {
            query += ' AND (r.title LIKE ? OR r.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY r.posted_date DESC';

        const [requests] = await pool.query(query, params);
        res.json({ requests });
    } catch (error) {
        console.error('Get requests error:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

app.get('/api/requests/:id', async (req, res) => {
    try {
        const [requests] = await pool.query(
            `SELECT r.*, u.name as requester_name, u.email as requester_email
             FROM requests r
             JOIN users u ON r.requester_id = u.user_id
             WHERE r.request_id = ?`,
            [req.params.id]
        );

        if (requests.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        res.json({ request: requests[0] });
    } catch (error) {
        console.error('Get request error:', error);
        res.status(500).json({ error: 'Failed to fetch request' });
    }
});

app.post('/api/requests', isAuthenticated, hasRole('requester'), async (req, res) => {
    try {
        console.log('📝 Creating request for user:', req.session.user.email);
        const { title, description, category, urgency_level, location } = req.body;
        const requester_id = req.session.user.id;

        if (!title || !description) {
            return res.status(400).json({ error: 'Title and description are required' });
        }

        const [result] = await pool.query(
            `INSERT INTO requests (requester_id, title, description, category, urgency_level, location, status)
             VALUES (?, ?, ?, ?, ?, ?, 'open')`,
            [requester_id, title, description, category, urgency_level, location]
        );

        console.log('✓ Request created:', result.insertId);

        res.status(201).json({
            message: 'Request created successfully',
            request_id: result.insertId
        });
    } catch (error) {
        console.error('Create request error:', error);
        res.status(500).json({ error: 'Failed to create request' });
    }
});

app.get('/api/requester/requests', isAuthenticated, hasRole('requester'), async (req, res) => {
    try {
        const [requests] = await pool.query(
            `SELECT r.*, 
             (SELECT COUNT(*) FROM help_offers WHERE request_id = r.request_id AND status = 'pending') as pending_offers
             FROM requests r
             WHERE r.requester_id = ?
             ORDER BY r.posted_date DESC`,
            [req.session.user.id]
        );

        res.json({ requests });
    } catch (error) {
        console.error('Get requester requests error:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

app.put('/api/requests/:id', isAuthenticated, hasRole('requester'), async (req, res) => {
    try {
        const { title, description, category, urgency_level, location } = req.body;
        const request_id = req.params.id;
        const requester_id = req.session.user.id;

        const [requests] = await pool.query(
            'SELECT requester_id FROM requests WHERE request_id = ?',
            [request_id]
        );

        if (requests.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (requests[0].requester_id !== requester_id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await pool.query(
            `UPDATE requests 
             SET title = ?, description = ?, category = ?, urgency_level = ?, location = ?
             WHERE request_id = ?`,
            [title, description, category, urgency_level, location, request_id]
        );

        res.json({ message: 'Request updated successfully' });
    } catch (error) {
        console.error('Update request error:', error);
        res.status(500).json({ error: 'Failed to update request' });
    }
});

app.patch('/api/requests/:id/close', isAuthenticated, hasRole('requester'), async (req, res) => {
    try {
        const request_id = req.params.id;
        const requester_id = req.session.user.id;

        const [requests] = await pool.query(
            'SELECT requester_id FROM requests WHERE request_id = ?',
            [request_id]
        );

        if (requests.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (requests[0].requester_id !== requester_id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await pool.query(
            'UPDATE requests SET status = "closed" WHERE request_id = ?',
            [request_id]
        );

        res.json({ message: 'Request closed successfully' });
    } catch (error) {
        console.error('Close request error:', error);
        res.status(500).json({ error: 'Failed to close request' });
    }
});

// ==================== OFFER ROUTES ====================

app.post('/api/offers', isAuthenticated, hasRole('volunteer'), async (req, res) => {
    try {
        const { request_id } = req.body;
        const volunteer_id = req.session.user.id;

        if (!request_id) {
            return res.status(400).json({ error: 'Request ID is required' });
        }

        const [requests] = await pool.query(
            'SELECT requester_id FROM requests WHERE request_id = ? AND status = "open"',
            [request_id]
        );

        if (requests.length === 0) {
            return res.status(404).json({ error: 'Request not found or closed' });
        }

        const [existing] = await pool.query(
            'SELECT offer_id FROM help_offers WHERE volunteer_id = ? AND request_id = ?',
            [volunteer_id, request_id]
        );

        if (existing.length > 0) {
            return res.status(409).json({ error: 'Already offered help' });
        }

        const [result] = await pool.query(
            'INSERT INTO help_offers (volunteer_id, request_id, status) VALUES (?, ?, "pending")',
            [volunteer_id, request_id]
        );

        await pool.query(
            'INSERT INTO notifications (recipient_id, message) VALUES (?, ?)',
            [requests[0].requester_id, `${req.session.user.name} offered help`]
        );

        res.status(201).json({
            message: 'Offer submitted successfully',
            offer_id: result.insertId
        });
    } catch (error) {
        console.error('Create offer error:', error);
        res.status(500).json({ error: 'Failed to create offer' });
    }
});

app.get('/api/volunteer/offers', isAuthenticated, hasRole('volunteer'), async (req, res) => {
    try {
        const [offers] = await pool.query(
            `SELECT ho.*, r.title, r.description, r.location, r.status as request_status,
             u.name as requester_name, u.email as requester_email
             FROM help_offers ho
             JOIN requests r ON ho.request_id = r.request_id
             JOIN users u ON r.requester_id = u.user_id
             WHERE ho.volunteer_id = ?
             ORDER BY ho.offer_date DESC`,
            [req.session.user.id]
        );

        res.json({ offers });
    } catch (error) {
        console.error('Get offers error:', error);
        res.status(500).json({ error: 'Failed to fetch offers' });
    }
});

app.get('/api/requests/:id/offers', isAuthenticated, hasRole('requester'), async (req, res) => {
    try {
        const request_id = req.params.id;

        const [requests] = await pool.query(
            'SELECT requester_id FROM requests WHERE request_id = ?',
            [request_id]
        );

        if (requests.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (requests[0].requester_id !== req.session.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const [offers] = await pool.query(
            `SELECT ho.*, u.name as volunteer_name, u.email as volunteer_email
             FROM help_offers ho
             JOIN users u ON ho.volunteer_id = u.user_id
             WHERE ho.request_id = ?
             ORDER BY ho.offer_date DESC`,
            [request_id]
        );

        res.json({ offers });
    } catch (error) {
        console.error('Get offers error:', error);
        res.status(500).json({ error: 'Failed to fetch offers' });
    }
});

app.patch('/api/offers/:id/:action', isAuthenticated, hasRole('requester'), async (req, res) => {
    try {
        const offer_id = req.params.id;
        const action = req.params.action;

        if (!['accept', 'decline'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action' });
        }

        const [offers] = await pool.query(
            `SELECT ho.volunteer_id, ho.request_id, r.requester_id
             FROM help_offers ho
             JOIN requests r ON ho.request_id = r.request_id
             WHERE ho.offer_id = ?`,
            [offer_id]
        );

        if (offers.length === 0) {
            return res.status(404).json({ error: 'Offer not found' });
        }

        if (offers[0].requester_id !== req.session.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const newStatus = action === 'accept' ? 'accepted' : 'declined';

        await pool.query(
            'UPDATE help_offers SET status = ? WHERE offer_id = ?',
            [newStatus, offer_id]
        );

        if (action === 'accept') {
            await pool.query(
                'UPDATE requests SET status = "help_offered" WHERE request_id = ?',
                [offers[0].request_id]
            );
        }

        const message = action === 'accept' 
            ? `Your offer was accepted by ${req.session.user.name}!`
            : `Your offer was declined.`;
        
        await pool.query(
            'INSERT INTO notifications (recipient_id, message) VALUES (?, ?)',
            [offers[0].volunteer_id, message]
        );

        res.json({ message: `Offer ${action}ed successfully` });
    } catch (error) {
        console.error('Update offer error:', error);
        res.status(500).json({ error: 'Failed to update offer' });
    }
});

// ==================== NOTIFICATION ROUTES ====================

app.get('/api/notifications', isAuthenticated, async (req, res) => {
    try {
        const [notifications] = await pool.query(
            'SELECT * FROM notifications WHERE recipient_id = ? ORDER BY sent_date DESC LIMIT 20',
            [req.session.user.id]
        );

        res.json({ notifications });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// ==================== ADMIN ROUTES ====================

app.get('/api/admin/users', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT user_id, name, email, role, location, verified, created_at FROM users ORDER BY created_at DESC'
        );

        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.get('/api/admin/stats', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
        const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
        const [requestCount] = await pool.query('SELECT COUNT(*) as count FROM requests WHERE status = "open"');
        const [completedToday] = await pool.query(
            'SELECT COUNT(*) as count FROM requests WHERE status = "closed" AND DATE(posted_date) = CURDATE()'
        );

        res.json({
            totalUsers: userCount[0].count,
            activeRequests: requestCount[0].count,
            completedToday: completedToday[0].count
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`✓ Server running on http://localhost:${PORT}`);
    console.log(`✓ CORS enabled for http://127.0.0.1:5500`);
    console.log(`✓ Session cookies configured`);
    console.log(`✓ Open frontend at: http://127.0.0.1:5500`);
    console.log(`${'='.repeat(50)}\n`);
});