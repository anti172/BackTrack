using Microsoft.AspNetCore.SignalR;

namespace BackTrack.Hubs;

public class GameHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "session");
        await base.OnConnectedAsync();
    }

    public async Task JoinSession() =>
        await Groups.AddToGroupAsync(Context.ConnectionId, "session");
}
