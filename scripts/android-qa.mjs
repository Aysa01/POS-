import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const adb = resolve('.tools/android-sdk/platform-tools/adb.exe');
const serial = 'emulator-5554';
const app = 'com.pour.localpos';
const call = (...args) => execFileSync(adb, ['-s', serial, ...args], { encoding: 'utf8', timeout: 60000 }).trim();
const shell = (...args) => call('shell', ...args);
const decode = s => s.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
function nodes() {
  mkdirSync('.tools/qa', { recursive: true });
  shell('uiautomator', 'dump', '/sdcard/pour-qa.xml');
  call('pull', '/sdcard/pour-qa.xml', resolve('.tools/qa/ui.xml'));
  return [...readFileSync('.tools/qa/ui.xml', 'utf8').matchAll(/<node\b([^>]+)>/g)].map(([, source]) => Object.fromEntries([...source.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k, decode(v)])));
}
function find(label) {
  const matches = nodes().filter(n => n.text?.toLowerCase() === label.toLowerCase() || n['content-desc']?.toLowerCase() === label.toLowerCase());
  if (!matches.length) throw new Error(`No visible control: ${label}`);
  return matches.find(n => n.clickable === 'true') ?? matches[0];
}
function center(node) {
  const [x1, y1, x2, y2] = node.bounds.match(/\d+/g).map(Number);
  return [Math.round((x1 + x2) / 2), Math.round((y1 + y2) / 2)];
}
const [command, ...args] = process.argv.slice(2);
switch (command) {
  case 'install':
    console.log(call('install', '-r', resolve(args[0] ?? 'android/app/build/outputs/apk/release/app-release.apk')));
    console.log(shell('am', 'start', '-n', `${app}/.MainActivity`));
    break;
  case 'dump':
    console.log(nodes().filter(n => (n.text || n['content-desc']) && (!args[0] || new RegExp(args[0], 'i').test(`${n.text} ${n['content-desc']}`))).map(n => ({ text: n.text, label: n['content-desc'], bounds: n.bounds, class: n.class, enabled: n.enabled })));
    break;
  case 'tap':
    console.log(shell('input', 'tap', ...center(find(args[0])).map(String)));
    break;
  case 'wait': {
    const deadline = Date.now() + 30000;
    let found = false;
    while (Date.now() < deadline) {
      try { find(args[0]); found = true; break; } catch { await delay(500); }
    }
    if (!found) throw new Error(`Timed out waiting for ${args[0]}`);
    console.log(`Visible: ${args[0]}`);
    break;
  }
  case 'xy':
    console.log(shell('input', 'tap', args[0], args[1]));
    break;
  case 'fill':
    if (!/^[a-zA-Z0-9 ._-]+$/.test(args[1])) throw new Error('QA helper accepts simple test text only.');
    shell('input', 'tap', ...center(find(args[0])).map(String));
    shell('input', 'keycombination', '113', '29');
    shell('input', 'keyevent', '67');
    shell('input', 'text', args[1].replaceAll(' ', '%s'));
    shell('input', 'keyevent', '4');
    break;
  case 'swipe':
    console.log(shell('input', 'swipe', ...args));
    break;
  case 'drag':
    console.log(shell('input', 'draganddrop', ...args));
    break;
  case 'screen': {
    const name = args[0]; if (!/^[a-z0-9-]+$/.test(name)) throw new Error('Use a simple screenshot name.');
    await delay(750);
    mkdirSync('artifacts/screenshots', { recursive: true });
    shell('screencap', '-p', '/sdcard/pour-qa.png');
    console.log(call('pull', '/sdcard/pour-qa.png', resolve(`artifacts/screenshots/${name}.png`)));
    break;
  }
  case 'size':
    shell('wm', 'size', args[0]); shell('wm', 'density', args[1]);
    await delay(1000);
    break;
  case 'offline':
    console.log(shell('cmd', 'connectivity', 'airplane-mode', 'enable'));
    break;
  case 'restart':
    shell('am', 'force-stop', app); console.log(shell('am', 'start', '-n', `${app}/.MainActivity`));
    break;
  case 'logs':
    console.log(call('logcat', '-d', '-t', '300', '-s', 'ReactNativeJS', 'AndroidRuntime'));
    break;
  case 'status':
    console.log(shell('getprop', 'sys.boot_completed'));
    break;
  default:
    throw new Error('Use install, dump, tap, xy, fill, swipe, drag, screen, size, offline, restart, logs or status. Only the test emulator is targeted.');
}
