// WhatYaNeed Backend Server - SESSION FIX FOR 401 ERRORS
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 3000;

console.log('\n🚀 Starting WhatYaNeed Backend Server...\n');

// ==================== CRITICAL: MIDDLEWARE ORDER ====================

// 1. CORS MUST BE FIRST - BEFORE EVERYTHING!
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://127.0.0.1:5501', 'http://localhost:5501'],
    credentials: true,  // CRITICAL for cookies!
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Set-Cookie']
}));

// Handle preflight requests
app.options('*', cors());

// 2. Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Session Configuration - FIXED FOR PERSISTENCE
app.use(session({
    secret: 'whatyaneed-secret-key-2024-secure',
    resave: false,                    // Don't save session if unmodified
    saveUninitialized: false,         // Don't create session until something stored
    name: 'sessionId',
    cookie: {
        secure: false,                // false for HTTP (localhost)
        httpOnly: true,               // Prevent XSS attacks
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        sameSite: 'lax',              // 'lax' for same-origin requests
        path: '/',
                   // Let browser determine
    },
    
}));

// 4. Debug middleware - see every request
app.use((req, res, next) => {
    console.log(`\n[${new Date().toISOString()}]`);
    console.log(`📨 ${req.method} ${req.path}`);
    console.log(`🔐 Session ID: ${req.sessionID}`);
    console.log(`👤 User: ${req.session?.user?.email || 'Not logged in'}`);
    console.log(`🍪 Cookie: ${req.headers.cookie ? 'Present' : 'Missing'}`);
    next();
});

// ==================== DATABASE CONNECTION ====================

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '0116jrjk97',
    database: process.env.DB_NAME || 'WhatYaNeed',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        
        const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
        console.log(`👥 Users in database: ${users[0].count}`);
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    }
})();

// ==================== AUTH MIDDLEWARE ====================

const isAuthenticated = (req, res, next) => {
    console.log('🔒 Auth Check:');
    console.log('   - Session exists:', !!req.session);
    console.log('   - Session ID:', req.sessionID);
    console.log('   - User in session:', !!req.session?.user);
    console.log('   - User email:', req.session?.user?.email || 'none');
    
    if (req.session && req.session.user) {
        console.log('   ✅ User is authenticated');
        next();
    } else {
        console.log('   ❌ User is NOT authenticated');
        res.status(401).json({ 
            error: 'Unauthorized. Please login.',
            debug: {
                hasSession: !!req.session,
                hasUser: !!req.session?.user,
                sessionId: req.sessionID
            }
        });
    }
};

const hasRole = (...roles) => {
    return (req, res, next) => {
        if (req.session.user && roles.includes(req.session.user.role)) {
            next();
        } else {
            res.status(403).json({ 
                error: 'Forbidden. Insufficient permissions.',
                requiredRole: roles,
                yourRole: req.session.user?.role
            });
        }
    };
};

// ==================== ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Test session endpoint
app.get('/api/test-session', (req, res) => {
    res.json({
        message: 'Session test',
        hasSession: !!req.session,
        sessionId: req.sessionID,
        hasUser: !!req.session?.user,
        user: req.session?.user || null
    });
});

// ==================== AUTH ROUTES ====================

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role, location } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'All fields required' });
        }

        if (!['requester', 'volunteer'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password, role, location, verified) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, hashedPassword, role, location || null, false]
        );

        console.log('✅ User registered:', email);
        res.status(201).json({
            message: 'Registration successful',
            user: { id: result.insertId, name, email, role }
        });
    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔐 Login attempt:', email);

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // CRITICAL: Create session with user data
        req.session.user = {
            id: user.user_id,
            name: user.name,
            email: user.email,
            role: user.role,
            location: user.location,
            verified: user.verified
        };

        // CRITICAL: Explicitly save the session and WAIT for it
        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) {
                    console.error('❌ Session save error:', err);
                    reject(err);
                } else {
                    console.log('✅ Session saved successfully');
                    console.log('✅ Session ID:', req.sessionID);
                    console.log('✅ User in session:', req.session.user.email);
                    resolve();
                }
            });
        });

        // Send response AFTER session is saved
        res.json({
            message: 'Login successful',
            user: req.session.user
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    const email = req.session?.user?.email;
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('sessionId');
        console.log('✅ User logged out:', email);
        res.json({ message: 'Logout successful' });
    });
});

