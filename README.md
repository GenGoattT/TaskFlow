# TaskFlow

A fast, keyboard-driven task management app built to fix what Trello and Jira get wrong.

![C#](https://img.shields.io/badge/C%23-.NET_8-512BD4)
![JS](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E)
![SQLite](https://img.shields.io/badge/SQLite-003B57)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Why This Exists

| Problem (Trello/Jira)          | TaskFlow Solution                     |
| ------------------------------ | ------------------------------------- |
| No built-in time tracking      | Start/stop timer on any task          |
| Subtasks are an afterthought   | First-class subtasks with progress    |
| Too many clicks for basic work | Keyboard shortcuts for everything     |
| No command palette             | `Ctrl+K` — search, navigate, act     |
| Jira is slow and bloated       | Vanilla JS, zero frameworks, instant  |
| Board-only or list-only views  | Toggle Board ↔ List in one click     |

## Features

- **Kanban board** — drag-and-drop between columns
- **List view** — dense, scannable table layout
- **Command palette** — `Ctrl+K` to search and run commands
- **Keyboard shortcuts** — `N` new task, `B` board, `L` list, `?` help
- **Time tracking** — persistent timer widget, logged per task
- **Subtasks** — with checkbox completion and progress bar
- **Inline editing** — change title, status, priority, assignee directly
- **Comments** — threaded comments with timestamps
- **Filters** — by priority and text search
- **Clean design** — monochrome + blue accent, no visual noise

## Tech Stack

| Layer    | Technology              |
| -------- | ----------------------- |
| Backend  | C# / ASP.NET Core 8    |
| Database | SQLite + EF Core        |
| Frontend | Vanilla HTML, CSS, JS   |
| API      | RESTful JSON            |

## Getting Started

```bash
# Clone
git clone https://github.com/yourusername/taskflow.git
cd taskflow/src/TaskFlow.API

# Run
dotnet run

# Open
# → http://localhost:5000
```

No npm. No webpack. No build step. Just `dotnet run`.

## API Endpoints

```
GET    /api/projects             List projects
POST   /api/projects             Create project
GET    /api/tasks?projectId=1    List tasks (with optional filters)
POST   /api/tasks                Create task
PUT    /api/tasks/{id}           Update task
DELETE /api/tasks/{id}           Delete task
POST   /api/tasks/reorder        Batch update status/order
POST   /api/tasks/{id}/comments  Add comment
POST   /api/tasks/{id}/time-entries  Log time
```

## Project Structure

```
src/TaskFlow.API/
├── Controllers/     API endpoints
├── Models/          EF Core entities
├── Data/            DbContext + configuration
├── DTOs/            Request/response contracts
├── Services/        Business logic layer
└── wwwroot/         Frontend (static files)
    ├── index.html
    ├── css/style.css
    └── js/
        ├── api.js   HTTP client
        └── app.js   Application logic
```

## Keyboard Shortcuts

| Key      | Action              |
| -------- | ------------------- |
| `N`      | New task            |
| `B`      | Board view          |
| `L`      | List view           |
| `Ctrl+K` | Command palette     |
| `Esc`    | Close panel / modal |
| `?`      | Show shortcuts      |

## Future Improvements

- [ ] User authentication (JWT)
- [ ] WebSocket real-time updates
- [ ] Recurring tasks
- [ ] Task dependencies (blocked by / blocking)
- [ ] Gantt / timeline view
- [ ] File attachments
- [ ] Dark mode toggle
- [ ] Export to CSV

## License

MIT