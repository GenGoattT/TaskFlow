// ────────────────────────────────────────────────────
// API Client — all server communication is in here.
// ────────────────────────────────────────────────────

const BASE = '/api';

async function request(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
    if (res.status === 204) return null;
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
    }
    return res.json();
}

export const API = {
    // Projects
    getProjects:    ()              => request('/projects'),
    getProject:     (id)            => request(`/projects/${id}`),
    createProject:  (data)          => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
    updateProject:  (id, data)      => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteProject:  (id)            => request(`/projects/${id}`, { method: 'DELETE' }),

    // Tasks
    getTasks: (projectId, filters = {}) => {
        const params = new URLSearchParams({ projectId });
        if (filters.priority !== undefined && filters.priority !== '')  params.set('priority', filters.priority);
        if (filters.search)  params.set('search', filters.search);
        return request(`/tasks?${params}`);
    },
    getTask:       (id)        => request(`/tasks/${id}`),
    createTask:    (data)      => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    updateTask:    (id, data)  => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteTask:    (id)        => request(`/tasks/${id}`, { method: 'DELETE' }),
    reorderTasks:  (data)      => request('/tasks/reorder', { method: 'POST', body: JSON.stringify(data) }),

    // Comments & Time
    addComment:    (taskId, data)  => request(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify(data) }),
    addTimeEntry:  (taskId, data)  => request(`/tasks/${taskId}/time-entries`, { method: 'POST', body: JSON.stringify(data) }),
};