app.get('/api/auth/me', isAuthenticated, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT user_id, name, email, role, location, verified, profile_image, last_role_switch FROM users WHERE user_id = ?',
            [req.session.user.id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = {
            id: users[0].user_id,
            name: users[0].name,
            email: users[0].email,
            role: users[0].role,
            location: users[0].location,
            verified: users[0].verified,
            profile_image: users[0].profile_image,
            last_role_switch: users[0].last_role_switch
        };
        
        // Update session with fresh data
        req.session.user = user;
        
        res.json({ user });
    } catch (error) {
        console.error('❌ Get user error:', error);
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
});

// ==================== USER PROFILE ROUTES ====================

// Update user profile (name, location)
app.put('/api/auth/profile', isAuthenticated, async (req, res) => {
    try {
        const { name, location } = req.body;
        const userId = req.session.user.id;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        await pool.query(
            'UPDATE users SET name = ?, location = ? WHERE user_id = ?',
            [name, location || null, userId]
        );

        // Update session
        req.session.user.name = name;
        req.session.user.location = location;

        console.log('✅ Profile updated for user:', userId);
        res.json({ message: 'Profile updated successfully', user: req.session.user });
    } catch (error) {
        console.error('❌ Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Change password
app.put('/api/auth/password', isAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.session.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new passwords are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        // Verify current password
        const [users] = await pool.query('SELECT password FROM users WHERE user_id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const validPassword = await bcrypt.compare(currentPassword, users[0].password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash and update new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ? WHERE user_id = ?', [hashedPassword, userId]);

        console.log('✅ Password changed for user:', userId);
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('❌ Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Upload profile image
app.post('/api/user/profile-image', isAuthenticated, async (req, res) => {
    try {
        const { imageData } = req.body;
        const userId = req.session.user.id;

        if (!imageData) {
            return res.status(400).json({ error: 'Image data is required' });
        }

        // Validate base64 image size (approximately 2MB limit)
        // Note: The 0.75 factor assumes pure base64 content without data URL prefix
        const base64Size = imageData.length * 0.75; // Approximate size in bytes
        if (base64Size > 2 * 1024 * 1024) {
            return res.status(400).json({ error: 'Image size exceeds 2MB limit' });
        }

        await pool.query('UPDATE users SET profile_image = ? WHERE user_id = ?', [imageData, userId]);

        // Update session
        req.session.user.profile_image = imageData;

        console.log('✅ Profile image uploaded for user:', userId);
        res.json({ message: 'Profile image uploaded successfully', imageData });
    } catch (error) {
        console.error('❌ Upload profile image error:', error);
        res.status(500).json({ error: 'Failed to upload profile image' });
    }
});

// Switch role with 24-hour cooldown
app.post('/api/user/switch-role', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const currentRole = req.session.user.role;

        // Check last role switch
        const [users] = await pool.query(
            'SELECT last_role_switch FROM users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const lastSwitch = users[0].last_role_switch;
        if (lastSwitch) {
            const timeSinceSwitch = Date.now() - new Date(lastSwitch).getTime();
            const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

            if (timeSinceSwitch < cooldownPeriod) {
                const remainingTime = cooldownPeriod - timeSinceSwitch;
                const hoursRemaining = Math.ceil(remainingTime / (60 * 60 * 1000));
                return res.status(400).json({
                    error: 'Role switch cooldown active',
                    remainingHours: hoursRemaining,
                    canSwitchAt: new Date(new Date(lastSwitch).getTime() + cooldownPeriod).toISOString()
                });
            }
        }

        // Switch role
        const newRole = currentRole === 'requester' ? 'volunteer' : 'requester';
        await pool.query(
            'UPDATE users SET role = ?, last_role_switch = NOW() WHERE user_id = ?',
            [newRole, userId]
        );

        // Update session
        req.session.user.role = newRole;
        req.session.user.last_role_switch = new Date().toISOString();

        console.log('✅ Role switched for user:', userId, 'to', newRole);
        res.json({
            message: 'Role switched successfully',
            newRole,
            user: req.session.user
        });
    } catch (error) {
        console.error('❌ Switch role error:', error);
        res.status(500).json({ error: 'Failed to switch role' });
    }
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
        console.error('❌ Get requests error:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

app.post('/api/requests', isAuthenticated, hasRole('requester'), async (req, res) => {
    try {
        const { title, description, category, urgency_level, location } = req.body;
        const requester_id = req.session.user.id;

        if (!title || !description) {
            return res.status(400).json({ error: 'Title and description required' });
        }

        const [result] = await pool.query(
            `INSERT INTO requests (requester_id, title, description, category, urgency_level, location, status)
             VALUES (?, ?, ?, ?, ?, ?, 'open')`,
            [requester_id, title, description, category, urgency_level, location]
        );

        console.log('✅ Request created:', result.insertId);
        res.status(201).json({
            message: 'Request created successfully',
            request_id: result.insertId
        });
    } catch (error) {
        console.error('❌ Create request error:', error);
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
        console.error('❌ Get requester requests error:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

// ==================== OFFER ROUTES ====================

app.post('/api/offers', isAuthenticated, hasRole('volunteer'), async (req, res) => {
    try {
        const { request_id } = req.body;
        const volunteer_id = req.session.user.id;

        if (!request_id) {
            return res.status(400).json({ error: 'Request ID required' });
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
            [requests[0].requester_id, `${req.session.user.name} offered to help`]
        );

        console.log('✅ Offer created:', result.insertId);
        res.status(201).json({
            message: 'Offer submitted successfully',
            offer_id: result.insertId
        });
    } catch (error) {
        console.error('❌ Create offer error:', error);
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
        console.error('❌ Get offers error:', error);
        res.status(500).json({ error: 'Failed to fetch offers' });
    }
});

// ==================== NOTIFICATION ROUTES ====================

// MODIFIED: Made notifications optional authentication
app.get('/api/notifications', async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.session || !req.session.user) {
            // Return empty notifications if not logged in
            console.log('ℹ️  Notifications requested without authentication');
            return res.json({ notifications: [] });
        }

        const [notifications] = await pool.query(
            'SELECT * FROM notifications WHERE recipient_id = ? ORDER BY sent_date DESC LIMIT 20',
            [req.session.user.id]
        );

        res.json({ notifications });
    } catch (error) {
        console.error('❌ Get notifications error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Get unread notification count
app.get('/api/notifications/unread-count', isAuthenticated, async (req, res) => {
    try {
        const [result] = await pool.query(
            'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = ? AND is_read = FALSE',
            [req.session.user.id]
        );

        res.json({ count: result[0].count });
    } catch (error) {
        console.error('❌ Get unread count error:', error);
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
});

// Mark notification as read
app.patch('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
        const notificationId = req.params.id;
        const userId = req.session.user.id;

        // Verify notification belongs to user
        const [notifications] = await pool.query(
            'SELECT recipient_id FROM notifications WHERE notification_id = ?',
            [notificationId]
        );

        if (notifications.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        if (notifications[0].recipient_id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE notification_id = ?',
            [notificationId]
        );

        console.log('✅ Notification marked as read:', notificationId);
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('❌ Mark notification as read error:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// ==================== CHAT ROUTES (Add these to server.js) ====================

// Get chat messages for a specific request
app.get('/api/chats/:requestId', isAuthenticated, async (req, res) => {
    try {
        const requestId = req.params.requestId;
        const userId = req.session.user.id;

        // Verify user is involved in this request
        const [requests] = await pool.query(
            `SELECT requester_id FROM requests WHERE request_id = ?`,
            [requestId]
        );

        if (requests.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const [offers] = await pool.query(
            `SELECT volunteer_id FROM help_offers WHERE request_id = ? AND status = 'accepted'`,
            [requestId]
        );

        const isRequester = requests[0].requester_id === userId;
        const isVolunteer = offers.some(o => o.volunteer_id === userId);

        if (!isRequester && !isVolunteer) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get messages
        const [messages] = await pool.query(
            `SELECT c.*, u.name as sender_name, u.profile_image
             FROM chat_messages c
             JOIN users u ON c.sender_id = u.user_id
             WHERE c.request_id = ?
             ORDER BY c.sent_at ASC`,
            [requestId]
        );

        res.json({ messages });
    } catch (error) {
        console.error('❌ Get chat error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Send a chat message
app.post('/api/chats/:requestId', isAuthenticated, async (req, res) => {
    try {
        const requestId = req.params.requestId;
        const senderId = req.session.user.id;
        const { message } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        // Verify user is involved in this request
        const [requests] = await pool.query(
            `SELECT requester_id FROM requests WHERE request_id = ?`,
            [requestId]
        );

        if (requests.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const [offers] = await pool.query(
            `SELECT volunteer_id FROM help_offers WHERE request_id = ? AND status = 'accepted'`,
            [requestId]
        );

        const isRequester = requests[0].requester_id === senderId;
        const isVolunteer = offers.some(o => o.volunteer_id === senderId);

        if (!isRequester && !isVolunteer) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Insert message
        const [result] = await pool.query(
            `INSERT INTO chat_messages (request_id, sender_id, message) VALUES (?, ?, ?)`,
            [requestId, senderId, message.trim()]
        );

        // Get the inserted message with sender info
        const [newMessage] = await pool.query(
            `SELECT c.*, u.name as sender_name, u.profile_image
             FROM chat_messages c
             JOIN users u ON c.sender_id = u.user_id
             WHERE c.message_id = ?`,
            [result.insertId]
        );

        // Create notification for recipient
        const recipientId = isRequester ? offers[0].volunteer_id : requests[0].requester_id;
        await pool.query(
            `INSERT INTO notifications (recipient_id, message) VALUES (?, ?)`,
            [recipientId, `New message from ${req.session.user.name}`]
        );

        console.log('✅ Chat message sent:', result.insertId);
        res.status(201).json({ message: newMessage[0] });
    } catch (error) {
        console.error('❌ Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// ==================== OFFER MANAGEMENT ROUTES ====================

// Accept an offer (requester only)
app.patch('/api/offers/:offerId/accept', isAuthenticated, hasRole('requester'), async (req, res) => {
    try {
        const offerId = req.params.offerId;
        const requesterId = req.session.user.id;

        // Get offer details
        const [offers] = await pool.query(
            `SELECT ho.*, r.requester_id, r.title 
             FROM help_offers ho
             JOIN requests r ON ho.request_id = r.request_id
             WHERE ho.offer_id = ?`,
            [offerId]
        );

        if (offers.length === 0) {
            return res.status(404).json({ error: 'Offer not found' });
        }

        const offer = offers[0];

        // Verify requester owns this request
        if (offer.requester_id !== requesterId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Accept the offer
        await pool.query(
            `UPDATE help_offers SET status = 'accepted' WHERE offer_id = ?`,
            [offerId]
        );

        // Update request status
        await pool.query(
            `UPDATE requests SET status = 'help_offered' WHERE request_id = ?`,
            [offer.request_id]
        );

        // Notify volunteer
        await pool.query(
            `INSERT INTO notifications (recipient_id, message) VALUES (?, ?)`,
            [offer.volunteer_id, `Your offer for "${offer.title}" has been accepted!`]
        );

        console.log('✅ Offer accepted:', offerId);
        res.json({ message: 'Offer accepted successfully' });
    } catch (error) {
        console.error('❌ Accept offer error:', error);
        res.status(500).json({ error: 'Failed to accept offer' });
    }
});

// Get offers for a specific request (requester only)
app.get('/api/requests/:requestId/offers', isAuthenticated, hasRole('requester'), async (req, res) => {
    try {
        const requestId = req.params.requestId;
        const requesterId = req.session.user.id;

        // Verify requester owns this request
        const [requests] = await pool.query(
            `SELECT requester_id FROM requests WHERE request_id = ?`,
            [requestId]
        );

        if (requests.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (requests[0].requester_id !== requesterId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get all offers
        const [offers] = await pool.query(
            `SELECT ho.*, u.name as volunteer_name, u.email as volunteer_email, 
                    u.profile_image, u.location as volunteer_location
             FROM help_offers ho
             JOIN users u ON ho.volunteer_id = u.user_id
             WHERE ho.request_id = ?
             ORDER BY ho.offer_date DESC`,
            [requestId]
        );

        res.json({ offers });
    } catch (error) {
        console.error('❌ Get offers error:', error);
        res.status(500).json({ error: 'Failed to fetch offers' });
    }
});

// ==================== VOLUNTEER LOCATION ====================

// Update volunteer location
app.put('/api/user/location', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Latitude and longitude required' });
        }

        await pool.query(
            `UPDATE users SET current_latitude = ?, current_longitude = ?, location_updated_at = NOW() 
             WHERE user_id = ?`,
            [latitude, longitude, userId]
        );

        console.log('✅ Location updated for user:', userId);
        res.json({ message: 'Location updated successfully' });
    } catch (error) {
        console.error('❌ Update location error:', error);
        res.status(500).json({ error: 'Failed to update location' });
    }
});

// Get volunteer location for accepted offer
app.get('/api/requests/:requestId/volunteer-location', isAuthenticated, hasRole('requester'), async (req, res) => {
    try {
        const requestId = req.params.requestId;
        const requesterId = req.session.user.id;


        const [requests] = await pool.query(
            `SELECT requester_id FROM requests WHERE request_id = ?`,
            [requestId]
        );

        if (requests.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (requests[0].requester_id !== requesterId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [volunteers] = await pool.query(
            `SELECT u.user_id, u.name, u.current_latitude, u.current_longitude, 
                    u.location_updated_at, u.profile_image
             FROM help_offers ho
             JOIN users u ON ho.volunteer_id = u.user_id
             WHERE ho.request_id = ? AND ho.status = 'accepted'`,
            [requestId]
        );

        if (volunteers.length === 0) {
            return res.status(404).json({ error: 'No accepted volunteer found for this request' });
        }

        res.json({ 
            name: volunteers[0].name,
            current_latitude: volunteers[0].current_latitude,
            current_longitude: volunteers[0].current_longitude,
            location_updated_at: volunteers[0].location_updated_at,
            profile_image: volunteers[0].profile_image
        });
    } catch (error) {
        console.error('❌ Get volunteer location error:', error);
        res.status(500).json({ error: 'Failed to fetch volunteer location' });
    }
});

// ==================== ERROR HANDLERS ====================

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found', path: req.path });
});

app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('✅ WhatYaNeed Backend Server RUNNING');
    console.log('='.repeat(60));
    console.log(`📡 URL:         http://localhost:${PORT}`);
    console.log(`🔍 Health:      http://localhost:${PORT}/api/health`);
    console.log(`🌐 CORS:        http://127.0.0.1:5500`);
    console.log(`🔐 Sessions:    Enabled with persistence`);
    console.log('='.repeat(60) + '\n');
});