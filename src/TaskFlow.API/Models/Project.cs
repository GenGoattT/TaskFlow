namespace TaskFlow.API.Models;

public class Project
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;       // "TF", "WEB", etc.
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<TaskItem> Tasks { get; set; } = new();
}