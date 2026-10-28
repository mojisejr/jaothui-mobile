import { selectApplicantPhoto, normalizeApplicantPhoto } from "../nativePhotos";
import * as Picker from "expo-image-picker";
import * as Manipulator from "expo-image-manipulator";
const mockBytes = jest.fn();
jest.mock("expo-image-picker", () => ({ requestCameraPermissionsAsync: jest.fn(), requestMediaLibraryPermissionsAsync: jest.fn(), launchCameraAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
jest.mock("expo-image-manipulator", () => ({ manipulateAsync: jest.fn(), SaveFormat: { JPEG: "jpeg" } }));
jest.mock("expo-file-system", () => ({ File: jest.fn(() => ({ bytes: mockBytes })) }));
describe("SDK54 image preparation boundary", () => {
  it("asks only camera/images permissions; cancel does not normalize or upload", async () => {
    (Picker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
    await expect(selectApplicantPhoto(true)).rejects.toThrow("อนุญาตกล้อง"); expect(Picker.launchCameraAsync).not.toHaveBeenCalled();
    (Picker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true, accessPrivileges: "limited" }); (Picker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true });
    expect(await selectApplicantPhoto(false)).toBeNull(); expect(Picker.launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ["images"], exif: false }));
  });
  it("converts HEIC/phoneURI to boundedJPEG and retries compression before refusingoversize", async () => {
    (Manipulator.manipulateAsync as jest.Mock).mockResolvedValue({ uri: "file:///converted.jpg", width: 1800, height: 1200 });
    mockBytes.mockResolvedValueOnce(new Uint8Array(4 * 1024 * 1024 + 1)).mockResolvedValueOnce(new Uint8Array([255, 216, 255, 1]));
    expect((await normalizeApplicantPhoto({ uri: "file:///camera.heic", width: 6000, height: 4000 })).uri).toBe("file:///converted.jpg");
    expect(Manipulator.manipulateAsync).toHaveBeenCalledWith("file:///camera.heic", expect.any(Array), { compress: 0.85, format: "jpeg" }); expect(Manipulator.manipulateAsync).toHaveBeenCalledTimes(2);
    mockBytes.mockResolvedValue(new Uint8Array(4 * 1024 * 1024 + 1));
    await expect(normalizeApplicantPhoto({ uri: "file:///bad.heic", width: 6000, height: 4000 })).rejects.toThrow("4 MiB");
  });
});
