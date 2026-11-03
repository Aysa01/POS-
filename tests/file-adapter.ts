export const files = new Map<string, Uint8Array>();
export const documentDirectory = "file:///private/";
export const EncodingType = { Base64: "base64" };
export let lastExport = "";
export async function getInfoAsync(uri: string) {
  return { exists: files.has(uri), size: files.get(uri)?.length ?? 0 };
}
export async function readAsStringAsync(
  uri: string,
  options?: { encoding?: string },
) {
  const bytes = files.get(uri);
  if (!bytes) throw new Error("File not found");
  return Buffer.from(bytes).toString(
    options?.encoding === "base64" ? "base64" : "utf8",
  );
}
export async function writeAsStringAsync(
  uri: string,
  contents: string,
  options?: { encoding?: string },
) {
  files.set(
    uri,
    new Uint8Array(
      Buffer.from(contents, options?.encoding === "base64" ? "base64" : "utf8"),
    ),
  );
}
export async function makeDirectoryAsync(_uri: string, _options?: unknown) {}
export async function deleteAsync(uri: string, _options?: unknown) {
  files.delete(uri);
}
export const StorageAccessFramework = {
  requestDirectoryPermissionsAsync: async () => ({
    granted: true,
    directoryUri: "content://chosen-folder",
  }),
  createFileAsync: async (_directory: string, name: string, _mime: string) => {
    lastExport = `content://chosen-folder/${name}`;
    return lastExport;
  },
};
