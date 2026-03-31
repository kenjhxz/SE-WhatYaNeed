-- Updated WhatYaNeed Database Schema with Password Support

-- CREATE DATABASE WhatYaNeed;
USE WhatYaNeed;

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS external_auth;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS help_offers;
DROP TABLE IF EXISTS requests;
DROP TABLE IF EXISTS users;

-- Users table with password field and location tracking
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    current_latitude DECIMAL(10, 8) DEFAULT NULL,
    current_longitude DECIMAL(11, 8) DEFAULT NULL,
    location_updated_at DATETIME DEFAULT NULL,
    role ENUM('requester', 'volunteer', 'admin') NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    profile_image LONGTEXT DEFAULT NULL,
    last_role_switch DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Requests table
CREATE TABLE requests (
    request_id INT PRIMARY KEY AUTO_INCREMENT,
    requester_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    urgency_level ENUM('low', 'medium', 'high'),
    location VARCHAR(255),
    status ENUM('open', 'help_offered', 'closed') DEFAULT 'open',
    urgent_timer_start DATETIME DEFAULT NULL,
    posted_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Help offers table
CREATE TABLE help_offers (
    offer_id INT PRIMARY KEY AUTO_INCREMENT,
    volunteer_id INT NOT NULL,
    request_id INT NOT NULL,
    offer_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
    FOREIGN KEY (volunteer_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES requests(request_id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE notifications (
    notification_id INT PRIMARY KEY AUTO_INCREMENT,
    recipient_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Chat messages table for chatbox functionality
CREATE TABLE chat_messages (
    message_id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT NOT NULL,
    sender_id INT NOT NULL,
    message TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- External auth table (for future OAuth integration)
CREATE TABLE external_auth (
    auth_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    provider VARCHAR(50),
    token VARCHAR(255),
    auth_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
); 

CREATE TABLE chats (
    chat_id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT NOT NULL,
    volunteer_id INT NOT NULL,
    FOREIGN KEY (request_id) REFERENCES requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY (volunteer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE chat_messages (
    message_id INT PRIMARY KEY AUTO_INCREMENT,
    chat_id INT NOT NULL,
    sender_id INT NOT NULL,
    message TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(chat_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE volunteer_locations (
    location_id INT PRIMARY KEY AUTO_INCREMENT,
    volunteer_id INT NOT NULL,
    current_latitude DECIMAL(9, 6) NOT NULL,
    current_longitude DECIMAL(9, 6) NOT NULL,
    location_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (volunteer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Insert sample data (passwords are hashed with bcrypt for 'password123')
-- Note: You should register users through the API for proper password hashing

-- Sample requester (password: password123)
INSERT INTO users (name, email, password, location, role, verified) VALUES 
('Maria Santos', 'maria@test.com', '$2b$10$rZ7qGqH0YZf4K8zKl5kC1OqJxYdVzD8F6nH9xK5vL7mN8oP9qR0sS', 'Cebu City', 'requester', TRUE);

-- Sample volunteer (password: password123)
INSERT INTO users (name, email, password, location, role, verified) VALUES 
('Juan Dela Cruz', 'juan@test.com', '$2b$10$rZ7qGqH0YZf4K8zKl5kC1OqJxYdVzD8F6nH9xK5vL7mN8oP9qR0sS', 'Cebu City', 'volunteer', TRUE);

-- Sample admin (password: admin123)
INSERT INTO users (name, email, password, location, role, verified) VALUES 
('Admin User', 'admin@test.com', '$2b$10$X7Y8Z9A0B1C2D3E4F5G6H7I8J9K0L1M2N3O4P5Q6R7S8T9U0V1W2X', 'Cebu City', 'admin', TRUE);

-- Sample request
INSERT INTO requests (requester_id, title, description, category, urgency_level, location, status) VALUES 
(1, 'Need medicine pickup', 'I need someone to pick up my prescription from the pharmacy.', 'Errand', 'high', 'Cebu City', 'open');

-- Sample help offer
INSERT INTO help_offers (volunteer_id, request_id, status) VALUES 
(2, 1, 'pending');

-- Sample notification
INSERT INTO notifications (recipient_id, message) VALUES 
(1, 'Juan Dela Cruz has offered to help with your request: "Need medicine pickup".');

INSERT INTO volunteer_locations (volunteer_id, current_latitude, current_longitude, location_updated_at)
VALUES (5, 10.315699, 123.885437, '2025-12-10 15:30:00');

-- Create indexes for better performance
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_requester ON requests(requester_id);
CREATE INDEX idx_offers_volunteer ON help_offers(volunteer_id);
CREATE INDEX idx_offers_request ON help_offers(request_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_chat_request ON chat_messages(request_id);
CREATE INDEX idx_chat_sender ON chat_messages(sender_id);


-- Add location columns to users table
ALTER TABLE users 
ADD COLUMN current_latitude DECIMAL(10, 8) DEFAULT NULL,
ADD COLUMN current_longitude DECIMAL(11, 8) DEFAULT NULL,
ADD COLUMN location_updated_at DATETIME DEFAULT NULL;

-- Verify the columns were added
DESCRIBE users;

-- Add test location data for volunteer (change user_id to match your volunteer)
UPDATE users 
SET current_latitude = 10.315699, 
    current_longitude = 123.885437,
    location_updated_at = NOW()
WHERE user_id = 9;  -- Change this to your volunteer's user_id

-- Verify the data
SELECT user_id, name, email, role, current_latitude, current_longitude, location_updated_at 
FROM users 
WHERE role = 'volunteer';





show tables;

SELECT * FROM requests WHERE request_id = 3;


select * from users;


