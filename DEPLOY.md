# Órai bemutatás — backend nálad, frontend a neten

## Áttekintés

| Része | Hol fut | Ki éri el |
|--------|---------|-----------|
| **Backend** (.NET 8) | A te géped | `ngrok` → publikus HTTPS URL |
| **Frontend** (React) | GitHub Pages | Diákok + te (admin) |

---

## 1. Backend indítása (a gépeden)

```powershell
cd BackTrack
dotnet run
```

A backend a **5000-es porton** figyel minden interfészen (`0.0.0.0:5000`).

---

## 2. ngrok — backend kitétele a netre

Telepítés: https://ngrok.com/download

```powershell
ngrok http 5000
```

Másold ki a **Forwarding** sor HTTPS URL-jét, pl.:

`https://a1b2c3d4.ngrok-free.app`

> Ingyenes ngrok: első API hívásnál böngészőfigyelmezet lehet — a frontend automatikusan küldi a `ngrok-skip-browser-warning` fejlécet.

---

## 3. GitHub Pages — frontend

### Repo beállítások

1. GitHub repo → **Settings** → **Pages** → Source: **GitHub Actions**
2. **Secrets** → `VITE_API_URL` = a ngrok URL (pl. `https://a1b2c3d4.ngrok-free.app`, **perjel nélkül**)
3. **Variables** (opcionális) → `VITE_BASE_PATH` = `/BackTrack/`  
   (a repo neve; ha `username.github.io` repo, állítsd `/`-re)

### Deploy

Push a `main`/`master` ágra, vagy **Actions** → **Deploy frontend to GitHub Pages** → Run workflow.

A diákok ezt a linket kapják (példa):

`https://<felhasználó>.github.io/BackTrack/`

---

## 4. Óra közben

1. `dotnet run` + `ngrok http 5000` fut a gépeden
2. Ha az ngrok URL **megváltozott** (újraindítás után): frissítsd a `VITE_API_URL` secretet és futtasd újra a deploy workflow-t (vagy lokálisan build + manuális feltöltés)
3. Te: GitHub Pages URL + `/admin/login` (`admin` / `backtrack`)
4. Diákok: GitHub Pages főoldal → név → csatlakozás

### Lokális teszt távoli backenddel

`client/.env.local`:

```
VITE_API_URL=https://xxxx.ngrok-free.app
```

```powershell
cd client
npm run dev
```

---

## 5. Gyors ellenőrzés

- Böngészőben: `https://<ngrok-url>/api/session` → JSON
- GitHub Pages oldal betölt → csatlakozás működik
- Admin: résztvevők listája frissül

---

## Hibaelhárítás

| Probléma | Megoldás |
|----------|----------|
| CORS hiba | Backend újraindítás; ngrok URL egyezzen a secret-tel |
| SignalR nem csatlakozik | ngrok URL https legyen; ugyanaz mint `VITE_API_URL` |
| Üres oldal GitHub Pages-en | `VITE_BASE_PATH` egyezzen a repo nevével (`/BackTrack/`) |
| „Failed to fetch” | ngrok fut-e? Backend fut-e? |
