namespace TaskFlow.API.Models;

public enum TaskItemStatus
{
    Backlog = 0,
    Todo = 1,
    InProgress = 2,
    InReview = 3,
    Done = 4,
    Cancelled = 5
}

public enum TaskItemPriority
{
    None = 0,
    Low = 1,
    Medium = 2,
    High = 3,
    Urgent = 4
}

public class TaskItem
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string TaskNumber { get; set; } = string.Empty;   // "TF-14"
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TaskItemStatus Status { get; set; } = TaskItemStatus.Backlog;
    public TaskItemPriority Priority { get; set; } = TaskItemPriority.None;
    public string? Assignee { get; set; }
    public DateTime? DueDate { get; set; }
    public double? EstimatedHours { get; set; }
    public int TrackedMinutes { get; set; }
    public int? ParentTaskId { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    // Navigation
    public Project Project { get; set; } = null!;
    public TaskItem? ParentTask { get; set; }
    public List<TaskItem> SubTasks { get; set; } = new();
    public List<Comment> Comments { get; set; } = new();
    public List<TimeEntry> TimeEntries { get; set; } = new();
}