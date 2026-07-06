/* ----------------------------------------------------
   AetherStudy Study Planner Module
   ---------------------------------------------------- */

import { State } from '../state.js';
import { formatRelativeDate, Sound } from '../utils.js';
import { navigateTo } from '../main.js';
import { Pomodoro } from './pomodoro.js';

let activeCategoryFilter = 'all'; // Default filter ('all', 'active', 'completed', or specific string)

export const Planner = {
  render(container) {
    const tasks = State.getTasks();
    
    // Extract unique categories from tasks to build dynamic filter chips
    const categories = ['all', 'active', 'completed', ...new Set(tasks.map(t => t.category).filter(Boolean))];

    // Filter tasks based on selected filter
    let filteredTasks = tasks;
    if (activeCategoryFilter === 'active') {
      filteredTasks = tasks.filter(t => !t.completed);
    } else if (activeCategoryFilter === 'completed') {
      filteredTasks = tasks.filter(t => t.completed);
    } else if (activeCategoryFilter !== 'all') {
      filteredTasks = tasks.filter(t => t.category === activeCategoryFilter);
    }

    // Sort tasks: uncompleted high-priority first, then medium, then low, then completed
    filteredTasks.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      const priorities = { high: 1, medium: 2, low: 3 };
      return priorities[a.priority] - priorities[b.priority];
    });

    container.innerHTML = `
      <div class="planner-layout">
        
        <!-- Left Side: Filter chips and task list -->
        <div>
          <!-- Filter chips -->
          <div class="filter-bar">
            ${categories.map(cat => {
              const isActive = activeCategoryFilter === cat;
              let label = cat;
              if (cat === 'all') label = 'All Tasks';
              if (cat === 'active') label = 'Active';
              if (cat === 'completed') label = 'Completed';
              return `
                <button class="filter-chip ${isActive ? 'active' : ''}" data-filter="${cat}">
                  ${label}
                </button>
              `;
            }).join('')}
          </div>

          <!-- Task List Box -->
          <div class="task-list" id="planner-tasks-container">
            ${filteredTasks.length === 0 ? `
              <div class="glass-card empty-state" style="padding: 48px;">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--text-muted)" stroke-width="1.5" style="margin-bottom:12px;">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                <div>No tasks found matching "${activeCategoryFilter}". Create one to get started!</div>
              </div>
            ` : filteredTasks.map(task => `
              <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                
                <div class="task-item-left">
                  <label class="checkbox-container">
                    <input type="checkbox" class="toggle-task-chk" data-id="${task.id}" ${task.completed ? 'checked' : ''}>
                    <span class="checkmark"></span>
                  </label>
                  
                  <div class="task-details">
                    <span class="task-title">${task.title}</span>
                    <div class="task-meta">
                      <span class="task-priority ${task.priority}" title="Priority: ${task.priority}"></span>
                      <span class="task-tag">${task.category}</span>
                      <span>${formatRelativeDate(task.dueDate)}</span>
                    </div>
                  </div>
                </div>

                <div class="task-item-right">
                  <div class="pomo-counts" title="Pomodoros logged on this task">
                    <span>🍅</span>
                    <span>${task.pomodoroCount || 0}</span>
                  </div>
                  
                  ${!task.completed ? `
                    <button class="btn btn-secondary btn-icon start-focus-btn" data-id="${task.id}" title="Focus with Pomodoro">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--color-pomodoro)" stroke-width="3">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                    </button>
                  ` : ''}

                  <button class="btn btn-secondary btn-icon delete-task-btn" data-id="${task.id}" title="Delete Task">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--priority-high)" stroke-width="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>

              </div>
            `).join('')}
          </div>
        </div>

        <!-- Right Side: Task Creation form -->
        <div class="glass-card" style="position: sticky; top: 0;">
          <h3 style="font-family:'Outfit'; font-size:1.15rem; font-weight:700; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--color-planner)" stroke-width="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Create New Task</span>
          </h3>

          <form id="create-task-form">
            <div class="form-group">
              <label class="form-label" for="task-title-input">Task Title</label>
              <input type="text" id="task-title-input" class="form-input" placeholder="e.g. Solve Calc III integrals" required autocomplete="off">
            </div>

            <div class="form-group">
              <label class="form-label" for="task-category-input">Subject / Category</label>
              <select id="task-category-input" class="form-select">
                <option value="Physics">Physics</option>
                <option value="Math">Math</option>
                <option value="Literature">Literature</option>
                <option value="Study Skills">Study Skills</option>
                <option value="General">General</option>
                <option value="custom">+ Add Custom Subject...</option>
              </select>
              <input type="text" id="task-custom-category" class="form-input hidden" placeholder="Enter custom subject..." style="margin-top: 8px;">
            </div>

            <div class="form-group">
              <label class="form-label" for="task-priority-input">Task Priority</label>
              <select id="task-priority-input" class="form-select">
                <option value="high">High (Red)</option>
                <option value="medium" selected>Medium (Orange)</option>
                <option value="low">Low (Green)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="task-due-input">Due Date</label>
              <input type="date" id="task-due-input" class="form-input">
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 8px;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              <span>Save Study Task</span>
            </button>
          </form>
        </div>

      </div>
    `;

    // Set default due date as today in the picker
    document.getElementById('task-due-input').value = new Date().toISOString().split('T')[0];

    // --- ATTACH HANDLERS ---
    
    // Category chips click filters
    container.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        activeCategoryFilter = chip.getAttribute('data-filter');
        this.render(container);
      });
    });

    // Custom subject input revealer
    const catSelect = document.getElementById('task-category-input');
    const customCatInput = document.getElementById('task-custom-category');
    catSelect.addEventListener('change', () => {
      if (catSelect.value === 'custom') {
        customCatInput.classList.remove('hidden');
        customCatInput.required = true;
        customCatInput.focus();
      } else {
        customCatInput.classList.add('hidden');
        customCatInput.required = false;
      }
    });

    // Task completion toggling
    container.querySelectorAll('.toggle-task-chk').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        State.toggleTask(id);
        this.render(container);
      });
    });

    // Task deletion
    container.querySelectorAll('.delete-task-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        State.deleteTask(id);
        this.render(container);
      });
    });

    // Link Focus click to Pomodoro Timer
    container.querySelectorAll('.start-focus-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const clickedTask = tasks.find(t => t.id === id);
        if (clickedTask) {
          Pomodoro.setActiveFocusTask(clickedTask);
          navigateTo('pomodoro');
        }
      });
    });

    // Form Submission
    const form = document.getElementById('create-task-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const title = document.getElementById('task-title-input').value.trim();
      let category = catSelect.value;
      if (category === 'custom') {
        category = customCatInput.value.trim() || 'General';
      }
      const priority = document.getElementById('task-priority-input').value;
      const dueDate = document.getElementById('task-due-input').value;

      if (!title) return;

      const newTask = {
        id: 'task-' + Date.now(),
        title,
        category,
        priority,
        completed: false,
        pomodoroCount: 0,
        dueDate
      };

      State.saveTask(newTask);
      Sound.playClick();
      
      // Reset filter to 'all' so the user immediately sees their new task
      activeCategoryFilter = 'all';
      this.render(container);
    });
  }
};
