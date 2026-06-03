using BackTrack.Models;

namespace BackTrack.Services;

public static class CodeRuleEngine
{
    public static List<RuleCheck> Validate(string code, CodeRules rules)
    {
        var checks = new List<RuleCheck>();
        if (code.Length != 5 || !code.All(char.IsDigit))
            return checks;

        var digits = code.Select(c => c - '0').ToArray();

        if (rules.MaxOccurrenceEnabled)
        {
            var max = digits.GroupBy(d => d).Max(g => g.Count());
            checks.Add(new RuleCheck
            {
                Id = "maxOccurrence",
                Label = $"Egy számjegy max. {rules.MaxOccurrence}× szerepelhet",
                Passed = max <= rules.MaxOccurrence
            });
        }

        if (rules.SumEqualsEnabled)
        {
            var sum = digits.Sum();
            checks.Add(new RuleCheck
            {
                Id = "sumEquals",
                Label = $"Számjegyek összege = {rules.SumEquals}",
                Passed = sum == rules.SumEquals
            });
        }

        if (rules.AllUniqueEnabled)
        {
            checks.Add(new RuleCheck
            {
                Id = "allUnique",
                Label = "Minden számjegy különböző",
                Passed = digits.Distinct().Count() == 5
            });
        }

        if (rules.NoZeroEnabled)
        {
            checks.Add(new RuleCheck
            {
                Id = "noZero",
                Label = "Nincs benne 0",
                Passed = !digits.Contains(0)
            });
        }

        if (rules.MinEvenEnabled)
        {
            var even = digits.Count(d => d % 2 == 0);
            checks.Add(new RuleCheck
            {
                Id = "minEven",
                Label = $"Legalább {rules.MinEvenCount} páros számjegy",
                Passed = even >= rules.MinEvenCount
            });
        }

        return checks;
    }

    public static string? GenerateCode(CodeRules rules, HashSet<string> usedCodes)
    {
        if (!rules.HasAnyRule())
            return null;

        var digits = new int[5];
        if (BacktrackGenerate(0, digits, rules))
        {
            var code = string.Concat(digits);
            if (usedCodes.Add(code))
                return code;
        }

        for (var attempt = 0; attempt < 500; attempt++)
        {
            var digits2 = new int[5];
            if (BacktrackGenerate(0, digits2, rules, Random.Shared.Next(1000)))
            {
                var code = string.Concat(digits2);
                if (usedCodes.Add(code))
                    return code;
            }
        }

        return null;
    }

    private static bool BacktrackGenerate(int pos, int[] digits, CodeRules rules, int seed = 0)
    {
        if (pos == 5)
        {
            var code = string.Concat(digits);
            return Validate(code, rules).All(c => c.Passed);
        }

        var order = Enumerable.Range(0, 10).ToList();
        if (seed != 0)
            order = order.OrderBy(_ => Random.Shared.Next()).ToList();

        foreach (var d in order)
        {
            if (rules.NoZeroEnabled && d == 0)
                continue;

            digits[pos] = d;

            if (!IsPartialValid(digits, pos + 1, rules))
                continue;

            if (BacktrackGenerate(pos + 1, digits, rules, seed))
                return true;
        }

        return false;
    }

    private static bool IsPartialValid(int[] digits, int length, CodeRules rules)
    {
        var slice = digits.Take(length).ToArray();

        if (rules.MaxOccurrenceEnabled)
        {
            if (slice.GroupBy(d => d).Any(g => g.Count() > rules.MaxOccurrence))
                return false;
        }

        if (rules.AllUniqueEnabled)
        {
            if (slice.Length != slice.Distinct().Count())
                return false;
        }

        if (rules.SumEqualsEnabled)
        {
            var sum = slice.Sum();
            var minRemaining = (5 - length) * 0;
            var maxRemaining = (5 - length) * 9;
            if (sum + maxRemaining < rules.SumEquals || sum + minRemaining > rules.SumEquals)
                return false;
        }

        if (rules.MinEvenEnabled)
        {
            var even = slice.Count(d => d % 2 == 0);
            var maxEvenAdd = 5 - length;
            if (even + maxEvenAdd < rules.MinEvenCount)
                return false;
        }

        return true;
    }
}
