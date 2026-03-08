namespace TaskFlow.API.Models;

public class TimeEntry
{
    public int Id { get; set; }
    public int TaskItemId { get; set; }
    public int DurationMinutes { get; set; }
    public string? Note { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;

    public TaskItem TaskItem { get; set; } = null!;
}