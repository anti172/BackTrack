namespace BackTrack.Services;

public static class AdminAuth
{
    public const string Username = "admin";
    public const string Password = "backtrack";
    public const string Token = "bt-admin-8f3k2m";

    public static bool IsValidToken(string? authHeader) =>
        authHeader is not null &&
        authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) &&
        authHeader["Bearer ".Length..].Trim() == Token;
}
