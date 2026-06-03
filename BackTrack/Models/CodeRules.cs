namespace BackTrack.Models;

public class CodeRules
{
    public bool MaxOccurrenceEnabled { get; set; }
    public int MaxOccurrence { get; set; } = 2;

    public bool SumEqualsEnabled { get; set; }
    public int SumEquals { get; set; } = 10;

    public bool AllUniqueEnabled { get; set; }

    public bool NoZeroEnabled { get; set; }

    public bool MinEvenEnabled { get; set; }
    public int MinEvenCount { get; set; } = 2;

    public bool HasAnyRule() =>
        MaxOccurrenceEnabled || SumEqualsEnabled || AllUniqueEnabled ||
        NoZeroEnabled || MinEvenEnabled;
}

public class RuleCheck
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public bool Passed { get; set; }
}

public class StartLevel2Request
{
    public CodeRules Rules { get; set; } = new();
}
