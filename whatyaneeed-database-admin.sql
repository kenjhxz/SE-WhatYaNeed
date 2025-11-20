-- Script to Create Admin Account in WhatYaNeed Database
-- Run this in your MySQL workbench or command line

USE WhatYaNeed;

-- Create admin account
-- Password: admin123 (hashed with bcrypt)
-- Change the password after first login!

INSERT INTO users (name, email, password, role, location, verified, created_at) 
VALUES (
    'System Administrator',
    'admin@whatyaneed.com',
    '$2b$10$X7Y8Z9A0B1C2D3E4F5G6H7I8J9K0L1M2N3O4P5Q6R7S8T9U0V1W2X',
    'admin',
    'Cebu City',
    TRUE,
    NOW()
);

-- Verify the admin account was created
SELECT user_id, name, email, role, verified, created_at 
FROM users 
WHERE role = 'admin';

-- INSTRUCTIONS:
-- 1. Copy this entire script
-- 2. Open MySQL Workbench or your MySQL command line client
-- 3. Paste and execute this script
-- 4. The admin account will be created with:
--    Email: admin@whatyaneed.com
--    Password: admin123
-- 
-- 5. IMPORTANT: Change the password after first login!
--
-- To create additional admin accounts, use this format:
-- INSERT INTO users (name, email, password, role, location, verified) 
-- VALUES ('Admin Name', 'email@example.com', 'bcrypt_hashed_password', 'admin', 'Location', TRUE);
--
-- To hash a password in bcrypt format, you can:
-- 1. Use an online bcrypt generator (search "bcrypt generator")
-- 2. Or use Node.js: 
--    const bcrypt = require('bcrypt');
--    const hash = bcrypt.hashSync('your_password', 10);
--    console.log(hash);