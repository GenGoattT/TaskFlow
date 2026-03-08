using Microsoft.EntityFrameworkCore;
using TaskFlow.API.Data;
using TaskFlow.API.DTOs;
using TaskFlow.API.Models;

namespace TaskFlow.API.Services;

public class TaskService : ITaskService
{
    private readonly AppDbContext _db;

    public TaskService(AppDbContext db) => _db = db;

    public async Task<List<TaskResponse>> GetTasks(
        int projectId, TaskItemStatus? status, TaskItemPriority? priority, string? search)
    {
        var query = _db.Tasks
            .Where(t => t.ProjectId == projectId && t.ParentTaskId == null)
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(t => t.Status == status.Value);

        if (priority.HasValue)
            query = query.Where(t => t.Priority == priority.Value);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(t =>
                t.Title.Contains(search) ||
                t.TaskNumber.Contains(search) ||
                (t.Description != null && t.Description.Contains(search)));

        return await query
            .OrderBy(t => t.Status)
            .ThenBy(t => t.SortOrder)
            .ThenByDescending(t => t.CreatedAt)
            .Select(t => MapToResponse(t))
            .ToListAsync();
    }

    public async Task<TaskDetailResponse?> GetTask(int id)
    {
        var task = await _db.Tasks
            .Include(t => t.SubTasks)
            .Include(t => t.Comments.OrderByDescending(c => c.CreatedAt))
            .Include(t => t.TimeEntries.OrderByDescending(te => te.StartedAt))
            .FirstOrDefaultAsync(t => t.Id == id);

        if (task is null) return null;

        return new TaskDetailResponse(
            task.Id, task.ProjectId, task.TaskNumber, task.Title,
            task.Description, task.Status, task.Priority, task.Assignee,
            task.DueDate, task.EstimatedHours, task.TrackedMinutes,
            task.ParentTaskId, task.SortOrder, task.CreatedAt,
            task.UpdatedAt, task.CompletedAt,
            task.SubTasks.Select(s => new SubTaskResponse(s.Id, s.TaskNumber, s.Title, s.Status)).ToList(),
            task.Comments.Select(c => new CommentResponse(c.Id, c.Author, c.Content, c.CreatedAt)).ToList(),
            task.TimeEntries.Select(te => new TimeEntryResponse(te.Id, te.DurationMinutes, te.Note, te.StartedAt)).ToList()
        );
    }

    public async Task<TaskResponse> CreateTask(CreateTaskRequest request)
    {
        var project = await _db.Projects.FindAsync(request.ProjectId)
            ?? throw new ArgumentException("Project not found");

        // Generate task number
        var count = await _db.Tasks.CountAsync(t => t.ProjectId == request.ProjectId);
        var taskNumber = $"{project.Key}-{count + 1}";

        // Get max sort order for the backlog column
        var maxOrder = await _db.Tasks
            .Where(t => t.ProjectId == request.ProjectId && t.Status == TaskItemStatus.Backlog)
            .MaxAsync(t => (int?)t.SortOrder) ?? 0;

        var task = new TaskItem
        {
            ProjectId = request.ProjectId,
            TaskNumber = taskNumber,
            Title = request.Title,
            Description = request.Description,
            Priority = request.Priority,
            Assignee = request.Assignee,
            DueDate = request.DueDate,
            EstimatedHours = request.EstimatedHours,
            ParentTaskId = request.ParentTaskId,
            Status = request.ParentTaskId.HasValue ? TaskItemStatus.Todo : TaskItemStatus.Backlog,
            SortOrder = maxOrder + 1
        };

        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();

        return MapToResponse(task);
    }

    public async Task<TaskResponse?> UpdateTask(int id, UpdateTaskRequest request)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task is null) return null;

        if (request.Title is not null) task.Title = request.Title;
        if (request.Description is not null) task.Description = request.Description;
        if (request.Assignee is not null) task.Assignee = request.Assignee == "" ? null : request.Assignee;
        if (request.DueDate.HasValue) task.DueDate = request.DueDate;
        if (request.EstimatedHours.HasValue) task.EstimatedHours = request.EstimatedHours;
        if (request.Priority.HasValue) task.Priority = request.Priority.Value;

        if (request.Status.HasValue && request.Status.Value != task.Status)
        {
            task.Status = request.Status.Value;
            task.CompletedAt = request.Status.Value == TaskItemStatus.Done ? DateTime.UtcNow : null;
        }

        task.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return MapToResponse(task);
    }

    public async Task<bool> DeleteTask(int id)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task is null) return false;

        _db.Tasks.Remove(task);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> Reorder(List<ReorderRequest> requests)
    {
        foreach (var req in requests)
        {
            var task = await _db.Tasks.FindAsync(req.TaskId);
            if (task is null) continue;

            task.Status = req.NewStatus;
            task.SortOrder = req.NewSortOrder;
            task.UpdatedAt = DateTime.UtcNow;

            if (req.NewStatus == TaskItemStatus.Done && task.CompletedAt is null)
                task.CompletedAt = DateTime.UtcNow;
            else if (req.NewStatus != TaskItemStatus.Done)
                task.CompletedAt = null;
        }

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<CommentResponse?> AddComment(int taskId, AddCommentRequest request)
    {
        if (!await _db.Tasks.AnyAsync(t => t.Id == taskId)) return null;

        var comment = new Comment
        {
            TaskItemId = taskId,
            Author = request.Author,
            Content = request.Content
        };

        _db.Comments.Add(comment);
        await _db.SaveChangesAsync();

        return new CommentResponse(comment.Id, comment.Author, comment.Content, comment.CreatedAt);
    }

    public async Task<TimeEntryResponse?> AddTimeEntry(int taskId, AddTimeEntryRequest request)
    {
        var task = await _db.Tasks.FindAsync(taskId);
        if (task is null) return null;

        var entry = new TimeEntry
        {
            TaskItemId = taskId,
            DurationMinutes = request.DurationMinutes,
            Note = request.Note
        };

        task.TrackedMinutes += request.DurationMinutes;
        task.UpdatedAt = DateTime.UtcNow;

        _db.TimeEntries.Add(entry);
        await _db.SaveChangesAsync();

        return new TimeEntryResponse(entry.Id, entry.DurationMinutes, entry.Note, entry.StartedAt);
    }

    private static TaskResponse MapToResponse(TaskItem t) => new(
        t.Id, t.ProjectId, t.TaskNumber, t.Title, t.Description,
        t.Status, t.Priority, t.Assignee, t.DueDate,
        t.EstimatedHours, t.TrackedMinutes, t.ParentTaskId, t.SortOrder,
        t.SubTasks?.Count(s => true) ?? 0,
        t.SubTasks?.Count(s => s.Status == TaskItemStatus.Done) ?? 0,
        t.Comments?.Count ?? 0,
        t.CreatedAt, t.UpdatedAt, t.CompletedAt
    );
}