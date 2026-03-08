// ────────────────────────────────────────────────────
// TaskFlow — Main Application
// ────────────────────────────────────────────────────

import { API } from './api.js';

// ─── Constants ───────────────────────────────────────

const STATUS_COLS = [
    { key: 0, label: 'Backlog',     color: 'var(--status-backlog)' },
    { key: 1, label: 'Todo',        color: 'var(--status-todo)' },
    { key: 2, label: 'In Progress', color: 'var(--status-progress)' },
    { key: 3, label: 'In Review',   color: 'var(--status-review)' },
    { key: 4, label: 'Done',        color: 'var(--status-done)' },
];

const PRIORITY_LABELS = ['None', 'Low', 'Medium', 'High', 'Urgent'];
const PRIORITY_CLASSES = ['none', 'low', 'medium', 'high', 'urgent'];
const STATUS_LABELS = ['Backlog', 'Todo', 'InProgress', 'InReview', 'Done', 'Cancelled'];

// ─── State ───────────────────────────────────────────

const state = {
    projects: [],
    currentProjectId: null,
    tasks: [],
    currentView: 'board',
    selectedTaskId: null,
    filters: { priority: '', search: '' },
    timer: { taskId: null, taskLabel: '', startTime: null, interval: null },
    commandIndex: 0,
};


// ─── Init ────────────────────────────────────────────

async function init() {
    await loadProjects();
    bindKeyboard();
}

async function loadProjects() {
    state.projects = await API.getProjects();
    renderProjectList();
    // Auto-select first project if exists
    if (state.projects.length > 0 && !state.currentProjectId) {
        await selectProject(state.projects[0].id);
    }
}

async function selectProject(id) {
    state.currentProjectId = id;
    state.selectedTaskId = null;
    closeTaskPanel();
    renderProjectList();

    const proj = state.projects.find(p => p.id === id);
    document.getElementById('toolbar-title').textContent = proj?.name || '';
    document.getElementById('view-switcher').style.display = 'flex';
    document.getElementById('toolbar-actions').style.display = 'flex';
    document.getElementById('empty-state')?.remove();

    await loadTasks();
}

async function loadTasks() {
    if (!state.currentProjectId) return;
    state.tasks = await API.getTasks(state.currentProjectId, state.filters);
    renderContent();
}


// ─── Render: Project List ────────────────────────────

function renderProjectList() {
    const ul = document.getElementById('project-list');
    ul.innerHTML = state.projects.map(p => `
        <li class="sidebar-project-item ${p.id === state.currentProjectId ? 'active' : ''}"
            onclick="App.selectProject(${p.id})">
            <span class="sidebar-project-key">${esc(p.key)}</span>
            <span>${esc(p.name)}</span>
        </li>
    `).join('');
}


// ─── Render: Content (Board / List) ──────────────────

function renderContent() {
    const el = document.getElementById('content');
    if (state.currentView === 'board') {
        el.innerHTML = renderBoard();
        bindDragAndDrop();
    } else {
        el.innerHTML = renderList();
    }
}


// ─── Board View ──────────────────────────────────────

function renderBoard() {
    return `<div class="board">${STATUS_COLS.map(col => {
        const tasks = state.tasks.filter(t => t.status === col.key);
        return `
            <div class="board-column">
                <div class="column-header">
                    <div class="column-header-left">
                        <span class="column-dot" style="background:${col.color}"></span>
                        <span class="column-name">${col.label}</span>
                        <span class="column-count">${tasks.length}</span>
                    </div>
                </div>
                <div class="column-cards" data-status="${col.key}">
                    ${tasks.map(t => renderCard(t)).join('')}
                </div>
            </div>`;
    }).join('')}</div>`;
}

