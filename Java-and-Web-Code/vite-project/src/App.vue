<template>
  <div class="todo list application" :style="{ backgroundColor: '#c9ebcbff' }">
    <div class="container">
      <h1>Lidit</h1>
      
      <!-- Search & Add Bar -->
      <div class="header-controls">
        <input v-model="searchQuery" placeholder="Search tasks..." class="search-bar" />
        <div class="add-section">
          <input v-model="newTaskText" @keyup.enter="addTask" placeholder="Add a new task..." />
          <button @click="addTask" class="add-btn">Add Task</button>
        </div>
      </div>

      <!-- Timeframe Tabs -->
      <div class="tabs">
        <button v-for="tab in ['Daily', 'Weekly', 'Monthly', 'Yearly']" 
                :key="tab" 
                :class="{ active: currentTab === tab }"
                @click="currentTab = tab">
          {{ tab }}
        </button>
      </div>

      <!-- Task List -->
      <ul class="task-list">
        <li v-for="task in filteredTasks" :key="task.id" class="task-item">
          <div v-if="editingId === task.id" class="edit-mode">
            <input v-model="editBuffer" @keyup.enter="saveEdit(task.id)" />
            <button @click="saveEdit(task.id)">Save</button>
          </div>
          <div v-else class="view-mode">
            <span :class="{ completed: task.done }">{{ task.text }}</span>
            <div class="actions">
              <button @click="toggleDone(task)">Done</button>
              <button @click="startEdit(task)">Edit</button>
              <button @click="deleteTask(task.id)" class="delete-btn">Delete</button>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const currentTab = ref('Daily');
const searchQuery = ref('');
const newTaskText = ref('');
const editingId = ref(null);
const editBuffer = ref('');

const tasks = ref([]);

const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

const loadTasks = async () => {
  try {
    const res = await axios.get('/tasks');
    tasks.value = res.data.map(t => ({
      id: t.id,
      text: t.title,
      done: !!t.completed,
      category: capitalize(t.frequency)
    }));
  } catch (err) {
    console.error('Failed to load tasks', err);
  }
};

const addTask = async () => {
  if (!newTaskText.value.trim()) return;
  try {
    const payload = { title: newTaskText.value, frequency: currentTab.value.toLowerCase() };
    const res = await axios.post('/tasks', payload);
    const t = res.data.task;
    tasks.value.push({ id: t.id, text: t.title, done: !!t.completed, category: capitalize(t.frequency) });
    newTaskText.value = '';
  } catch (err) {
    console.error('Failed to add task', err);
  }
};

const deleteTask = async (id) => {
  try {
    await axios.delete(`/tasks/${id}`);
    tasks.value = tasks.value.filter(t => t.id !== id);
  } catch (err) {
    console.error('Failed to delete task', err);
  }
};

const startEdit = (task) => {
  editingId.value = task.id;
  editBuffer.value = task.text;
};

const saveEdit = async (id) => {
  const task = tasks.value.find(t => t.id === id);
  if (!task) return;
  try {
    const payload = { title: editBuffer.value, frequency: task.category.toLowerCase(), completed: task.done };
    const res = await axios.put(`/tasks/${id}`, payload);
    const updated = res.data.task;
    task.text = updated.title;
    editingId.value = null;
  } catch (err) {
    console.error('Failed to save edit', err);
  }
};

const toggleDone = async (task) => {
  try {
    const payload = { title: task.text, frequency: task.category.toLowerCase(), completed: !task.done };
    const res = await axios.put(`/tasks/${task.id}`, payload);
    task.done = res.data.task.completed;
  } catch (err) {
    console.error('Failed to toggle done', err);
  }
};

const filteredTasks = computed(() => {
  return tasks.value.filter(task => 
    task.category === currentTab.value &&
    task.text.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

onMounted(loadTasks);
</script>

<style scoped>
.todo list application { min-height: 100vh; padding: 40px; font-family: 'Segoe UI', sans-serif; }
.container { max-width: 600px; margin: 0 auto; background: white; padding: 2rem; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
h1 { color: #2e7d32; text-align: center; }

.header-controls { margin-bottom: 20px; }
.search-bar { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #bce3bdff; border-radius: 5px; }
.add-section { display: flex; gap: 10px; }
.add-section input { flex: 1; padding: 10px; border: 1px solid #aedaafff; border-radius: 5px; }

.tabs { display: flex; justify-content: space-around; margin-bottom: 20px; border-bottom: 2px solid #dcefdeff; }
.tabs button { background: none; border: none; padding: 10px; cursor: pointer; color: #697466ff; }
.tabs button.active { color: #556857ff; border-bottom: 2px solid #467e4dff; font-weight: bold; }

.task-list { list-style: none; padding: 0; }
.task-item { padding: 15px; border-bottom: 1px solid #f1f8e9; display: flex; justify-content: space-between; }
.completed { text-decoration: line-through; color: #a5d6a7; }
.add-btn { background: #569f56ff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
.delete-btn { color: #d32f2f; }
</style>
