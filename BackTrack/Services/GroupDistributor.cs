namespace BackTrack.Services;

public static class GroupDistributor
{
    /// <summary>
    /// Egyenletes osztás: pl. 17 fő, 5 csoport → 4, 4, 3, 3, 3
    /// </summary>
    public static int[] ComputeSizes(int participantCount, int groupCount)
    {
        var baseSize = participantCount / groupCount;
        var remainder = participantCount % groupCount;
        var sizes = new int[groupCount];
        for (var i = 0; i < groupCount; i++)
            sizes[i] = baseSize + (i < remainder ? 1 : 0);
        return sizes;
    }
}
