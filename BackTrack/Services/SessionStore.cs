using BackTrack.Models;

namespace BackTrack.Services;

public class SessionStore
{
    private readonly object _lock = new();
    private SessionState _state = new();

    public SessionState GetState()
    {
        lock (_lock)
        {
            return CloneState(_state);
        }
    }

    public Participant? Join(string name)
    {
        lock (_lock)
        {
            if (_state.Phase != SessionPhase.Lobby)
                return null;

            var participant = new Participant
            {
                Name = name,
                Specialty = Specialty.Info
            };
            _state.Participants.Add(participant);
            return participant;
        }
    }

    public (bool Success, string? Error) StartHacking(int groupCount, int groupSize)
    {
        lock (_lock)
        {
            if (_state.Phase != SessionPhase.Lobby || _state.Participants.Count == 0)
                return (false, "Nem indítható: nincs résztvevő, vagy már fut a játék.");

            if (groupCount < 1 || groupSize < 1)
                return (false, "A csoportok száma és a létszám legalább 1 legyen.");

            var required = groupCount * groupSize;
            if (_state.Participants.Count < required)
                return (false, $"Legalább {required} résztvevő kell ({groupCount} csoport × {groupSize} fő). Jelenleg: {_state.Participants.Count}.");

            _state.GroupCount = groupCount;
            _state.GroupSize = groupSize;
            _state.GroupCodes = new Dictionary<int, string>();
            _state.Groups = new Dictionary<int, List<string>>();

            var usedCodes = new HashSet<string>();
            for (var g = 0; g < groupCount; g++)
            {
                _state.GroupCodes[g] = GenerateUniqueCode(usedCodes);
                _state.Groups[g] = [];
            }

            var shuffled = _state.Participants.OrderBy(_ => Random.Shared.Next()).ToList();

            for (var i = 0; i < shuffled.Count; i++)
            {
                var groupIndex = i < required
                    ? i / groupSize
                    : Random.Shared.Next(groupCount);

                var p = shuffled[i];
                p.GroupNumber = groupIndex;
                p.SecretCode = _state.GroupCodes[groupIndex];
                p.LockedPositions = new bool[5];
                p.GuessCount = 0;
                p.IsHacked = false;
                _state.Groups[groupIndex].Add(p.Id);
            }

            _state.Phase = SessionPhase.Hacking;
            return (true, null);
        }
    }

    public GuessResult? SubmitGuess(string participantId, string guess)
    {
        lock (_lock)
        {
            if (_state.Phase != SessionPhase.Hacking)
                return null;

            var participant = _state.Participants.FirstOrDefault(p => p.Id == participantId);
            if (participant is null || participant.IsHacked)
                return null;

            if (guess.Length != 5 || !guess.All(char.IsDigit))
                return null;

            participant.GuessCount++;

            for (var i = 0; i < 5; i++)
            {
                if (!participant.LockedPositions[i] && guess[i] == participant.SecretCode[i])
                    participant.LockedPositions[i] = true;
            }

            participant.IsHacked = participant.LockedPositions.All(x => x);

            return new GuessResult
            {
                LockedPositions = (bool[])participant.LockedPositions.Clone(),
                IsHacked = participant.IsHacked,
                GuessCount = participant.GuessCount
            };
        }
    }

    public bool TryMarkGrouped()
    {
        lock (_lock)
        {
            if (_state.Phase != SessionPhase.Hacking)
                return false;

            if (!_state.Participants.All(p => p.IsHacked))
                return false;

            _state.Phase = SessionPhase.Grouped;
            return true;
        }
    }

