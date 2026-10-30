import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { File } from "expo-file-system";
import { Platform } from "react-native";
import { PHOTO_LIMIT, type PickedPhoto } from "./photos";
export async function selectApplicantPhoto(camera: boolean): Promise<PickedPhoto | null> {
  const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error(camera ? "ยังไม่ได้อนุญาตกล้อง กรุณาอนุญาตในตั้งค่าอุปกรณ์ หรือเลือกรูปจากคลัง" : "ยังไม่ได้อนุญาตรูปภาพ กรุณาอนุญาตในตั้งค่าอุปกรณ์แล้วลองอีกครั้ง");
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: false, quality: 1, exif: false, allowsMultipleSelection: false };
  const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  return result.canceled || !result.assets[0] ? null : result.assets[0];
}
export async function readApplicantBytes(uri: string) {
  if (Platform.OS === "web") return new Uint8Array(await (await fetch(uri)).arrayBuffer());
  return new File(uri).bytes();
}
export async function normalizeApplicantPhoto(photo: PickedPhoto): Promise<PickedPhoto> {
  if (!photo.uri || !Number.isFinite(photo.width) || !Number.isFinite(photo.height) || photo.width < 1 || photo.height < 1) throw new Error("ไม่สามารถอ่านภาพนี้ได้ กรุณาเลือกภาพอื่น");
  for (const [edge, quality] of [[1800, 0.85], [1400, 0.7], [1000, 0.55]]) {
    const scale = Math.min(1, edge / Math.max(photo.width, photo.height));
    const output = await manipulateAsync(photo.uri, [{ resize: { width: Math.max(1, Math.round(photo.width * scale)), height: Math.max(1, Math.round(photo.height * scale)) } }], { compress: quality, format: SaveFormat.JPEG });
    const bytes = await readApplicantBytes(output.uri);
    if (bytes.length <= PHOTO_LIMIT && bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return output;
  }
  throw new Error("ลดขนาดภาพให้ไม่เกิน 4 MiB ไม่สำเร็จ กรุณาเลือกภาพอื่น");
}
