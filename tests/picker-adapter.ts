export let selected = "";
export function select(uri: string) {
  selected = uri;
}
export async function getDocumentAsync(_options?: unknown) {
  return selected
    ? { canceled: false, assets: [{ uri: selected }] }
    : { canceled: true };
}
export async function launchImageLibraryAsync(_options?: unknown) {
  return { canceled: true };
}
