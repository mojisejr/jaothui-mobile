import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type { MobileCertificateImage } from "@/types/mobile-api";

function certificateFileName(certificate: MobileCertificateImage) {
  return `jaothui-certificate-${certificate.microchip}-${certificate.tokenId}.jpg`;
}

function downloadOnWeb(certificate: MobileCertificateImage) {
  if (typeof document === "undefined") {
    throw new Error("ไม่สามารถดาวน์โหลดไฟล์บน runtime นี้ได้");
  }

  const link = document.createElement("a");
  link.href = `data:${certificate.mimeType};base64,${certificate.imageBase64}`;
  link.download = certificateFileName(certificate);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function shareOrDownloadCertificate(certificate: MobileCertificateImage) {
  if (Platform.OS === "web") {
    downloadOnWeb(certificate);
    return;
  }

  const file = new File(Paths.cache, certificateFileName(certificate));
  if (file.exists) {
    file.delete();
  }
  file.create({ intermediates: true, overwrite: true });
  file.write(certificate.imageBase64, { encoding: "base64" });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("เครื่องนี้ไม่รองรับการแชร์ไฟล์ใบรับรอง");
  }

  await Sharing.shareAsync(file.uri, {
    dialogTitle: "บันทึกหรือแชร์ใบรับรอง JAOTHUI",
    mimeType: certificate.mimeType,
    UTI: "public.jpeg",
  });
}
