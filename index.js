const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const port = 3000;

// Generate JWT secret and Admin API key if not set in environment variables
const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const adminApiKey = process.env.ADMIN_API_KEY || crypto.randomBytes(32).toString('hex');

console.log('JWT Secret:', jwtSecret);
console.log('Admin API Key:', adminApiKey);

// MySQL connection setup
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'irctc_db'
};

// Middleware
app.use(express.json());

// Helper function to get database connection
async function getConnection() {
  return await mysql.createConnection(dbConfig);
}

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Middleware to verify Admin API key
function authenticateAdmin(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== adminApiKey) {
    return res.status(403).json({ error: 'Access denied. Invalid API key.' });
  }
  next();
}

// 1. Register a User
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const conn = await getConnection();
    await conn.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
    conn.end();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Error registering user' });
  }
});

// 2. Login User
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const conn = await getConnection();
    const [users] = await conn.execute('SELECT * FROM users WHERE username = ?', [username]);
    conn.end();

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, jwtSecret, { expiresIn: '1h' });
    res.json({ token, message: 'Login successful' });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Error during login' });
  }
});

// 3. Add a New Train (Admin only)
app.post('/trains', authenticateAdmin, async (req, res) => {
  const { name, source, destination, totalSeats } = req.body;
  if (!name || !source || !destination || !totalSeats) {
    return res.status(400).json({ error: 'All train details are required' });
  }

  try {
    const conn = await getConnection();
    await conn.execute(
      'INSERT INTO trains (name, source, destination, total_seats, available_seats) VALUES (?, ?, ?, ?, ?)', 
      [name, source, destination, totalSeats, totalSeats]
    );
    conn.end();
    res.status(201).json({ message: 'Train added successfully' });
  } catch (error) {
    console.error('Error adding train:', error);
    res.status(500).json({ error: 'Error adding train' });
  }
});

// 4. Get Seat Availability
app.get('/availability', async (req, res) => {
  const { source, destination } = req.query;
  if (!source || !destination) {
    return res.status(400).json({ error: 'Source and destination are required' });
  }

  try {
    const conn = await getConnection();
    const [trains] = await conn.execute(
      'SELECT id, name, total_seats, available_seats FROM trains WHERE source = ? AND destination = ?', 
      [source, destination]
    );
    conn.end();
    res.json(trains);
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ error: 'Error fetching availability' });
  }
});

// 5. Book a Seat
app.post('/bookings', authenticateToken, async (req, res) => {
  const { trainId } = req.body;
  const userId = req.user.userId;

  if (!trainId) {
    return res.status(400).json({ error: 'Train ID is required' });
  }

  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    // Check seat availability and update in an atomic operation
    const [result] = await conn.execute(
      'UPDATE trains SET available_seats = available_seats - 1 WHERE id = ? AND available_seats > 0', 
      [trainId]
    );
    
    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'No seats available' });
    }

    // Create booking record
    const [bookingResult] = await conn.execute(
      'INSERT INTO bookings (user_id, train_id) VALUES (?, ?)', 
      [userId, trainId]
    );

    await conn.commit();
    res.status(201).json({ message: 'Booking successful', bookingId: bookingResult.insertId });
  } catch (error) {
    await conn.rollback();
    console.error('Error booking seat:', error);
    res.status(500).json({ error: 'Error booking seat' });
  } finally {
    conn.end();
  }
});

// 6. Get Specific Booking Details
app.get('/bookings/:id', authenticateToken, async (req, res) => {
  const bookingId = req.params.id;
  const userId = req.user.userId;

  try {
    const conn = await getConnection();
    const [bookings] = await conn.execute(
      `SELECT b.id, b.user_id, b.train_id, t.name as train_name, t.source, t.destination 
       FROM bookings b 
       JOIN trains t ON b.train_id = t.id 
       WHERE b.id = ? AND b.user_id = ?`, 
      [bookingId, userId]
    );
    conn.end();

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(bookings[0]);
  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({ error: 'Error fetching booking details' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`IRCTC API is running on http://localhost:${port}`);
  console.log('Make sure to set up your database and environment variables!');
});
