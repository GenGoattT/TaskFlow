using Microsoft.EntityFrameworkCore;
using TaskFlow.API.Models;

namespace TaskFlow.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Project> Projects => Set<Project>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<TimeEntry> TimeEntries => Set<TimeEntry>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<Project>(e =>
        {
            e.HasIndex(p => p.Key).IsUnique();
            e.Property(p => p.Key).HasMaxLength(10);
            e.Property(p => p.Name).HasMaxLength(100);
        });

        mb.Entity<TaskItem>(e =>
        {
            e.HasIndex(t => t.TaskNumber).IsUnique();
            e.Property(t => t.Title).HasMaxLength(500);
            e.Property(t => t.TaskNumber).HasMaxLength(20);

            e.HasOne(t => t.Project)
             .WithMany(p => p.Tasks)
             .HasForeignKey(t => t.ProjectId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(t => t.ParentTask)
             .WithMany(t => t.SubTasks)
             .HasForeignKey(t => t.ParentTaskId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        mb.Entity<Comment>(e =>
        {
            e.HasOne(c => c.TaskItem)
             .WithMany(t => t.Comments)
             .HasForeignKey(c => c.TaskItemId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        mb.Entity<TimeEntry>(e =>
        {
            e.HasOne(te => te.TaskItem)
             .WithMany(t => t.TimeEntries)
             .HasForeignKey(te => te.TaskItemId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // Seed a default project
        mb.Entity<Project>().HasData(new Project
        {
            Id = 1,
            Name = "My First Project",
            Key = "MFP",
            Description = "Default project to get you started."
        });
    }
}