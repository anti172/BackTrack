# BackTrack — Didaktika mesteri óra

Bevezető backtracking feladat .NET 8 + React stackkel.

## Lokális fejlesztés

**Backend:**
```bash
cd BackTrack
dotnet run
```

**Frontend:**
```bash
cd client
npm install
npm run dev
```

→ Frontend: http://localhost:5173 (proxy → backend :5000)

## Órai bemutatás (ngrok + GitHub Pages)

Részletes lépések: **[DEPLOY.md](DEPLOY.md)**

1. Backend + `ngrok http 5000` a gépeden  
2. Frontend deploy GitHub Pages-re (`VITE_API_URL` = ngrok URL)  
3. Diákok a Pages linkről csatlakoznak  

## Admin belépés

- `/admin/login` — felhasználó: `admin`, jelszó: `backtrack`

## Használat

1. Diákok: név megadása → várakozó szoba  
2. Admin: csoportok + létszám → 1. szint indítása  
3. Csoportkód feltörése (zöld lock)  
4. Admin: 2. szint szabályokkal (összeg, max előfordulás, stb.)  

## Tech

- ASP.NET Core 8 + SignalR  
- React 18 + Vite + GitHub Pages  
- ngrok (backend tunnel órához)  
