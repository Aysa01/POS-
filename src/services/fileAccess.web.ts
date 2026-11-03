const pickedFiles = new Map<string, File>();
export const EncodingType = { Base64: 'base64' } as const;
export function chooseFile(accept: string): Promise<File | null> {
  return new Promise(resolve => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = accept;
    input.style.display = 'none'; document.body.appendChild(input);
    const done = (file: File | null) => { input.remove(); resolve(file); };
    input.onchange = () => done(input.files?.[0] ?? null);
    input.oncancel = () => done(null);
    input.click();
  });
}
export async function pickBackup() {
  const file = await chooseFile('.pour,application/octet-stream,application/json');
  if (!file) return { canceled: true as const, assets: null };
  const uri = `browser-file:${crypto.randomUUID()}`; pickedFiles.set(uri, file);
  return { canceled: false as const, assets: [{ uri }] };
}
export async function getInfoAsync(uri: string) {
  const file = pickedFiles.get(uri);
  if (file) return { exists: true as const, size: file.size };
  if (uri.startsWith('data:image/')) return { exists: true as const, size: Math.floor(uri.split(',')[1].length * 3 / 4) };
  return { exists: false as const, size: 0 };
}
export async function readAsStringAsync(uri: string, options?: { encoding?: string }): Promise<string> {
  if (uri.startsWith('data:image/')) return uri.slice(uri.indexOf(',') + 1);
  const file = pickedFiles.get(uri); if (!file) throw new Error('Choose the backup file again.');
  return file.text();
}
export async function writeAsStringAsync(uri: string, value: string) {
  if (!uri.startsWith('download:')) throw new Error('Unsupported browser file location.');
  const blob = new Blob([value], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = uri.slice('download:'.length); document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function makeDirectoryAsync(_uri: string, _options?: unknown) {}
export async function deleteAsync(uri: string, _options?: unknown) { pickedFiles.delete(uri); }
export const StorageAccessFramework = {
  requestDirectoryPermissionsAsync: async () => ({ granted: true, directoryUri: 'browser-downloads' }),
  createFileAsync: async (_directory: string, name: string, _mime: string) => `download:${name}`,
};
