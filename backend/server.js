const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json()); // built-in parser

// MySQL connection
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Jesusislord3', // Update if different
  database: 'tasks_db'
};

let db;

// Initialize DB and create table (and add missing columns/indexes if needed)
async function initDB() {
  try {
    // Connect without DB to create it if missing
    const tempDb = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });
    await tempDb.execute('CREATE DATABASE IF NOT EXISTS tasks_db');
    await tempDb.end();

    // Connect to the database
    db = await mysql.createConnection(dbConfig);

    // Create table if missing (this won't alter existing columns)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        frequency ENUM('daily', 'weekly', 'monthly', 'yearly') DEFAULT 'daily',
        completed BOOLEAN DEFAULT FALSE,
        INDEX idx_frequency (frequency)
      )
    `);

    // Ensure due_date column exists; if not, add it
    const [cols] = await db.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = 'due_date'`,
      [dbConfig.database, 'tasks']
    );

    if (cols.length === 0) {
      console.log('Adding missing due_date column to tasks table');
      await db.execute('ALTER TABLE tasks ADD COLUMN due_date DATE DEFAULT NULL');
    }

    // Ensure index on due_date exists
    const [idx] = await db.execute(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = 'idx_due_date'`,
      [dbConfig.database, 'tasks']
    );
    if (idx.length === 0) {
      console.log('Creating idx_due_date index');
      await db.execute('CREATE INDEX idx_due_date ON tasks(due_date)');
    }

    console.log('Database and table initialized');
  } catch (err) {
    console.error('DB initialization error:', err);
    throw err;
  }
}

// Defensive middleware: ensure db ready
app.use((req, res, next) => {
  if (!db) return res.status(503).json({ message: 'Database not initialized' });
  next();
});

// Helper: normalize date to YYYY-MM-DD or null
function normalizeDateString(d) {
  if (!d) return null;
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const parsed = new Date(d);
  if (isNaN(parsed)) return null;
  return parsed.toISOString().split('T')[0];
}

// POST /tasks - create task
app.post('/tasks', async (req, res, next) => {
  try {
    console.log('POST /tasks payload:', req.body);

    const { title, frequency, due_date } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'title is required and must be a non-empty string' });
    }

    const allowedFreq = ['daily', 'weekly', 'monthly', 'yearly'];
    const freq = (frequency || 'daily').toString().toLowerCase();
    if (!allowedFreq.includes(freq)) {
      return res.status(400).json({ message: `frequency must be one of: ${allowedFreq.join(', ')}` });
    }

    const dueDate = normalizeDateString(due_date);

    const [result] = await db.execute(
      'INSERT INTO tasks (title, frequency, completed, due_date) VALUES (?, ?, ?, ?)',
      [title.trim(), freq, 0, dueDate]
    );

    const newTask = { id: result.insertId, title: title.trim(), frequency: freq, completed: false, due_date: dueDate };
    res.status(201).json({ message: 'Task added!', task: newTask });
  } catch (err) {
    console.error('Error in POST /tasks:', err.stack || err);
    next(err);
  }
});

// GET /tasks - list or search tasks
app.get('/tasks', async (req, res, next) => {
  try {
    const { search, frequency } = req.query;
    let query = 'SELECT * FROM tasks';
    const conditions = [];
    const params = [];
    if (search) {
      conditions.push('title LIKE ?');
      params.push(`%${search}%`);
    }
    if (frequency) {
      conditions.push('frequency = ?');
      params.push(frequency);
    }
    if (conditions.length) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error in GET /tasks:', err.stack || err);
    next(err);
  }
});

// PUT /tasks/:id - update task
app.put('/tasks/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { title, frequency, completed, due_date } = req.body;

    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid task id' });

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'title is required and must be a non-empty string' });
    }

    const allowedFreq = ['daily', 'weekly', 'monthly', 'yearly'];
    const freq = (frequency || 'daily').toString().toLowerCase();
    if (!allowedFreq.includes(freq)) {
      return res.status(400).json({ message: `frequency must be one of: ${allowedFreq.join(', ')}` });
    }

    const dueDate = normalizeDateString(due_date);

    const [result] = await db.execute(
      'UPDATE tasks SET title = ?, frequency = ?, completed = ?, due_date = ? WHERE id = ?',
      [title.trim(), freq, completed ? 1 : 0, dueDate, id]
    );
    if (result.affectedRows > 0) {
      const [rows] = await db.execute('SELECT * FROM tasks WHERE id = ?', [id]);
      res.json({ message: 'Task updated!', task: rows[0] });
    } else {
      res.status(404).json({ message: 'Task not found' });
    }
  } catch (err) {
    console.error('Error in PUT /tasks/:id:', err.stack || err);
    next(err);
  }
});

// DELETE /tasks/:id - delete task
app.delete('/tasks/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid task id' });

    const [result] = await db.execute('DELETE FROM tasks WHERE id = ?', [id]);
    if (result.affectedRows > 0) {
      res.json({ message: 'Task deleted successfully' });
    } else {
      res.status(404).json({ message: 'Task not found' });
    }
  } catch (err) {
    console.error('Error in DELETE /tasks/:id:', err.stack || err);
    next(err);
  }
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack || err);
  res.status(500).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV !== 'production' ? (err.stack || '') : undefined
  });
});

// Start server after DB initialization
initDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize DB, exiting.', err);
    process.exit(1);
  });