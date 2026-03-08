using Microsoft.AspNetCore.Mvc;
using TaskFlow.API.DTOs;
using TaskFlow.API.Models;
using TaskFlow.API.Services;

namespace TaskFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TasksController : ControllerBase
{
    private readonly ITaskService _svc;

    public TasksController(ITaskService svc) => _svc = svc;

    [HttpGet]
    public async Task<ActionResult<List<TaskResponse>>> GetAll(
        [FromQuery] int projectId,
        [FromQuery] TaskItemStatus? status = null,
        [FromQuery] TaskItemPriority? priority = null,
        [FromQuery] string? search = null)
    {
        var tasks = await _svc.GetTasks(projectId, status, priority, search);
        return Ok(tasks);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TaskDetailResponse>> Get(int id)
    {
        var task = await _svc.GetTask(id);
        return task is null ? NotFound() : Ok(task);
    }

    [HttpPost]
    public async Task<ActionResult<TaskResponse>> Create(CreateTaskRequest request)
    {
        var task = await _svc.CreateTask(request);
        return CreatedAtAction(nameof(Get), new { id = task.Id }, task);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<TaskResponse>> Update(int id, UpdateTaskRequest request)
    {
        var result = await _svc.UpdateTask(id, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id)
    {
        return await _svc.DeleteTask(id) ? NoContent() : NotFound();
    }

    [HttpPost("reorder")]
    public async Task<ActionResult> Reorder(List<ReorderRequest> requests)
    {
        await _svc.Reorder(requests);
        return NoContent();
    }

    [HttpPost("{id:int}/comments")]
    public async Task<ActionResult<CommentResponse>> AddComment(int id, AddCommentRequest request)
    {
        var result = await _svc.AddComment(id, request);
        return result is null ? NotFound() : Created("", result);
    }

    [HttpPost("{id:int}/time-entries")]
    public async Task<ActionResult<TimeEntryResponse>> AddTimeEntry(int id, AddTimeEntryRequest request)
    {
        var result = await _svc.AddTimeEntry(id, request);
        return result is null ? NotFound() : Created("", result);
    }
}