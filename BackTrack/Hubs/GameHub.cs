using Microsoft.AspNetCore.SignalR;

namespace BackTrack.Hubs;

public class GameHub : Hub
{
    public async Task JoinSession() =>
        await Groups.AddToGroupAsync(Context.ConnectionId, "session");
}
