namespace BackTrack.Models;

public class Participant
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = string.Empty;
    public Specialty Specialty { get; set; }
    public string SecretCode { get; set; } = string.Empty;
    public bool[] LockedPositions { get; set; } = new bool[5];
    public int GuessCount { get; set; }
    public bool IsHacked { get; set; }
    public int? GroupNumber { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}
