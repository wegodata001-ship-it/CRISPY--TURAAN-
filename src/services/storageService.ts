import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";
import { STORAGE_PATHS } from "@/lib/firebase/collections";
import { type ServiceResult, success, failure } from "@/lib/errors";

export async function uploadImage(
  file: Blob | Uint8Array | ArrayBuffer,
  path: string,
  contentType = "image/png"
): Promise<ServiceResult<string>> {
  try {
    const storage = getFirebaseStorage();
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, { contentType });
    const url = await getDownloadURL(storageRef);
    return success(url);
  } catch (error) {
    return failure(error, "Failed to upload image");
  }
}

export async function uploadProductImage(
  file: Blob | Uint8Array | ArrayBuffer,
  productId: string,
  contentType = "image/png"
): Promise<ServiceResult<string>> {
  return uploadImage(file, `${STORAGE_PATHS.products}/${productId}/${Date.now()}`, contentType);
}

export async function deleteImage(path: string): Promise<ServiceResult<void>> {
  try {
    const storage = getFirebaseStorage();
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to delete image");
  }
}

export async function uploadTestImage(): Promise<ServiceResult<{ url: string; path: string }>> {
  const testPath = `${STORAGE_PATHS.test}/connection-test-${Date.now()}.png`;
  const pngBuffer = new Uint8Array([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1,
    0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84,
    120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78,
    68, 174, 66, 96, 130,
  ]);

  const uploadResult = await uploadImage(pngBuffer, testPath, "image/png");
  if (!uploadResult.success) return uploadResult;

  return success({ url: uploadResult.data, path: testPath });
}
