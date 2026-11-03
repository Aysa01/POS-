import * as ImagePicker from "expo-image-picker";
import * as FS from "expo-file-system/legacy";
import * as Crypto from "expo-crypto";

export const imagesDirectory = () => `${FS.documentDirectory}products/`;
export async function saveImageData(base64: string): Promise<string> {
  await FS.makeDirectoryAsync(imagesDirectory(), { intermediates: true });
  const uri = `${imagesDirectory()}${Crypto.randomUUID()}.jpg`;
  await FS.writeAsStringAsync(uri, base64, { encoding: FS.EncodingType.Base64 });
  return uri;
}
export async function pickProductImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.75,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const info = await FS.getInfoAsync(asset.uri);
  if (!info.exists || (info.size ?? 0) > 5 * 1024 * 1024)
    throw new Error("Choose a photo smaller than 5 MB.");
  await FS.makeDirectoryAsync(imagesDirectory(), { intermediates: true });
  const dest = `${imagesDirectory()}${Crypto.randomUUID()}.jpg`;
  await FS.copyAsync({ from: asset.uri, to: dest });
  return dest;
}
