const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const port = 3000;

// JWT secret key
const jwtSecret = 'your_jwt_secret_key';

// MySQL connection setup
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'test'
});

// Connect to MySQL
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Middleware to parse JSON requests
app.use(express.json());

// Login API - Authenticate user and generate JWT token
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Check if user exists in the database
  connection.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err) {
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(401).send('Invalid credentials');
    }

    const user = results[0];

    // Compare password using bcrypt
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err || !isMatch) {
        return res.status(401).send('Invalid credentials');
      }

      // Generate a JWT token if credentials are valid
      const token = jwt.sign({ userId: user.id, username: user.username }, jwtSecret, {
        expiresIn: '1h' // Token expires in 1 hour
      });

      res.json({ token });
    });
  });
});

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).send('Access denied. No token provided.');
  }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).send('Invalid token');
    }

    req.user = user; // Attach the user info to the request
    next();
  });
}

// Protected API - Fetch all trains (only accessible with a valid JWT token)
app.get('/trains', authenticateToken, (req, res) => {
  connection.query('SELECT * FROM trains', (err, results) => {
    if (err) {
      return res.status(500).send('Error fetching data');
    }

    res.json(results);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`API is running on http://localhost:${port}`);
});
