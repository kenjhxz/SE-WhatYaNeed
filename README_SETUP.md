# WhatYaNeed - Setup Instructions

A digital bulletin board designed to connect people with the help they need and the help they can offer.

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm (comes with Node.js)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SE-WhatYaNeed
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   
   a. Create a MySQL database:
   ```bash
   mysql -u root -p
   ```
   
   b. Run the database setup script:
   ```sql
   source WhatYaNeed_Database.sql
   ```

4. **Configure environment variables**
   
   Copy the example environment file and update with your database credentials:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file:
   ```
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=WhatYaNeed
   SESSION_SECRET=your-secret-key-here
   ```

5. **Start the application**
   
   For development:
   ```bash
   npm run dev
   ```
   
   For production:
   ```bash
   npm start
   ```

6. **Access the application**
   
   Open your browser and navigate to: `http://localhost:3000`

## Features

### Authentication System
- User registration with role selection (Requester, Volunteer, Admin)
- Secure login with password hashing (bcrypt)
- Session management
- Role-based access control

### User Roles

**Requester:**
- Create help requests
- View and manage own requests
- Access personal dashboard

**Volunteer:**
- Browse available requests
- Offer help to requesters
- View request details

**Admin:**
- Access admin dashboard
- View all users and requests
- Approve/deny requests
- Monitor platform activity

### Request Management
- Create requests with detailed information
- Categorize by type (Home Repair, Groceries, Transportation, etc.)
- Set urgency levels (Low, Moderate, Urgent)
- Filter and search requests
- Track request status

### Form Validation
- Client-side validation for immediate feedback
- Server-side validation for security
- Email format validation
- Password strength requirements
- Required field checking

## API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user session

### Requests
- `GET /api/requests` - Get all requests (with optional filters)
- `GET /api/requests/user` - Get current user's requests
- `POST /api/requests` - Create new request (authenticated)
- `PUT /api/requests/:id/status` - Update request status (authenticated)
- `DELETE /api/requests/:id` - Delete request (authenticated)

### Admin (Admin only)
- `GET /api/admin/users` - Get all users
- `GET /api/admin/stats` - Get platform statistics
- `PUT /api/admin/requests/:id/approve` - Approve/deny request

### Notifications
- `GET /api/notifications` - Get user notifications (authenticated)

## Database Schema

The application uses the following main tables:
- `users` - User accounts and authentication
- `requests` - Help requests
- `help_offers` - Volunteer offers
- `notifications` - User notifications
- `external_auth` - Third-party authentication

See `WhatYaNeed_Database.sql` for complete schema.

## Development

### Project Structure
```
SE-WhatYaNeed/
├── server.js              # Main server file
├── db.js                  # Database connection
├── WYNWireframes.html     # Frontend HTML
├── WhatYaNeed_Database.sql # Database schema
├── package.json           # Node.js dependencies
├── .env                   # Environment variables (not in git)
└── README_SETUP.md        # This file
```

### Running Tests
```bash
npm test
```

## Security Features

- Password hashing with bcrypt
- Session-based authentication
- SQL injection prevention with parameterized queries
- XSS protection with HTML escaping
- Role-based access control
- CSRF protection via same-origin policy

## Troubleshooting

### Database Connection Issues
- Verify MySQL is running
- Check `.env` credentials match your MySQL setup
- Ensure database `WhatYaNeed` exists

### Port Already in Use
- Change `PORT` in `.env` to a different port
- Or stop the application using that port

### Module Not Found
- Run `npm install` to ensure all dependencies are installed

## Contributors
- Mascardo (Leader) - Backend, Database, Architecture
- Ducut - Frontend, UI Design, Wireframes

## License
ISC
