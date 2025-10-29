create database WhatYaNeed;
use WhatYaNeed;

SELECT * FROM users;
SELECT * FROM requests;
SELECT * FROM help_offers;
SELECT * FROM notifications;
SELECT * FROM external_auth;

CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    location VARCHAR(255),
    role ENUM('requester', 'volunteer') NOT NULL,
    verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE requests (
    request_id INT PRIMARY KEY AUTO_INCREMENT,
    requester_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    urgency_level ENUM('low', 'medium', 'high'),
    location VARCHAR(255),
    status ENUM('open', 'help_offered', 'closed') DEFAULT 'open',
    posted_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users(user_id)
);

CREATE TABLE help_offers (
    offer_id INT PRIMARY KEY AUTO_INCREMENT,
    volunteer_id INT NOT NULL,
    request_id INT NOT NULL,
    offer_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
    FOREIGN KEY (volunteer_id) REFERENCES users(user_id),
    FOREIGN KEY (request_id) REFERENCES requests(request_id)
);

CREATE TABLE notifications (
    notification_id INT PRIMARY KEY AUTO_INCREMENT,
    recipient_id INT NOT NULL,
    message TEXT NOT NULL,
    sent_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_id) REFERENCES users(user_id)
);

CREATE TABLE external_auth (
    auth_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    provider VARCHAR(50),
    token VARCHAR(255),
    auth_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

INSERT INTO users (name, email, location, role, verified) VALUES 
('Maria Santos', 'maria@helpme.ph', 'Cebu City', 'requester', TRUE),
('Juan Dela Cruz', 'juan@volunteer.ph', 'Cebu City', 'volunteer', TRUE);

INSERT INTO requests (requester_id, title, description, category, urgency_level, location, status) VALUES 
(1, 'Need medicine pickup', 'I need someone to pick up my prescription from the pharmacy.', 'Errand', 'high', 'Cebu City', 'open');

INSERT INTO help_offers (volunteer_id, request_id, status) VALUES 
(2, 1, 'pending');

INSERT INTO notifications (recipient_id, message) VALUES 
(1, 'Juan Dela Cruz has offered to help with your request: "Need medicine pickup".');

INSERT INTO external_auth (user_id, provider, token) VALUES 
(1, 'Google', 'token123abcXYZ');