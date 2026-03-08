using TaskFlow.API.Models;

namespace TaskFlow.API.DTOs;

public record CreateTaskRequest(
    int ProjectId,
    string Title,
    string? Description = null,
    TaskItemPriority Priority = TaskItemPriority.None,
    string? Assignee = null,
    DateTime? DueDate = null,
    double? EstimatedHours = null,
    int? ParentTaskId = null
);

public record UpdateTaskRequest(
    string? Title = null,
    string? Description = null,
    TaskItemStatus? Status = null,
    TaskItemPriority? Priority = null,
    string? Assignee = null,
    DateTime? DueDate = null,
    double? EstimatedHours = null
);

public record ReorderRequest(int TaskId, TaskItemStatus NewStatus, int NewSortOrder);

public record AddCommentRequest(string Content, string Author = "User");
public record AddTimeEntryRequest(int DurationMinutes, string? Note = null);

public record TaskResponse(
    int Id,
    int ProjectId,
    string TaskNumber,
    string Title,
    string? Description,
    TaskItemStatus Status,
    TaskItemPriority Priority,
    string? Assignee,
    DateTime? DueDate,
    double? EstimatedHours,
    int TrackedMinutes,
    int? ParentTaskId,
    int SortOrder,
    int SubTaskCount,
    int SubTasksDone,
    int CommentCount,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? CompletedAt
);

public record TaskDetailResponse(
    int Id,
    int ProjectId,
    string TaskNumber,
    string Title,
    string? Description,
    TaskItemStatus Status,
    TaskItemPriority Priority,
    string? Assignee,
    DateTime? DueDate,
    double? EstimatedHours,
    int TrackedMinutes,
    int? ParentTaskId,
    int SortOrder,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? CompletedAt,
    List<SubTaskResponse> SubTasks,
    List<CommentResponse> Comments,
    List<TimeEntryResponse> TimeEntries
);

public record SubTaskResponse(int Id, string TaskNumber, string Title, TaskItemStatus Status);
public record CommentResponse(int Id, string Author, string Content, DateTime CreatedAt);
public record TimeEntryResponse(int Id, int DurationMinutes, string? Note, DateTime StartedAt);