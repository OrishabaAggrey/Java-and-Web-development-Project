const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// MySQL connection
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '', // Update with your MySQL password
    database: 'tasks_db'
};

let db;

// Initialize DB and create table
async function initDB() {
    try {
        // First connect without DB to create it
        const tempDb = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });
        await tempDb.execute('CREATE DATABASE IF NOT EXISTS tasks_db');
        await tempDb.end();

        // Now connect to the DB
        db = await mysql.createConnection(dbConfig);
        await db.execute(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                frequency ENUM('daily', 'weekly', 'monthly', 'yearly') DEFAULT 'daily',
                completed BOOLEAN DEFAULT FALSE
            )
        `);
        console.log('Database and table initialized');
    } catch (err) {
        console.error('DB initialization error:', err);
    }
}

initDB();

// ADD: Create a new task (daily, weekly, monthly, yearly)
app.post('/tasks', async (req, res) => {
    const { title, frequency } = req.body;
    try {
        const [result] = await db.execute(
            'INSERT INTO tasks (title, frequency, completed) VALUES (?, ?, ?)',
            [title, frequency || 'daily', false]
        );
        const newTask = { id: result.insertId, title, frequency: frequency || 'daily', completed: false };
        res.status(201).json({ message: 'Task added!', task: newTask });
    } catch (err) {
        res.status(500).json({ message: 'Error adding task', error: err.message });
    }
});

// SEARCH & READ: Get all tasks or filter by frequency
app.get('/tasks', async (req, res) => {
    const { search, frequency } = req.query;
    try {
        let query = 'SELECT * FROM tasks';
        let params = [];
        if (search || frequency) {
            query += ' WHERE';
            if (search) {
                query += ' title LIKE ?';
                params.push(`%${search}%`);
            }
            if (frequency) {
                if (search) query += ' AND';
                query += ' frequency = ?';
                params.push(frequency);
            }
        }
        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching tasks', error: err.message });
    }
});

// EDIT: Update a task's title, frequency, or completion status
app.put('/tasks/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const { title, frequency, completed } = req.body;
    try {
        const [result] = await db.execute(
            'UPDATE tasks SET title = ?, frequency = ?, completed = ? WHERE id = ?',
            [title, frequency, completed, id]
        );
        if (result.affectedRows > 0) {
            const [rows] = await db.execute('SELECT * FROM tasks WHERE id = ?', [id]);
            res.json({ message: 'Task updated!', task: rows[0] });
        } else {
            res.status(404).json({ message: 'Task not found' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error updating task', error: err.message });
    }
});

// DELETE: Remove a task
app.delete('/tasks/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const [result] = await db.execute('DELETE FROM tasks WHERE id = ?', [id]);
        if (result.affectedRows > 0) {
            res.json({ message: 'Task deleted successfully' });
        } else {
            res.status(404).json({ message: 'Task not found' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error deleting task', error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server is successfully running on http://localhost:${port}`);
});
