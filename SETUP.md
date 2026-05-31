# SysMonitor Pro — Local setup

This guide walks through cloning the project, installing dependencies, and running the app on your machine.

---

## What you need

| Requirement | Notes |
|-------------|--------|
| **Node.js** | **v18 LTS or newer** (v20+ recommended). [Download Node](https://nodejs.org/) or install via [nvm](https://github.com/nvm-sh/nvm). |
| **npm** | Comes with Node.js. This repo uses `npm` for scripts (`package-lock.json`). |
| **Git** | To clone the repository. |

**Platform notes**

- **macOS / Linux:** Full desktop app features (system stats via IPC, process list) work as implemented in `electron/main.ts`.
- **Windows:** Process listing uses PowerShell; ensure you can run PowerShell scripts if builds are restricted on your machine.

---

## 1. Clone the repository

Replace the URL with your fork or this project’s GitHub URL.

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

If the path contains spaces, quote it:

```bash
cd "/path/to/System Dashboard"
```

---

## 2. Install dependencies

From the project root (the folder that contains `package.json`):

```bash
npm install
```

**What to expect**

- Downloads JavaScript dependencies into `node_modules/`.
- **`electron`** runs a post-install step that downloads the Electron binary. Keep internet access enabled.
- First run may take a few minutes.

If `npm install` fails with permission or cache errors, try:

```bash
npm cache verify
npm install
```

---

## 3. Run in development

### Option A — Full desktop app (recommended)

Starts the Vite dev server and opens Electron pointed at `http://localhost:5173`.

```bash
npm run dev
```

- **Renderer (UI):** [http://localhost:5173](http://localhost:5173) — you can open this in a browser to preview the React UI. Live metrics from the OS require **`window.electronAPI`**, which only exists inside Electron (via `electron/preload.ts`). In the browser alone, the app falls back to simulated / partial behavior depending on `App.tsx`.
- **Electron:** Opens after Vite is ready; DevTools may open in development.

### Option B — Web UI only (no Electron)

Useful for quick UI work without the desktop shell:

```bash
npm run dev:react
```

Then open [http://localhost:5173](http://localhost:5173).

---

## 4. Useful commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite + Electron together |
| `npm run dev:react` | Vite only (port **5173**) |
| `npm run typecheck` | TypeScript check (renderer + Electron) |
| `npm run build:react` | Production build of the web assets → `dist/renderer/` |
| `npm run build:electron` | Compile `electron/*.ts` → `dist/electron/` |
| `npm run build` | Full production build + pack installers via `electron-builder` → `release/` |
| `npm run preview` | Local preview of the **built** renderer (not the same as `dev`) |

---

## 5. Production build (installers)

Build the UI, compile Electron, then create a platform installer:

```bash
npm run build
```

Artifacts appear under **`release/`** (for example `.dmg` on macOS, `.exe` on Windows, `.AppImage` on Linux).  
`electron-builder` normally builds for **the OS you are running on** unless you add cross-platform tooling.

**macOS:** Code signing and notarization are **not** configured in this template; Gatekeeper may warn on first open until you sign/notarize for distribution.

---

## 6. Project layout (quick reference)

```
├── electron/
│   ├── main.ts      # Electron main process (window, IPC, OS stats)
│   └── preload.ts   # Exposes electronAPI to the renderer (contextBridge)
├── src/
│   ├── main.tsx     # Vite entry — mounts React
│   ├── App.tsx      # Main UI
│   └── globals.css  # Global styles + Tailwind
├── index.html       # Vite HTML entry (loads /src/main.tsx)
├── vite.config.ts
├── tsconfig.json           # Renderer TypeScript
├── tsconfig.electron.json  # Electron main/preload TypeScript
└── package.json
```

---

## 7. Troubleshooting

### Port 5173 already in use

Another app may be using the port. Either stop that process or change the port in `vite.config.ts` (`server.port`) and update `electron/main.ts` dev URL to match.

### Blank page at http://localhost:5173/

Ensure `index.html` loads **`/src/main.tsx`** (React bootstrap), not Electron main-process code. The React entry should call `createRoot` and render `<App />`.

### `npm install` / Electron errors

- Use a supported Node version (18+).
- Allow network access for the Electron download.
- On restricted networks, configure npm proxy settings if your organization requires it.

### Real system data only in Electron

IPC is wired through `preload.ts` (`electronAPI`). Open the app with **`npm run dev`** (or a production build) for full desktop integration.

### Git + HTTPS vs SSH

If a dependency or tool tries to clone via `git@github.com` and you see “Permission denied (publickey)”, either [set up SSH keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh) or configure Git to use HTTPS for GitHub URLs.

---

## 8. Environment variables

This template does **not** require a `.env` file to run locally. If you add API keys or secrets later, use `.env` / `.env.local` and **do not** commit them (they are listed in `.gitignore`).

---

For architecture and feature overview, see **[README.md](./README.md)**.
