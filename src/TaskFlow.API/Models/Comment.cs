namespace TaskFlow.API.Models;

public class Comment
{
    public int Id { get; set; }
    public int TaskItemId { get; set; }
    public string Author { get; set; } = "User";
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public TaskItem TaskItem { get; set; } = null!;
}