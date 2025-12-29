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
import { ref, computed } from 'vue';

const currentTab = ref('Daily');
const searchQuery = ref('');
const newTaskText = ref('');
const editingId = ref(null);
const editBuffer = ref('');

// Task structure including category for tabs
const tasks = ref([
  { id: 1, text: 'Drink 8 glasses of water', done: false, category: 'Daily' },
  { id: 2, text: 'Finish Vue project', done: false, category: 'Weekly' }
]);

const addTask = () => {
  if (!newTaskText.value.trim()) return;
  tasks.value.push({
    id: Date.now(),
    text: newTaskText.value,
    done: false,
    category: currentTab.value
  });
  newTaskText.value = '';
};

const deleteTask = (id) => {
  tasks.value = tasks.value.filter(t => t.id !== id);
};

const startEdit = (task) => {
  editingId.value = task.id;
  editBuffer.value = task.text;
};

const saveEdit = (id) => {
  const task = tasks.value.find(t => t.id === id);
  if (task) task.text = editBuffer.value;
  editingId.value = null;
};

const toggleDone = (task) => { task.done = !task.done; };

// Filter by both Tab category and Search query
const filteredTasks = computed(() => {
  return tasks.value.filter(task => 
    task.category === currentTab.value &&
    task.text.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});
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
