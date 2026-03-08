using TaskFlow.API.DTOs;
using TaskFlow.API.Models;

namespace TaskFlow.API.Services;

public interface ITaskService
{
    Task<List<TaskResponse>> GetTasks(int projectId, TaskItemStatus? status, TaskItemPriority? priority, string? search);
    Task<TaskDetailResponse?> GetTask(int id);
    Task<TaskResponse> CreateTask(CreateTaskRequest request);
    Task<TaskResponse?> UpdateTask(int id, UpdateTaskRequest request);
    Task<bool> DeleteTask(int id);
    Task<bool> Reorder(List<ReorderRequest> requests);
    Task<CommentResponse?> AddComment(int taskId, AddCommentRequest request);
    Task<TimeEntryResponse?> AddTimeEntry(int taskId, AddTimeEntryRequest request);
}