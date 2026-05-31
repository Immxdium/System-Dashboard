# SysMonitor Pro

**Tactical HUD System Resource Monitor**
Electron + React + TypeScript + shadcn/ui + Tailwind CSS

A cross-platform desktop application that streams live CPU, memory, load
average, network, and process telemetry from the host machine and renders
it in a four-panel tactical-HUD style dashboard.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Electron Main Process  (electron/main.ts)                  │
│  • Spawns frameless BrowserWindow                          │
│  • Polls node:os every 1000 ms                              │
│  • Top processes via `ps -axo` (darwin/linux)              │
│  • Sends metrics:update over IPC                           │
└──────────────────┬──────────────────────────────────────────┘
                   │ contextBridge
┌──────────────────▼──────────────────────────────────────────┐
│ Preload  (electron/preload.ts)                             │
│  • Exposes window.sysmon (sandboxed, contextIsolation:on)  │
└──────────────────┬──────────────────────────────────────────┘
                   │ window.sysmon
┌──────────────────▼──────────────────────────────────────────┐
│ Renderer  (React 18 + Vite)                                │
│  • 4 swipeable panels: Vitals / Graphs / System / Process  │
│  • Animated SVG arc gauges, sparklines, per-core bars      │
│  • shadcn/ui (Radix) primitives + custom HUD components    │
└─────────────────────────────────────────────────────────────┘
```

## Run it

```bash
npm install
npm run dev
```

Vite serves the renderer at `http://localhost:5173`; once it's reachable,
`tsc` compiles the Electron sources and `electron` launches the desktop
window pointed at the dev server. Hot module reload is active.

## Build distributable binaries

```bash
npm run build
```

`electron-builder` produces:

- macOS — `release/SysMonitor Pro-<ver>.dmg`
- Windows — `release/SysMonitor Pro Setup <ver>.exe` (NSIS)
- Linux — `release/SysMonitor Pro-<ver>.AppImage`

(You can only produce installers for your current host platform without
cross-compile toolchains — that's expected.)

## Panel controls

| Action                     | Input                          |
| -------------------------- | ------------------------------ |
| Next panel                 | `→` or `PageDown` or swipe ←   |
| Previous panel             | `←` or `PageUp` or swipe →     |
| Jump to panel 1–4          | `1` / `2` / `3` / `4`          |
| Click dot at the bottom    | Mouse                          |

## What the panels show

1. **Vitals** — Large CPU and Memory arc gauges, three load averages
   (1m / 5m / 15m) with per-core context, and a live uptime counter.
2. **Graphs** — 60-second rolling sparklines for CPU, memory, and
   load-average, plus a per-core utilization breakdown.
3. **System** — Hardware profile (CPU model, cores, RAM), OS / kernel /
   arch / hostname / user, and all non-internal network interfaces with
   addresses and MACs.
4. **Process** — Top 8 processes by CPU usage with PID, command, CPU %,
   memory %, and a status badge.

## Security posture

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false`
  (sandbox is off only because the preload uses Node-style `require` for
  `electron`; the renderer is still fully isolated from Node).
- A `contextBridge`-exposed `window.sysmon` is the only surface the
  renderer can reach the main process through.
- CSP set via `<meta http-equiv>` in `index.html`.
- `setWindowOpenHandler` redirects all external links to the system
  browser; `will-navigate` is blocked outside the dev server.

## Project layout

```
.
├── electron/
│   ├── main.ts           # main process — IPC, system polling, window
│   └── preload.ts        # contextBridge surface
├── src/
│   ├── App.tsx           # 4-panel swipeable shell
│   ├── main.tsx          # React 18 root
│   ├── globals.css       # Tailwind base + HUD utility classes
│   ├── lib/utils.ts      # cn(), formatBytes, formatUptime, clamp
│   ├── types/electron.d.ts
│   ├── components/
│   │   ├── ui/           # shadcn primitives (card, badge, progress…)
│   │   ├── hud/          # ArcGauge, Sparkline, TitleBar, PanelDots
│   │   └── panels/       # Vitals, Graphs, SystemInfo, Process
├── tailwind.config.js
├── tsconfig.json         # renderer (Vite, jsx-react, alias @/*)
├── tsconfig.electron.json # main process (commonjs → dist/electron)
├── vite.config.ts
└── package.json          # scripts + electron-builder config
```

## Notes for future work

- Disk I/O bytes-per-second require platform-specific commands
  (`iostat -d`, `cat /proc/diskstats`, `wmic logicaldisk`). The current
  build intentionally stays inside `node:os` to keep the dep surface
  small; wire those into `electron/main.ts` if needed.
- Network throughput similarly needs sampling (`netstat -ib` on darwin
  or parsing `/proc/net/dev`). The system panel currently lists active
  interfaces rather than measuring traffic.
- The renderer falls back to **synthetic telemetry** if `window.sysmon`
  is undefined, so `vite preview` shows a working demo without Electron.
