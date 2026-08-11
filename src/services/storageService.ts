import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";
import { STORAGE_PATHS } from "@/lib/firebase/collections";
import { type ServiceResult, success, failure } from "@/lib/errors";

export function storagePathFromUrl(url: string): string | null {
  try {
    const decoded = decodeURIComponent(url);
    const match = decoded.match(/\/o\/(.+?)\?/);
    return match?.[1]?.replace(/%2F/g, "/") ?? null;
  } catch {
    return null;
  }
}

export async function uploadImageWithProgress(
  file: File,
  path: string,
  onProgress?: (percent: number) => void
): Promise<ServiceResult<string>> {
  try {
    const storage = getFirebaseStorage();
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    return await new Promise((resolve) => {
      task.on(
        "state_changed",
        (snapshot) => {
          const pct = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          onProgress?.(pct);
        },
        (error) => resolve(failure(error, "Upload failed")),
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(success(url));
        }
      );
    });
  } catch (error) {
    return failure(error, "Failed to upload image");
  }
}

export async function uploadProductImage(
  file: File,
  productId: string,
  onProgress?: (percent: number) => void
): Promise<ServiceResult<string>> {
  const ext = file.name.split(".").pop() ?? "jpg";
  return uploadImageWithProgress(
    file,
    `${STORAGE_PATHS.products}/${productId}/${Date.now()}.${ext}`,
    onProgress
  );
}

export async function uploadCategoryImage(
  file: File,
  categoryId: string,
  onProgress?: (percent: number) => void
): Promise<ServiceResult<string>> {
  const ext = file.name.split(".").pop() ?? "jpg";
  return uploadImageWithProgress(
    file,
    `${STORAGE_PATHS.categories}/${categoryId}/${Date.now()}.${ext}`,
    onProgress
  );
}

export async function uploadBannerImage(
  file: File,
  bannerId: string,
  onProgress?: (percent: number) => void
): Promise<ServiceResult<string>> {
  const ext = file.name.split(".").pop() ?? "jpg";
  return uploadImageWithProgress(
    file,
    `${STORAGE_PATHS.banners}/${bannerId}/${Date.now()}.${ext}`,
    onProgress
  );
}

export async function uploadModifierOptionImage(
  file: File,
  groupId: string,
  optionId: string,
  onProgress?: (percent: number) => void
): Promise<ServiceResult<string>> {
  const ext = file.name.split(".").pop() ?? "jpg";
  return uploadImageWithProgress(
    file,
    `${STORAGE_PATHS.modifiers}/${groupId}/${optionId}-${Date.now()}.${ext}`,
    onProgress
  );
}

export async function uploadSettingsImage(
  file: File,
  type: "logo" | "store",
  onProgress?: (percent: number) => void
): Promise<ServiceResult<string>> {
  const ext = file.name.split(".").pop() ?? "jpg";
  return uploadImageWithProgress(
    file,
    `${STORAGE_PATHS.settings}/${type}-${Date.now()}.${ext}`,
    onProgress
  );
}

export async function deleteImageByUrl(
  imageUrl: string
): Promise<ServiceResult<void>> {
  const path = storagePathFromUrl(imageUrl);
  if (!path) return success(undefined);
  try {
    const storage = getFirebaseStorage();
    await deleteObject(ref(storage, path));
    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to delete image");
  }
}

export async function deleteImage(path: string): Promise<ServiceResult<void>> {
  try {
    const storage = getFirebaseStorage();
    await deleteObject(ref(storage, path));
    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to delete image");
  }
}

export async function uploadTestImage(): Promise<
  ServiceResult<{ url: string; path: string }>
> {
  const testPath = `${STORAGE_PATHS.test}/connection-test-${Date.now()}.png`;
  const blob = new Blob(
    [
      new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0,
        0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73,
        68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0,
        0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
      ]),
    ],
    { type: "image/png" }
  );
  const file = new File([blob], "test.png", { type: "image/png" });
  const result = await uploadImageWithProgress(file, testPath);
  if (!result.success) return result;
  return success({ url: result.data, path: testPath });
}
