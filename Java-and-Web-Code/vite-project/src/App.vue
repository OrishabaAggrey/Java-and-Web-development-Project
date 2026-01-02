<template>
  <div class="todo list application">
    <div class="container">
      <h1>Lidit</h1>
      
      <!-- Search & Add Bar -->
      <div class="header-controls">
        <div class="search-row">
          <input
            v-model="searchQuery"
            placeholder="Search tasks..."
            class="search-bar"
            aria-label="Search tasks"
          />
          <button type="button" class="clear-search" @click="clearSearch" v-if="searchQuery">✕</button>
        </div>

        <div class="add-section">
          <input
            v-model="newTaskText"
            @keyup.enter="addTask"
            placeholder="Add a new task..."
            aria-label="New task"
          />
          <button type="button" @click="addTask" class="add-btn">Add Task</button>
        </div>
      </div>

      <!-- Day Filter (hidden for Daily tab) -->
      <div v-show="currentTab !== 'Daily'" class="day-filter">
        <label>Filter by day:</label>
        <VueDatePicker v-model="selectedDate" :disabled="currentTab === 'Daily'" placeholder="Select day" />
        <button type="button" @click="clearSelectedDate" class="clear-btn">All days</button>
      </div>

      <!-- Timeframe Tabs -->
      <div class="tabs" role="tablist" aria-label="Timeframe tabs">
        <button
          v-for="tab in ['Daily', 'Weekly', 'Monthly', 'Yearly']" 
          :key="tab" 
          :class="{ active: currentTab === tab && showTasks }"
          type="button"
          role="tab"
          :aria-selected="currentTab === tab"
          @click="toggleTab(tab)"
        >
          {{ tab }} ({{ tabCounts[tab] }})
        </button>
      </div>

      <!-- Task List -->
      <ul v-if="showTasks" class="task-list" role="list">
        <li v-for="task in filteredTasks" :key="task.id" class="task-item" role="listitem">
          <div class="task-content" @click="task.showActions = !task.showActions">
            <span :class="{ completed: task.done }">{{ task.text }}</span>
            <span v-if="task.done" class="checkmark"> ✓</span>
            <span v-else-if="task.due_date && isOverdue(task.due_date) && !task.done" class="overdue"> Overdue</span>
            <span v-else class="pending"> Pending</span>
          </div>

          <div v-if="task.showActions" class="actions" @click.stop>
            <button type="button" @click="toggleDone(task)">{{ task.done ? 'Undo' : 'Done' }}</button>
            <button type="button" @click="startEdit(task)">Edit</button>
            <button type="button" @click="deleteTask(task.id)" class="delete-btn">Delete</button>
          </div>

          <div v-if="editingId === task.id" class="edit-mode">
            <input v-model="editBuffer" @keyup.enter="saveEdit(task.id)" @keyup.esc="cancelEdit" />
            <button type="button" @click="saveEdit(task.id)">Save</button>
            <button type="button" @click="cancelEdit">Cancel</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import axios from 'axios';
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';

axios.defaults.baseURL = 'http://localhost:3000';

const currentTab = ref('Daily');
const searchQuery = ref('');
const newTaskText = ref('');
const editingId = ref(null);
const editBuffer = ref('');
const selectedDate = ref(null);
const showTasks = ref(true);
const tasks = ref([]);

const addLoading = ref(false);
const errorMsg = ref('');

const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

const parseDate = (d) => {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d) ? null : d;
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const dt = new Date(d + 'T00:00:00');
    return isNaN(dt) ? null : dt;
  }
  const dt = new Date(d);
  return isNaN(dt) ? null : dt;
};

const isOverdue = (dueDate) => {
  const dt = parseDate(dueDate);
  if (!dt) return false;
  const today = new Date();
  const d1 = new Date(dt.getTime()); d1.setHours(0,0,0,0);
  const d2 = new Date(today.getTime()); d2.setHours(0,0,0,0);
  return d1.getTime() < d2.getTime();
};

const selectedDay = computed(() => {
  const d = parseDate(selectedDate.value);
  return d ? d.getDay() : -1;
});

const toggleTab = (tab) => {
  if (currentTab.value === tab) {
    showTasks.value = !showTasks.value;
  } else {
    currentTab.value = tab;
    showTasks.value = true;
  }
};

const loadTasks = async () => {
  try {
    const res = await axios.get('/tasks');
    tasks.value = (res.data || []).map(t => ({
      id: t.id,
      text: t.title || '',
      done: !!t.completed,
      category: t.frequency ? capitalize(t.frequency) : 'Daily',
      due_date: t.due_date || null,
      showActions: false
    }));
  } catch (err) {
    console.error('Failed to load tasks', err);
  }
};

const addTask = async () => {
  const text = (newTaskText.value || '').trim();
  if (!text) return;
  try {
    let dueDate = null;
    if (currentTab.value !== 'Daily') {
      if (selectedDate.value) {
        const d = parseDate(selectedDate.value);
        dueDate = d ? d.toISOString().split('T')[0] : null;
      } else {
        dueDate = new Date().toISOString().split('T')[0];
      }
    }

    const payload = { title: text, frequency: currentTab.value.toLowerCase(), due_date: dueDate };
    const res = await axios.post('/tasks', payload);
    const t = res.data.task || res.data;
    tasks.value.push({
      id: t.id,
      text: t.title,
      done: !!t.completed,
      category: t.frequency ? capitalize(t.frequency) : capitalize(currentTab.value),
      showActions: false,
      due_date: t.due_date || dueDate
    });
    newTaskText.value = '';
  } catch (err) {
    console.error('Failed to add task', err);
  }
};

