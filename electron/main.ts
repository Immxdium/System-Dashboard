import { execSync } from 'node:child_process';
import { app, BrowserWindow, ipcMain } from 'electron';
import * as os from 'node:os';
import * as path from 'node:path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#000000',
    titleBarStyle: 'hidden',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    void mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

/* ── IPC: system stats ── */
let prevCPUTimes: { idle: number; total: number }[] | null = null;

ipcMain.handle('get-system-stats', () => {
  const cpus = os.cpus();

  const curTimes = cpus.map((cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    return { idle: cpu.times.idle, total };
  });

  let cpuLoad = 0;
  if (prevCPUTimes) {
    const deltas = curTimes.map((cur, i) => {
      const prev = prevCPUTimes![i];
      const dTotal = cur.total - prev.total;
      const dIdle = cur.idle - prev.idle;
      return dTotal > 0 ? ((dTotal - dIdle) / dTotal) * 100 : 0;
    });
    cpuLoad = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  }
  prevCPUTimes = curTimes;

  return {
    cpuLoad,
    cpuCount: cpus.length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    uptime: os.uptime(),
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    loadavg: os.loadavg(),
  };
});

/* ── IPC: process list ── */
ipcMain.handle('get-processes', () => {
  try {
    if (process.platform === 'win32') {
      const raw = execSync(
        'powershell -command "Get-Process | Sort-Object CPU -Descending | Select-Object -First 15 Name,Id,CPU,WorkingSet | ConvertTo-Json"',
        { encoding: 'utf-8', timeout: 3000 },
      );
      const parsed = JSON.parse(raw) as unknown;
      const rows: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
      return rows.map((r: any) => ({
        name: (r.Name ?? 'unknown') + '.exe',
        pid: r.Id ?? 0,
        cpu: parseFloat(r.CPU ?? 0),
        mem: Math.round((r.WorkingSet ?? 0) / 1024 / 1024),
      }));
    }
    const raw = execSync(
      "ps aux --sort=-%cpu | awk 'NR>1 && NR<=16 {print $1\"|\"$2\"|\"$3\"|\"$6}' | head -15",
      { encoding: 'utf-8', timeout: 3000 },
    );
    return raw
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [user, pid, cpu, mem] = line.split('|');
        return {
          name: user || 'proc',
          pid: parseInt(pid || '0', 10) || 0,
          cpu: parseFloat(cpu || '0') || 0,
          mem: Math.round((parseInt(mem || '0', 10) || 0) / 1024),
        };
      });
  } catch {
    return [];
  }
});
