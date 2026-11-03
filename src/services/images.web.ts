import { chooseFile } from './fileAccess.web';
export const imagesDirectory = () => 'browser-images/';
export async function pickProductImage(): Promise<string | null> {
  const file = await chooseFile('image/jpeg,image/png,image/webp');
  if (!file) return null;
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose a photo smaller than 5 MB.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP image.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('The photo could not be read.'));
    reader.readAsDataURL(file);
  });
}
export async function saveImageData(bytes: string): Promise<string> {
  const mime = bytes.startsWith('iVBOR') ? 'image/png' : bytes.startsWith('UklGR') ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${bytes}`;
}
