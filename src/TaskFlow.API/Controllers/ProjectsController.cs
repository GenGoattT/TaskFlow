using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskFlow.API.Data;
using TaskFlow.API.DTOs;
using TaskFlow.API.Models;

namespace TaskFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ProjectsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<ProjectResponse>>> GetAll()
    {
        var projects = await _db.Projects
            .Include(p => p.Tasks)
            .OrderByDescending(p => p.UpdatedAt)
            .Select(p => new ProjectResponse(
                p.Id, p.Name, p.Key, p.Description,
                p.Tasks.Count,
                p.Tasks.Count(t => t.Status != TaskItemStatus.Done && t.Status != TaskItemStatus.Cancelled),
                p.CreatedAt))
            .ToListAsync();

        return Ok(projects);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProjectResponse>> Get(int id)
    {
        var p = await _db.Projects.Include(p => p.Tasks).FirstOrDefaultAsync(p => p.Id == id);
        if (p is null) return NotFound();

        return Ok(new ProjectResponse(
            p.Id, p.Name, p.Key, p.Description,
            p.Tasks.Count,
            p.Tasks.Count(t => t.Status != TaskItemStatus.Done && t.Status != TaskItemStatus.Cancelled),
            p.CreatedAt));
    }

    [HttpPost]
    public async Task<ActionResult<ProjectResponse>> Create(CreateProjectRequest request)
    {
        if (await _db.Projects.AnyAsync(p => p.Key == request.Key.ToUpper()))
            return Conflict("Project key already exists.");

        var project = new Project
        {
            Name = request.Name,
            Key = request.Key.ToUpper(),
            Description = request.Description
        };

        _db.Projects.Add(project);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = project.Id },
            new ProjectResponse(project.Id, project.Name, project.Key, project.Description, 0, 0, project.CreatedAt));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult> Update(int id, UpdateProjectRequest request)
    {
        var project = await _db.Projects.FindAsync(id);
        if (project is null) return NotFound();

        project.Name = request.Name;
        project.Description = request.Description;
        project.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id)
    {
        var project = await _db.Projects.FindAsync(id);
        if (project is null) return NotFound();

        _db.Projects.Remove(project);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}