const deleteTask = async (id) => {
  try {
    await axios.delete(`/tasks/${id}`);
    tasks.value = tasks.value.filter(t => t.id !== id);
    if (editingId.value === id) cancelEdit();
  } catch (err) {
    console.error('Failed to delete task', err);
  }
};

const startEdit = (task) => {
  editingId.value = task.id;
  editBuffer.value = task.text;
  task.showActions = true;
};

const saveEdit = async (id) => {
  const task = tasks.value.find(t => t.id === id);
  if (!task) return;
  try {
    const payload = {
      title: (editBuffer.value || '').trim(),
      frequency: (task.category || 'daily').toLowerCase(),
      completed: !!task.done,
      due_date: task.due_date
    };
    const res = await axios.put(`/tasks/${id}`, payload);
    const updated = res.data.task || res.data;
    task.text = updated.title;
    task.category = updated.frequency ? capitalize(updated.frequency) : task.category;
    editingId.value = null;
    task.showActions = false;
  } catch (err) {
    console.error('Failed to save edit', err);
  }
};

const cancelEdit = () => {
  editingId.value = null;
  editBuffer.value = '';
};

const toggleDone = async (task) => {
  try {
    const payload = {
      title: task.text,
      frequency: (task.category || 'daily').toLowerCase(),
      completed: !task.done,
      due_date: task.due_date
    };
    const res = await axios.put(`/tasks/${task.id}`, payload);
    const updated = res.data.task || res.data;
    task.done = !!updated.completed;
    task.showActions = false;
  } catch (err) {
    console.error('Failed to toggle done', err);
  }
};

const filteredTasks = computed(() => {
  const q = (searchQuery.value || '').toLowerCase();
  return tasks.value.filter(task => {
    const matchesCategory = task.category === currentTab.value;
    const matchesDay = currentTab.value === 'Daily'
      ? true
      : (selectedDay.value === -1 || (task.due_date && parseDate(task.due_date) && parseDate(task.due_date).getDay() === selectedDay.value));
    const matchesSearch = !q || (task.text || '').toLowerCase().includes(q);
    return matchesCategory && matchesDay && matchesSearch;
  });
});

const tabCounts = computed(() => {
  const counts = {};
  ['Daily', 'Weekly', 'Monthly', 'Yearly'].forEach(tab => {
    counts[tab] = tasks.value.filter(task => {
      const matchesCategory = task.category === tab;
      const matchesDay = tab === 'Daily' ? true : (selectedDay.value === -1 || (task.due_date && parseDate(task.due_date) && parseDate(task.due_date).getDay() === selectedDay.value));
      return matchesCategory && matchesDay;
    }).length;
  });
  return counts;
});

watch(selectedDate, (newVal) => {
  if (!newVal) {
    localStorage.removeItem('selectedDate');
  } else {
    const d = parseDate(newVal);
    if (d) {
      localStorage.setItem('selectedDate', d.toISOString());
    }
  }
});

const clearSelectedDate = () => selectedDate.value = null;
const clearSearch = () => searchQuery.value = '';

const handleDocumentClick = (e) => {
  if (!e.target.closest('.task-item')) {
    tasks.value.forEach(t => t.showActions = false);
  }
};

onMounted(() => {
  loadTasks();
  const storedDate = localStorage.getItem('selectedDate');
  selectedDate.value = storedDate ? parseDate(storedDate) : null;
  document.addEventListener('click', handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<style scoped>
.todo.list.application {
  position: relative;
  min-height: 100vh;
  padding: 40px;
  font-family: 'Segoe UI', sans-serif;
  background: transparent;
}

.container {
  position: relative;
  z-index: 1;
  max-width: 600px;
  margin: 0 auto;
  background: white;
  padding: 2rem;
  border-radius: 15px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.05);
}

h1 { color: #2e7d32; text-align: center; }

.header-controls { margin-bottom: 20px; }
.search-row { display:flex; gap:8px; align-items:center; margin-bottom:8px; }
.search-bar { width: 100%; padding: 10px; margin-bottom: 0; border: 1px solid #bce3bdff; border-radius: 5px; }
.clear-search { background:none; border:none; cursor:pointer; font-size:16px; }

.add-section { display: flex; gap: 10px; margin-top:8px; }
.add-section input { flex: 1; padding: 10px; border: 1px solid #aedaafff; border-radius: 5px; }

.tabs { display: flex; justify-content: space-around; margin-bottom: 20px; border-bottom: 2px solid #dcefdeff; }
.tabs button { background: none; border: none; padding: 10px; cursor: pointer; color: #697466ff; }
.tabs button.active { color: #556857ff; border-bottom: 2px solid #467e4dff; font-weight: bold; }

.day-filter { margin: 10px 0; display: flex; align-items: center; gap: 10px; }
.day-filter label { margin-right: 10px; font-weight: bold; }
.day-filter select { padding: 5px; border-radius: 3px; border: 1px solid #ccc; }

.task-list { list-style: none; padding: 0; margin:0; }
.task-item { padding: 15px; border-bottom: 1px solid #f1f8e9; display: flex; justify-content: space-between; align-items: center; gap:10px; }
.task-content { cursor: pointer; flex:1; display:flex; align-items:center; gap:8px; }
.completed { color: #a5d6a7; text-decoration: line-through; }

.pending { color: #1e88e5; margin-left: 5px; }
.checkmark { color: #d32f2f; margin-left: 5px; }

.add-btn { background: #569f56ff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
.delete-btn { color: #d32f2f; background:none; border: none; cursor:pointer; }
.overdue { color: red; margin-left: 5px; }

.actions button { margin-right: 8px; }
.edit-mode { margin-top: 8px; display: flex; gap: 8px; align-items: center; }
.clear-btn { background: none; border: 1px solid #ccc; padding: 6px 8px; border-radius: 4px; cursor: pointer; }
</style>