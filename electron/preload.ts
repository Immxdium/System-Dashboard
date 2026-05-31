import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
    getProcesses: () => ipcRenderer.invoke('get-processes'),
});