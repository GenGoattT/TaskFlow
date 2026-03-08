namespace TaskFlow.API.DTOs;

public record CreateProjectRequest(string Name, string Key, string? Description);
public record UpdateProjectRequest(string Name, string? Description);

public record ProjectResponse(
    int Id,
    string Name,
    string Key,
    string? Description,
    int TaskCount,
    int OpenTaskCount,
    DateTime CreatedAt
);