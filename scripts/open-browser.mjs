import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

if (process.platform !== 'win32') throw new Error('Open http://localhost:8081 in your browser.');
const profile = resolve(process.env.LOCALAPPDATA, 'PourPOS', 'BrowserProfile');
mkdirSync(profile, { recursive: true });
const candidates = [resolve(process.env['ProgramFiles(x86)'] ?? 'C:/Program Files (x86)', 'Microsoft/Edge/Application/msedge.exe'), resolve(process.env.ProgramFiles ?? 'C:/Program Files', 'Microsoft/Edge/Application/msedge.exe')];
const edge = candidates.find(existsSync);
if (!edge) throw new Error('Microsoft Edge was not found. Open http://localhost:8081 in your browser.');
const browser = spawn(edge, [`--user-data-dir=${profile}`, '--new-window', '--start-maximized', '--no-first-run', '--no-default-browser-check', 'http://localhost:8081'], { detached: true, stdio: 'ignore', windowsHide: false });
browser.unref();
console.log('Opened Rositrus in a full-size Edge window: http://localhost:8081');
console.log('This dedicated local browser profile keeps counter data outside OneDrive.');
