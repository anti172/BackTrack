using System.Text.Json.Serialization;
using BackTrack.Hubs;
using BackTrack.Models;
using BackTrack.Services;
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddSingleton<SessionStore>();
builder.Services.AddSignalR();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
        if (origins.Length > 0)
            policy.WithOrigins(origins);
        else
            policy.SetIsOriginAllowed(_ => true);

        policy.AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseCors();

app.MapPost("/api/admin/login", (AdminLoginRequest req) =>
{
    if (req.Username == AdminAuth.Username && req.Password == AdminAuth.Password)
        return Results.Ok(new { token = AdminAuth.Token });

    return Results.Unauthorized();
});

app.MapGet("/api/session", (SessionStore store, HttpContext ctx) =>
{
    var state = store.GetState();
    var isAdmin = AdminAuth.IsValidToken(ctx.Request.Headers.Authorization);
    return Results.Ok(new
    {
        phase = state.Phase.ToString().ToLower(),
        groupCount = state.GroupCount,
        groupSize = state.GroupSize,
        groupCodes = isAdmin ? state.GroupCodes : null,
        level2Rules = state.Level2Rules,
        participants = state.Participants.Select(p => ToView(p)),
        groups = state.Groups
    });
});

app.MapPost("/api/join", async (JoinRequest req, SessionStore store, IHubContext<GameHub> hub) =>
{
    if (string.IsNullOrWhiteSpace(req.Name))
        return Results.BadRequest(new { error = "A név kötelező." });

    var participant = store.Join(req.Name.Trim());
    if (participant is null)
        return Results.BadRequest(new { error = "A játék már elindult, nem lehet csatlakozni." });

    await hub.Clients.Group("session").SendAsync("ParticipantJoined", ToView(participant));
    return Results.Ok(new { participantId = participant.Id, participant = ToView(participant) });
});

app.MapPost("/api/admin/start", async (StartRequest req, SessionStore store, IHubContext<GameHub> hub, HttpContext ctx) =>
{
    if (!AdminAuth.IsValidToken(ctx.Request.Headers.Authorization))
        return Results.Unauthorized();

    var (success, error) = store.StartHacking(req.GroupCount, req.GroupSize);
    if (!success)
        return Results.BadRequest(new { error });

    var state = store.GetState();
    await hub.Clients.Group("session").SendAsync("PhaseChanged", new
    {
        phase = "hacking",
        groupCount = state.GroupCount,
        groupSize = state.GroupSize,
        groupCodes = state.GroupCodes,
        participants = state.Participants.Select(p => ToView(p)),
        groups = state.Groups
    });

    return Results.Ok(new
    {
        phase = "hacking",
        groupCount = state.GroupCount,
        groupSize = state.GroupSize,
        groupCodes = state.GroupCodes,
        groups = state.Groups
    });
});

app.MapPost("/api/guess", async (GuessRequest req, SessionStore store, IHubContext<GameHub> hub) =>
{
    var result = store.SubmitGuess(req.ParticipantId, req.Guess);
    if (result is null)
        return Results.BadRequest(new { error = "Érvénytelen tipp vagy a játék nem fut." });

    await hub.Clients.Group("session").SendAsync("GuessSubmitted", new
    {
        participantId = req.ParticipantId,
        lockedPositions = result.LockedPositions,
        isHacked = result.IsHacked,
        guessCount = result.GuessCount
    });

    if (store.TryMarkGrouped())
    {
        var state = store.GetState();
        await hub.Clients.Group("session").SendAsync("GroupsAssigned", new
        {
            phase = "grouped",
            participants = state.Participants.Select(p => ToView(p)),
            groups = state.Groups
        });
    }

    return Results.Ok(result);
});

app.MapPost("/api/admin/start-level2", async (StartLevel2Request req, SessionStore store, IHubContext<GameHub> hub, HttpContext ctx) =>
{
    if (!AdminAuth.IsValidToken(ctx.Request.Headers.Authorization))
        return Results.Unauthorized();

    var (success, error) = store.StartLevel2(req.Rules);
    if (!success)
        return Results.BadRequest(new { error });

    var state = store.GetState();
    await hub.Clients.Group("session").SendAsync("Level2Started", new
    {
        phase = "level2hacking",
        level2Rules = state.Level2Rules,
        groupCodes = state.GroupCodes,
        participants = state.Participants.Select(p => ToView(p))
    });

    return Results.Ok(new { phase = "level2hacking", level2Rules = state.Level2Rules });
});

app.MapPost("/api/guess-level2", async (GuessRequest req, SessionStore store, IHubContext<GameHub> hub) =>
{
    var result = store.SubmitLevel2Guess(req.ParticipantId, req.Guess);
    if (result is null)
        return Results.BadRequest(new { error = "Érvénytelen tipp vagy a 2. szint nem fut." });

    await hub.Clients.Group("session").SendAsync("Level2GuessSubmitted", new
    {
        participantId = req.ParticipantId,
        lockedPositions = result.LockedPositions,
        isHacked = result.IsHacked,
        guessCount = result.GuessCount,
        ruleChecks = result.RuleChecks
    });

    if (store.TryMarkLevel2Complete())
    {
        var state = store.GetState();
        await hub.Clients.Group("session").SendAsync("Level2Complete", new
        {
            phase = "level2complete",
            participants = state.Participants.Select(p => ToView(p))
        });
    }

    return Results.Ok(result);
});

app.MapPost("/api/admin/reset", async (SessionStore store, IHubContext<GameHub> hub, HttpContext ctx) =>
{
    if (!AdminAuth.IsValidToken(ctx.Request.Headers.Authorization))
        return Results.Unauthorized();

    store.Reset();
    await hub.Clients.Group("session").SendAsync("SessionReset");
    return Results.Ok();
});

app.MapHub<GameHub>("/hubs/game");

app.Run();

static ParticipantView ToView(Participant p) => new()
{
    Id = p.Id,
    Name = p.Name,
    Specialty = p.Specialty,
    LockedPositions = p.LockedPositions,
    GuessCount = p.GuessCount,
    IsHacked = p.IsHacked,
    GroupNumber = p.GroupNumber
};