function renderCard(t) {
    const prioClass = PRIORITY_CLASSES[t.priority];
    const prioColor = `var(--priority-${prioClass})`;
    const meta = [];

    if (t.dueDate) {
        const d = new Date(t.dueDate);
        const overdue = d < new Date() && t.status !== 4;
        meta.push(`<span class="task-card-tag" ${overdue ? 'style="color:var(--priority-urgent)"' : ''}>${formatDate(d)}</span>`);
    }

    if (t.trackedMinutes > 0) {
        meta.push(`<span class="task-card-tag">⏱ ${formatMinutes(t.trackedMinutes)}</span>`);
    }

    if (t.subTaskCount > 0) {
        const pct = Math.round((t.subTasksDone / t.subTaskCount) * 100);
        meta.push(`
            <span class="subtask-progress">
                <span class="subtask-progress-bar"><span class="subtask-progress-fill" style="width:${pct}%"></span></span>
                ${t.subTasksDone}/${t.subTaskCount}
            </span>`);
    }

    if (t.commentCount > 0) {
        meta.push(`<span class="task-card-tag">💬 ${t.commentCount}</span>`);
    }

    const assigneeHtml = t.assignee
        ? `<span class="task-card-assignee">${t.assignee.substring(0, 2).toUpperCase()}</span>`
        : '';

    return `
        <div class="task-card" draggable="true" data-task-id="${t.id}" onclick="App.openTaskPanel(${t.id})">
            ${t.priority > 0 ? `<div class="task-card-priority" style="background:${prioColor}"></div>` : ''}
            <div class="task-card-header">
                <span class="task-card-number">${esc(t.taskNumber)}</span>
            </div>
            <div class="task-card-title">${esc(t.title)}</div>
            ${meta.length || assigneeHtml ? `<div class="task-card-meta">${meta.join('')}${assigneeHtml}</div>` : ''}
        </div>`;
}


// ─── List View ───────────────────────────────────────

function renderList() {
    let html = '<div class="list-view">';
    for (const col of STATUS_COLS) {
        const tasks = state.tasks.filter(t => t.status === col.key);
        if (tasks.length === 0) continue;
        html += `
            <div class="list-group">
                <div class="list-group-header">
                    <span class="column-dot" style="background:${col.color}"></span>
                    <span class="column-name">${col.label}</span>
                    <span class="column-count">${tasks.length}</span>
                </div>
                ${tasks.map(t => `
                    <div class="list-row" onclick="App.openTaskPanel(${t.id})">
                        <span class="list-row-id">${esc(t.taskNumber)}</span>
                        <span class="list-row-title">${esc(t.title)}</span>
                        <span class="list-row-priority">
                            <span class="priority-badge priority-${PRIORITY_CLASSES[t.priority]}">${PRIORITY_LABELS[t.priority]}</span>
                        </span>
                        <span class="list-row-assignee">${t.assignee ? esc(t.assignee) : '—'}</span>
                        <span class="list-row-date">${t.dueDate ? formatDate(new Date(t.dueDate)) : '—'}</span>
                    </div>
                `).join('')}
            </div>`;
    }
    html += '</div>';
    return html;
}


// ─── Drag & Drop ─────────────────────────────────────

function bindDragAndDrop() {
    document.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', card.dataset.taskId);
            card.classList.add('dragging');
            setTimeout(() => card.style.opacity = '0.4', 0);
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            card.style.opacity = '';
            document.querySelectorAll('.column-cards.drag-over').forEach(c => c.classList.remove('drag-over'));
        });
    });

    document.querySelectorAll('.column-cards').forEach(col => {
        col.addEventListener('dragover', e => {
            e.preventDefault();
            col.classList.add('drag-over');
        });
        col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
        col.addEventListener('drop', async e => {
            e.preventDefault();
            col.classList.remove('drag-over');
            const taskId = parseInt(e.dataTransfer.getData('text/plain'));
            const newStatus = parseInt(col.dataset.status);

            // Build reorder list: moved card gets new status
            const cards = col.querySelectorAll('.task-card');
            const reorders = [{ taskId, newStatus, newSortOrder: cards.length }];

            await API.reorderTasks(reorders);
            await loadTasks();

            // If detail panel is open for this task, refresh it
            if (state.selectedTaskId === taskId) {
                openTaskPanel(taskId);
            }
        });
    });
}


// ─── Task Detail Panel ───────────────────────────────

async function openTaskPanel(id) {
    state.selectedTaskId = id;
    const task = await API.getTask(id);
    if (!task) return;

    document.getElementById('panel-task-number').textContent = task.taskNumber;
    document.getElementById('panel-body').innerHTML = renderPanelBody(task);
    document.getElementById('panel-overlay').classList.add('open');
    document.getElementById('task-panel').classList.add('open');
}

