# IRCTC-like Railway Management API 
## Overview

This project implements a simplified version of an IRCTC-like railway management system API. It provides endpoints for user registration and authentication, train management, seat availability checking, and ticket booking.

## Features

- User registration and login
- JWT-based authentication for protected routes
- Admin-only routes protected by API key
- Train management (adding new trains)
- Checking seat availability
- Booking seats with race condition handling
- Retrieving booking details

## Prerequisites

- Node.js (v14 or higher recommended) - Download from [nodejs.org](https://nodejs.org/)
- MySQL Server - Download from [MySQL Community Downloads](https://dev.mysql.com/downloads/installer/)
- Git (optional, for cloning the repository) - Download from [git-scm.com](https://git-scm.com/download/win)

## Setup

1. Clone or download the repository:
   - If using Git:
     ```
     git clone [https://github.com/your-username/irctc-api.git](https://github.com/PrathameshK1/IRCTIC-Booking-WorkIndia.git)
     cd irctc-api
     ```
   - If downloading manually, extract the ZIP file and open a command prompt in the project folder.

2. Install dependencies:
   ```
   npm install
   ```

3. Set up your MySQL database:
   - Open MySQL Command Line Client (you can find this in the Start menu after installing MySQL)
   - Log in with your root password
   - Run the following commands:

   ```sql
   CREATE DATABASE irctc_db;
   USE irctc_db;

   CREATE TABLE users (
     id INT AUTO_INCREMENT PRIMARY KEY,
     username VARCHAR(255) UNIQUE NOT NULL,
     password VARCHAR(255) NOT NULL
   );

   CREATE TABLE trains (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(255) NOT NULL,
     source VARCHAR(255) NOT NULL,
     destination VARCHAR(255) NOT NULL,
     total_seats INT NOT NULL,
     available_seats INT NOT NULL
   );

   CREATE TABLE bookings (
     id INT AUTO_INCREMENT PRIMARY KEY,
     user_id INT NOT NULL,
     train_id INT NOT NULL,
     FOREIGN KEY (user_id) REFERENCES users(id),
     FOREIGN KEY (train_id) REFERENCES trains(id)
   );
   ```

4. Create a file named `.env` in the project root folder:
   - Open Notepad
   - Copy and paste the following, replacing the values with your actual database credentials and desired secrets:
     ```
     DB_HOST=localhost
     DB_USER=your_database_user
     DB_PASSWORD=your_database_password
     DB_NAME=irctc_db
     JWT_SECRET=your_jwt_secret
     ADMIN_API_KEY=your_admin_api_key
     ```
   - Save the file as `.env` in the project folder (make sure it's not saved as `.env.txt`)

5. Start the server:
   ```
   node index.js
   ```

The server should now be running on `http://localhost:3000`.

## API Endpoints

### Public Endpoints

1. **Register a User**
   - URL: `/register`
   - Method: POST
   - Body: `{ "username": "string", "password": "string" }`

2. **Login User**
   - URL: `/login`
   - Method: POST
   - Body: `{ "username": "string", "password": "string" }`
   - Returns: JWT token

3. **Get Seat Availability**
   - URL: `/availability?source=string&destination=string`
   - Method: GET

### Protected Endpoints (Require JWT Token)

4. **Book a Seat**
   - URL: `/bookings`
   - Method: POST
   - Headers: `Authorization: Bearer <jwt_token>`
   - Body: `{ "trainId": number }`

5. **Get Specific Booking Details**
   - URL: `/bookings/:id`
   - Method: GET
   - Headers: `Authorization: Bearer <jwt_token>`

### Admin Endpoints (Require API Key)

6. **Add a New Train**
   - URL: `/trains`
   - Method: POST
   - Headers: `x-api-key: <admin_api_key>`
   - Body: `{ "name": "string", "source": "string", "destination": "string", "totalSeats": number }`

## Usage Examples

You can test these endpoints using tools like Postman or cURL. If using cURL, you can run these commands in Command Prompt:

### Register a User

```
curl -X POST http://localhost:3000/register -H "Content-Type: application/json" -d "{\"username\": \"johndoe\", \"password\": \"securepass123\"}"
```

### Login

```
curl -X POST http://localhost:3000/login -H "Content-Type: application/json" -d "{\"username\": \"johndoe\", \"password\": \"securepass123\"}"
```

This will return a JWT token. Use this token in the `Authorization` header for protected endpoints.

### Add a New Train (Admin)

```
curl -X POST http://localhost:3000/trains -H "Content-Type: application/json" -H "x-api-key: your_admin_api_key" -d "{\"name\": \"Express 123\", \"source\": \"Delhi\", \"destination\": \"Mumbai\", \"totalSeats\": 100}"
```

### Check Seat Availability

```
curl "http://localhost:3000/availability?source=Delhi&destination=Mumbai"
```

### Book a Seat

```
curl -X POST http://localhost:3000/bookings -H "Content-Type: application/json" -H "Authorization: Bearer your_jwt_token" -d "{\"trainId\": 1}"
```

### Get Booking Details

```
curl http://localhost:3000/bookings/1 -H "Authorization: Bearer your_jwt_token"
```

## Security Considerations

- JWT tokens are used for user authentication.
- Admin routes are protected by an API key.
- Passwords are hashed before storing in the database.
- Database queries use parameterized statements to prevent SQL injection.

## Error Handling

The API returns appropriate HTTP status codes and error messages in JSON format for various error scenarios.


