export { getInfoAsync, readAsStringAsync, writeAsStringAsync, makeDirectoryAsync, deleteAsync, StorageAccessFramework, EncodingType } from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
export const pickBackup = () => DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
