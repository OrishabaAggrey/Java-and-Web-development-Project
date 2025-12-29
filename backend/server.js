const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser'); 
const app = express();
const port = 3000;

app.use(cors()); 
app.use(bodyParser.json()); 

let tasks = [];

// ADD: Create a new task (daily, weekly, monthly, yearly)
app.post('/tasks', (req, res) => {
    const { title, frequency } = req.body;
    const newTask = {
        id: Date.now(),
        title,
        frequency: frequency || 'daily', // Default frequency
        completed: false
    };
    tasks.push(newTask);
    res.status(201).json({ message: 'Task added!', task: newTask });
});

// SEARCH & READ: Get all tasks or filter by frequency
app.get('/tasks', (req, res) => {
    const { search, frequency } = req.query;
    let filteredTasks = tasks;

    if (search) {
        filteredTasks = filteredTasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
    }
    if (frequency) {
        filteredTasks = filteredTasks.filter(t => t.frequency === frequency);
    }
    res.json(filteredTasks);
});

// EDIT: Update a task's title, frequency, or completion status
app.put('/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { title, frequency, completed } = req.body;
    const taskIndex = tasks.findIndex(t => t.id === id);

    if (taskIndex > -1) {
        tasks[taskIndex] = { ...tasks[taskIndex], title, frequency, completed };
        res.json({ message: 'Task updated!', task: tasks[taskIndex] });
    } else {
        res.status(404).json({ message: 'Task not found' });
    }
});

// DELETE: Remove a task
app.delete('/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    tasks = tasks.filter(t => t.id !== id);
    res.json({ message: 'Task deleted successfully' });
});

app.listen(port, () => {
    console.log(`Server is successfully running on http://localhost:${port}`);
});