    public (bool Success, string? Error) StartLevel2(CodeRules rules)
    {
        lock (_lock)
        {
            if (_state.Phase != SessionPhase.Grouped)
                return (false, "A 2. szint csak csoportosítás után indítható.");

            if (!rules.HasAnyRule())
                return (false, "Legalább egy szabályt be kell kapcsolni.");

            _state.Level2Rules = rules;
            _state.GroupCodes = new Dictionary<int, string>();
            var usedCodes = new HashSet<string>();

            foreach (var groupNum in _state.Groups.Keys.OrderBy(k => k))
            {
                var code = CodeRuleEngine.GenerateCode(rules, usedCodes);
                if (code is null)
                    return (false, $"Nem sikerült érvényes kódot generálni a {groupNum + 1}. csoporthoz. Lazíts a szabályokon!");

                _state.GroupCodes[groupNum] = code;
            }

            foreach (var p in _state.Participants)
            {
                if (p.GroupNumber is null)
                    continue;

                p.SecretCode = _state.GroupCodes[p.GroupNumber.Value];
                p.LockedPositions = new bool[5];
                p.GuessCount = 0;
                p.IsHacked = false;
            }

            _state.Phase = SessionPhase.Level2Hacking;
            return (true, null);
        }
    }

    public GuessResult? SubmitLevel2Guess(string participantId, string guess)
    {
        lock (_lock)
        {
            if (_state.Phase != SessionPhase.Level2Hacking)
                return null;

            var participant = _state.Participants.FirstOrDefault(p => p.Id == participantId);
            if (participant is null || participant.IsHacked)
                return null;

            if (guess.Length != 5 || !guess.All(char.IsDigit))
                return null;

            participant.GuessCount++;

            for (var i = 0; i < 5; i++)
            {
                if (!participant.LockedPositions[i] && guess[i] == participant.SecretCode[i])
                    participant.LockedPositions[i] = true;
            }

            participant.IsHacked = participant.LockedPositions.All(x => x);

            return new GuessResult
            {
                LockedPositions = (bool[])participant.LockedPositions.Clone(),
                IsHacked = participant.IsHacked,
                GuessCount = participant.GuessCount,
                RuleChecks = CodeRuleEngine.Validate(guess, _state.Level2Rules)
            };
        }
    }

    public bool TryMarkLevel2Complete()
    {
        lock (_lock)
        {
            if (_state.Phase != SessionPhase.Level2Hacking)
                return false;

            if (!_state.Participants.All(p => p.IsHacked))
                return false;

            _state.Phase = SessionPhase.Level2Complete;
            return true;
        }
    }

    public void Reset()
    {
        lock (_lock)
        {
            _state = new SessionState();
        }
    }

    private static string GenerateUniqueCode(HashSet<string> used)
    {
        var rng = Random.Shared;
        string code;
        do
        {
            code = string.Concat(Enumerable.Range(0, 5).Select(_ => rng.Next(0, 10).ToString()));
        } while (!used.Add(code));
        return code;
    }

    private static SessionState CloneState(SessionState state) =>
        new()
        {
            Phase = state.Phase,
            GroupCount = state.GroupCount,
            GroupSize = state.GroupSize,
            Level2Rules = CloneRules(state.Level2Rules),
            GroupCodes = state.GroupCodes.ToDictionary(g => g.Key, g => g.Value),
            Participants = state.Participants.Select(p => new Participant
            {
                Id = p.Id,
                Name = p.Name,
                Specialty = p.Specialty,
                SecretCode = p.SecretCode,
                LockedPositions = (bool[])p.LockedPositions.Clone(),
                GuessCount = p.GuessCount,
                IsHacked = p.IsHacked,
                GroupNumber = p.GroupNumber,
                JoinedAt = p.JoinedAt
            }).ToList(),
            Groups = state.Groups.ToDictionary(
                g => g.Key,
                g => g.Value.ToList())
        };

    private static CodeRules CloneRules(CodeRules r) => new()
    {
        MaxOccurrenceEnabled = r.MaxOccurrenceEnabled,
        MaxOccurrence = r.MaxOccurrence,
        SumEqualsEnabled = r.SumEqualsEnabled,
        SumEquals = r.SumEquals,
        AllUniqueEnabled = r.AllUniqueEnabled,
        NoZeroEnabled = r.NoZeroEnabled,
        MinEvenEnabled = r.MinEvenEnabled,
        MinEvenCount = r.MinEvenCount
    };
}