function closeTaskPanel() {
    state.selectedTaskId = null;
    document.getElementById('panel-overlay').classList.remove('open');
    document.getElementById('task-panel').classList.remove('open');
}

function renderPanelBody(t) {
    const statusOptions = STATUS_LABELS.slice(0, 5).map((s, i) =>
        `<option value="${i}" ${t.status === i ? 'selected' : ''}>${s.replace('InProgress','In Progress').replace('InReview','In Review')}</option>`
    ).join('');

    const priorityOptions = PRIORITY_LABELS.map((p, i) =>
        `<option value="${i}" ${t.priority === i ? 'selected' : ''}>${p}</option>`
    ).join('');

    return `
        <input class="panel-title" value="${esc(t.title)}"
               onchange="App.updateField(${t.id}, 'title', this.value)" />

        <div class="panel-fields">
            <span class="panel-label">Status</span>
            <select class="panel-select" onchange="App.updateField(${t.id}, 'status', +this.value)">${statusOptions}</select>

            <span class="panel-label">Priority</span>
            <select class="panel-select" onchange="App.updateField(${t.id}, 'priority', +this.value)">${priorityOptions}</select>

            <span class="panel-label">Assignee</span>
            <input class="panel-select" style="border:1px solid transparent" placeholder="Unassigned"
                   value="${t.assignee || ''}"
                   onchange="App.updateField(${t.id}, 'assignee', this.value)" />

            <span class="panel-label">Due date</span>
            <input type="date" class="panel-date-input"
                   value="${t.dueDate ? t.dueDate.substring(0, 10) : ''}"
                   onchange="App.updateField(${t.id}, 'dueDate', this.value || null)" />

            <span class="panel-label">Estimate</span>
            <input type="number" class="panel-select" style="width:80px;border:1px solid transparent" placeholder="—" step="0.5"
                   value="${t.estimatedHours || ''}"
                   onchange="App.updateField(${t.id}, 'estimatedHours', +this.value || null)" />
        </div>

        <!-- Time Tracking -->
        <div class="panel-section">
            <div class="panel-section-header">
                <span class="panel-section-title">Time Tracking</span>
                <button class="btn btn-sm btn-secondary" onclick="App.startTimer(${t.id}, '${esc(t.taskNumber)}')">▶ Start</button>
            </div>
            <div class="time-display">
                <span class="time-tracked">${formatMinutes(t.trackedMinutes)}</span>
                ${t.estimatedHours ? `<span class="time-est">/ ${t.estimatedHours}h estimated</span>` : ''}
            </div>
            ${t.timeEntries.length > 0 ? `
                <div class="mt-2">
                    ${t.timeEntries.map(te => `
                        <div class="flex items-center gap-2 text-sm text-muted" style="padding:3px 0">
                            <span class="text-mono">${formatMinutes(te.durationMinutes)}</span>
                            ${te.note ? `<span>— ${esc(te.note)}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>

        <!-- Description -->
        <div class="panel-section">
            <span class="panel-section-title">Description</span>
            <textarea class="panel-description mt-2" placeholder="Add a description…"
                      onchange="App.updateField(${t.id}, 'description', this.value)">${t.description || ''}</textarea>
        </div>

        <!-- Subtasks -->
        <div class="panel-section">
            <div class="panel-section-header">
                <span class="panel-section-title">Subtasks (${t.subTasks.filter(s => s.status === 4).length}/${t.subTasks.length})</span>
            </div>
            ${t.subTasks.map(s => `
                <div class="subtask-item ${s.status === 4 ? 'done' : ''}">
                    <input type="checkbox" ${s.status === 4 ? 'checked' : ''}
                           onchange="App.toggleSubtask(${s.id}, this.checked)" />
                    <span>${esc(s.taskNumber)}</span>
                    <span>${esc(s.title)}</span>
                </div>
            `).join('')}
            <div class="subtask-add">
                <input type="text" id="subtask-input" placeholder="Add subtask…"
                       onkeydown="if(event.key==='Enter') App.addSubtask(${t.id}, this.value)" />
                <button class="btn btn-sm btn-secondary" onclick="App.addSubtask(${t.id}, document.getElementById('subtask-input').value)">Add</button>
            </div>
        </div>

        <!-- Comments -->
        <div class="panel-section">
            <span class="panel-section-title">Comments (${t.comments.length})</span>
            ${t.comments.map(c => `
                <div class="comment-item">
                    <div class="comment-header">
                        <span class="comment-author">${esc(c.author)}</span>
                        <span class="comment-time">${timeAgo(c.createdAt)}</span>
                    </div>
                    <div class="comment-body">${esc(c.content)}</div>
                </div>
            `).join('')}
            <div class="comment-add">
                <input type="text" id="comment-input" placeholder="Write a comment…"
                       onkeydown="if(event.key==='Enter') App.addComment(${t.id}, this.value)" />
                <button class="btn btn-sm btn-primary" onclick="App.addComment(${t.id}, document.getElementById('comment-input').value)">Send</button>
            </div>
        </div>
    `;
}


// ─── Actions ─────────────────────────────────────────

async function updateField(taskId, field, value) {
    const data = {};
    data[field] = value;
    await API.updateTask(taskId, data);
    await loadTasks();
}

async function toggleSubtask(subtaskId, checked) {
    await API.updateTask(subtaskId, { status: checked ? 4 : 1 });
    await loadTasks();
    if (state.selectedTaskId) openTaskPanel(state.selectedTaskId);
}

async function addSubtask(parentId, title) {
    if (!title?.trim()) return;
    await API.createTask({
        projectId: state.currentProjectId,
        title: title.trim(),
        parentTaskId: parentId,
    });
    await loadTasks();
    openTaskPanel(parentId);
}

async function addComment(taskId, content) {
    if (!content?.trim()) return;
    await API.addComment(taskId, { content: content.trim() });
    openTaskPanel(taskId);
}

async function deleteCurrentTask() {
    if (!state.selectedTaskId) return;
    if (!confirm('Delete this task?')) return;
    await API.deleteTask(state.selectedTaskId);
    closeTaskPanel();
    await loadTasks();
}


// ─── Timer ───────────────────────────────────────────

function startTimer(taskId, label) {
    if (state.timer.interval) stopTimer();
    state.timer = { taskId, taskLabel: label, startTime: Date.now(), interval: null };

    const widget = document.getElementById('timer-widget');
    const display = document.getElementById('timer-display');
    const taskLabel = document.getElementById('timer-task-label');

    taskLabel.textContent = label;
    widget.style.display = 'flex';

    state.timer.interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - state.timer.startTime) / 1000);
        const m = Math.floor(elapsed / 60);
        const s = elapsed % 60;
        display.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }, 1000);
}

async function stopTimer() {
    if (!state.timer.startTime) return;

    const minutes = Math.max(1, Math.round((Date.now() - state.timer.startTime) / 60000));
    clearInterval(state.timer.interval);

    await API.addTimeEntry(state.timer.taskId, {
        durationMinutes: minutes,
        note: `Tracked ${formatMinutes(minutes)}`,
    });

    document.getElementById('timer-widget').style.display = 'none';
    state.timer = { taskId: null, taskLabel: '', startTime: null, interval: null };

    await loadTasks();
    if (state.selectedTaskId) openTaskPanel(state.selectedTaskId);
}


// ─── Views ───────────────────────────────────────────

function setView(view) {
    state.currentView = view;
    document.querySelectorAll('.view-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.view === view);
    });
    renderContent();
}

function applyFilters() {
    state.filters.priority = document.getElementById('filter-priority').value;
    state.filters.search = document.getElementById('filter-search').value;
    loadTasks();
}


// ─── Command Palette ─────────────────────────────────

const COMMANDS = [
    { icon: '➕', label: 'Create new task',        action: () => showNewTaskModal(),         keys: 'N' },
    { icon: '📋', label: 'Switch to Board view',   action: () => setView('board'),           keys: 'B' },
    { icon: '☰',  label: 'Switch to List view',    action: () => setView('list'),            keys: 'L' },
    { icon: '📁', label: 'Create new project',     action: () => showNewProjectModal(),      keys: '' },
    { icon: '⌨',  label: 'Show keyboard shortcuts', action: () => showShortcuts(),           keys: '?' },
];

function toggleCommandPalette() {
    const overlay = document.getElementById('command-overlay');
    const palette = document.getElementById('command-palette');
    const isOpen = palette.classList.contains('open');

    if (isOpen) {
        overlay.classList.remove('open');
        palette.classList.remove('open');
    } else {
        overlay.classList.add('open');
        palette.classList.add('open');
        const input = document.getElementById('command-input');
        input.value = '';
        input.focus();
        state.commandIndex = 0;
        renderCommands(COMMANDS);
    }
}

function filterCommands(query) {
    const q = query.toLowerCase();
    const filtered = COMMANDS.filter(c => c.label.toLowerCase().includes(q));
    state.commandIndex = 0;
    renderCommands(filtered);
}

function renderCommands(cmds) {
    const list = document.getElementById('command-list');
    list.innerHTML = cmds.map((c, i) => `
        <li class="command-item ${i === state.commandIndex ? 'selected' : ''}"
            onclick="App._execCmd(${COMMANDS.indexOf(c)})"
            onmouseenter="App._hoverCmd(${i})">
            <div class="command-item-left">
                <span class="command-item-icon">${c.icon}</span>
                <span class="command-item-label">${c.label}</span>
            </div>
            ${c.keys ? `<span class="command-item-hint">${c.keys}</span>` : ''}
        </li>
    `).join('');
}

function _execCmd(idx) {
    COMMANDS[idx].action();
    toggleCommandPalette();
}

function _hoverCmd(idx) {
    state.commandIndex = idx;
}


// ─── Modals ──────────────────────────────────────────

function showModal(title, bodyHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-overlay').classList.add('open');
    document.getElementById('modal').classList.add('open');
    // Focus first input
    setTimeout(() => document.querySelector('#modal-body input')?.focus(), 50);
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
    document.getElementById('modal').classList.remove('open');
}

function showNewTaskModal() {
    if (!state.currentProjectId) return;
    showModal('New Task', `
        <div class="form-group">
            <label class="form-label">Title</label>
            <input class="form-input" id="new-task-title" placeholder="What needs to be done?" />
        </div>
        <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-textarea" id="new-task-desc" placeholder="Optional description…"></textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Priority</label>
                <select class="form-select" id="new-task-priority">
                    <option value="0">None</option>
                    <option value="1">Low</option>
                    <option value="2">Medium</option>
                    <option value="3">High</option>
                    <option value="4">Urgent</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Assignee</label>
                <input class="form-input" id="new-task-assignee" placeholder="Name" />
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Due date</label>
                <input type="date" class="form-input" id="new-task-due" />
            </div>
            <div class="form-group">
                <label class="form-label">Estimate (hours)</label>
                <input type="number" class="form-input" id="new-task-est" step="0.5" placeholder="—" />
            </div>
        </div>
        <div class="form-actions">
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="App.submitNewTask()">Create Task</button>
        </div>
    `);
}

async function submitNewTask() {
    const title = document.getElementById('new-task-title').value.trim();
    if (!title) return;

    await API.createTask({
        projectId: state.currentProjectId,
        title,
        description: document.getElementById('new-task-desc').value || null,
        priority: parseInt(document.getElementById('new-task-priority').value),
        assignee: document.getElementById('new-task-assignee').value || null,
        dueDate: document.getElementById('new-task-due').value || null,
        estimatedHours: parseFloat(document.getElementById('new-task-est').value) || null,
    });

    closeModal();
    await loadTasks();
}

function showNewProjectModal() {
    showModal('New Project', `
        <div class="form-group">
            <label class="form-label">Project name</label>
            <input class="form-input" id="new-proj-name" placeholder="My Project" />
        </div>
        <div class="form-group">
            <label class="form-label">Key (2-5 characters)</label>
            <input class="form-input" id="new-proj-key" placeholder="PRJ" maxlength="5" style="text-transform:uppercase" />
        </div>
        <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-textarea" id="new-proj-desc" placeholder="Optional…"></textarea>
        </div>
        <div class="form-actions">
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="App.submitNewProject()">Create Project</button>
        </div>
    `);
}

async function submitNewProject() {
    const name = document.getElementById('new-proj-name').value.trim();
    const key = document.getElementById('new-proj-key').value.trim().toUpperCase();
    if (!name || !key) return;

    await API.createProject({
        name,
        key,
        description: document.getElementById('new-proj-desc').value || null,
    });

    closeModal();
    await loadProjects();
    // Select the newly created project
    const newest = state.projects[0];
    if (newest) await selectProject(newest.id);
}

function showShortcuts() {
    showModal('Keyboard Shortcuts', `
        <div style="display:grid; grid-template-columns:60px 1fr; gap:8px 16px; font-size:13px;">
            <kbd class="text-mono" style="text-align:center;background:var(--bg-app);padding:3px 8px;border-radius:4px;border:1px solid var(--border)">N</kbd> <span>New task</span>
            <kbd class="text-mono" style="text-align:center;background:var(--bg-app);padding:3px 8px;border-radius:4px;border:1px solid var(--border)">B</kbd> <span>Board view</span>
            <kbd class="text-mono" style="text-align:center;background:var(--bg-app);padding:3px 8px;border-radius:4px;border:1px solid var(--border)">L</kbd> <span>List view</span>
            <kbd class="text-mono" style="text-align:center;background:var(--bg-app);padding:3px 8px;border-radius:4px;border:1px solid var(--border)">⌘K</kbd> <span>Command palette</span>
            <kbd class="text-mono" style="text-align:center;background:var(--bg-app);padding:3px 8px;border-radius:4px;border:1px solid var(--border)">Esc</kbd> <span>Close panel / modal</span>
            <kbd class="text-mono" style="text-align:center;background:var(--bg-app);padding:3px 8px;border-radius:4px;border:1px solid var(--border)">?</kbd> <span>Show shortcuts</span>
        </div>
        <div class="form-actions mt-4">
            <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
        </div>
    `);
}


// ─── Keyboard Shortcuts ──────────────────────────────

function bindKeyboard() {
    document.addEventListener('keydown', e => {
        // Don't trigger when typing in inputs
        const tag = e.target.tagName;
        const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

        // Ctrl/Cmd + K  →  Command Palette
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            toggleCommandPalette();
            return;
        }

        // Escape  →  Close things
        if (e.key === 'Escape') {
            const cmdOpen = document.getElementById('command-palette').classList.contains('open');
            const modalOpen = document.getElementById('modal').classList.contains('open');
            const panelOpen = document.getElementById('task-panel').classList.contains('open');
            if (cmdOpen) toggleCommandPalette();
            else if (modalOpen) closeModal();
            else if (panelOpen) closeTaskPanel();
            return;
        }

        // Command palette navigation
        if (document.getElementById('command-palette').classList.contains('open')) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                state.commandIndex = Math.min(state.commandIndex + 1, COMMANDS.length - 1);
                renderCommands(COMMANDS);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                state.commandIndex = Math.max(state.commandIndex - 1, 0);
                renderCommands(COMMANDS);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                _execCmd(state.commandIndex);
            }
            return;
        }

        if (isInput) return;

        // Single-key shortcuts
        if (e.key === 'n') showNewTaskModal();
        if (e.key === 'b') setView('board');
        if (e.key === 'l') setView('list');
        if (e.key === '?') showShortcuts();
    });
}


// ─── Helpers ─────────────────────────────────────────

function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function formatDate(d) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
}

function formatMinutes(m) {
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}


// ─── Expose to global (for inline onclick handlers) ──

window.App = {
    selectProject, setView, applyFilters,
    openTaskPanel, closeTaskPanel, deleteCurrentTask,
    showNewTaskModal, submitNewTask,
    showNewProjectModal, submitNewProject,
    showShortcuts, closeModal,
    updateField, toggleSubtask, addSubtask, addComment,
    startTimer, stopTimer,
    toggleCommandPalette, filterCommands,
    _execCmd, _hoverCmd,
};


// ─── Boot ────────────────────────────────────────────
init();