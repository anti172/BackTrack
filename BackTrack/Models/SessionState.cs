namespace BackTrack.Models;

public enum SessionPhase
{
    Lobby,
    Hacking,
    Grouped,
    Level2Hacking,
    Level2Complete
}

public class SessionState
{
    public SessionPhase Phase { get; set; } = SessionPhase.Lobby;
    public List<Participant> Participants { get; set; } = [];
    public Dictionary<int, List<string>> Groups { get; set; } = [];
    public Dictionary<int, string> GroupCodes { get; set; } = [];
    public int GroupCount { get; set; }
    public List<int> GroupSizes { get; set; } = [];
    public CodeRules Level2Rules { get; set; } = new();
}

public class StartRequest
{
    public int GroupCount { get; set; }
}

public class ParticipantView
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Specialty Specialty { get; set; }
    public bool[] LockedPositions { get; set; } = new bool[5];
    public int GuessCount { get; set; }
    public bool IsHacked { get; set; }
    public int? GroupNumber { get; set; }
}

public class JoinRequest
{
    public string Name { get; set; } = string.Empty;
}

public class GuessRequest
{
    public string ParticipantId { get; set; } = string.Empty;
    public string Guess { get; set; } = string.Empty;
}

public class GuessResult
{
    public bool[] LockedPositions { get; set; } = new bool[5];
    public bool IsHacked { get; set; }
    public int GuessCount { get; set; }
    public List<RuleCheck> RuleChecks { get; set; } = [];
}
