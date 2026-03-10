import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

export type PickedFile = { uri: string; filename: string; mimeType: string };

export async function pickImage(): Promise<PickedFile | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ 
    mediaTypes: ImagePicker.MediaTypeOptions.Images, 
    quality: 0.8,
    allowsEditing: true,
    aspect: [1, 1],
  });
  if (result.canceled) return null;
  const a = result.assets[0];
  return { uri: a.uri, filename: a.fileName ?? `image-${Date.now()}.jpg`, mimeType: a.mimeType ?? "image/jpeg" };
}

export async function pickVideo(): Promise<PickedFile | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos });
  if (result.canceled) return null;
  const a = result.assets[0];
  return { uri: a.uri, filename: a.fileName ?? `video-${Date.now()}.mp4`, mimeType: a.mimeType ?? "video/mp4" };
}

export async function takePhoto(): Promise<PickedFile | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchCameraAsync({ 
    quality: 0.8,
    allowsEditing: true,
    aspect: [1, 1],
  });
  if (result.canceled) return null;
  const a = result.assets[0];
  return { uri: a.uri, filename: a.fileName ?? `photo-${Date.now()}.jpg`, mimeType: a.mimeType ?? "image/jpeg" };
}

export async function pickDocument(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
  if (result.canceled) return null;
  const a = result.assets[0];
  return { uri: a.uri, filename: a.name, mimeType: a.mimeType ?? "application/octet-stream" };
}
