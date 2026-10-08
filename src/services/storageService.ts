import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type UploadTask,
} from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";
import { STORAGE_PATHS } from "@/lib/firebase/collections";
import { ServiceError, type ServiceResult, success, failure } from "@/lib/errors";
import { storageErrorTranslationKey } from "@/lib/storage/errors";

const STALL_MS = 25_000;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type UploadImageOptions = {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
};

function asOptions(
  value?: ((percent: number) => void) | UploadImageOptions
): UploadImageOptions {
  if (typeof value === "function") return { onProgress: value };
  return value ?? {};
}

function failUpload(error: unknown): ServiceResult<string> {
  return failure(error, storageErrorTranslationKey(error));
}

function assertUploadableFile(file: File) {
  if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
    throw new ServiceError("admin.upload.invalidType", "storage/invalid-format");
  }
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new ServiceError("admin.upload.tooLarge", "storage/invalid-format");
  }
}

export function storagePathFromUrl(url: string): string | null {
  try {
    const decoded = decodeURIComponent(url);
    const match = decoded.match(/\/o\/(.+?)\?/);
    return match?.[1]?.replace(/%2F/g, "/") ?? null;
  } catch {
    return null;
  }
}

/**
 * Best-effort probe. A 404 means Storage was never enabled.
 * CORS / network failures must not block the SDK upload — the SDK error is authoritative.
 */
async function assertStorageBucketExists() {
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  if (!bucket) {
    throw new ServiceError("admin.upload.storageNotReady", "storage/unconfigured");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(
      `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o?maxResults=1`,
      { method: "GET", signal: controller.signal }
    );
    if (res.status === 404) {
      throw new ServiceError("admin.upload.storageNotReady", "storage/bucket-not-found");
    }
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    // CORS, timeout, or offline — continue and let the Storage SDK report the real error.
  } finally {
    clearTimeout(timer);
  }
}

export async function uploadImageWithProgress(
  file: File,
  path: string,
  onProgressOrOptions?: ((percent: number) => void) | UploadImageOptions
): Promise<ServiceResult<string>> {
  const { onProgress, signal } = asOptions(onProgressOrOptions);
  if (signal?.aborted) {
    return failure(new Error("storage/canceled"), "storage/canceled");
  }

  try {
    assertUploadableFile(file);
    await assertStorageBucketExists();
    const storage = getFirebaseStorage();
    const storageRef = ref(storage, path);
    const task: UploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    return await new Promise((resolve) => {
      let lastBytes = 0;
      let lastMove = Date.now();
      let settled = false;

      const finish = (result: ServiceResult<string>) => {
        if (settled) return;
        settled = true;
        window.clearInterval(stallTimer);
        signal?.removeEventListener("abort", onAbort);
        resolve(result);
      };

      const onAbort = () => {
        try {
          task.cancel();
        } catch {
          /* already finished */
        }
      };

      const stallTimer = window.setInterval(() => {
        if (Date.now() - lastMove < STALL_MS) return;
        console.error("[Storage] upload stalled — no byte progress", {
          path,
          bytesTransferred: lastBytes,
          totalBytes: task.snapshot.totalBytes,
        });
        onAbort();
        finish(
          failure(
            new Error("storage/retry-limit-exceeded"),
            "admin.upload.stalled"
          )
        );
      }, 2000);

      signal?.addEventListener("abort", onAbort);

      task.on(
        "state_changed",
        (snapshot) => {
          if (snapshot.bytesTransferred > lastBytes) {
            lastBytes = snapshot.bytesTransferred;
            lastMove = Date.now();
          }
          const total = snapshot.totalBytes || file.size || 1;
          onProgress?.(Math.min(100, Math.round((snapshot.bytesTransferred / total) * 100)));
        },
        (error) => finish(failUpload(error)),
        async () => {
          try {
            onProgress?.(100);
            const url = await getDownloadURL(task.snapshot.ref);
            if (!url || url.startsWith("data:") || url.startsWith("blob:")) {
              finish(failUpload(new Error("storage/object-not-found")));
              return;
            }
            finish(success(url));
          } catch (error) {
            finish(failUpload(error));
          }
        }
      );
    });
  } catch (error) {
    return failUpload(error);
  }
}

export async function uploadProductImage(
  file: File,
  productId: string,
  onProgressOrOptions?: ((percent: number) => void) | UploadImageOptions
): Promise<ServiceResult<string>> {
  const ext = file.name.split(".").pop() ?? "jpg";
  return uploadImageWithProgress(
    file,
    `${STORAGE_PATHS.products}/${productId}/${Date.now()}.${ext}`,
    onProgressOrOptions
  );
}

export async function uploadCategoryImage(
  file: File,
  categoryId: string,
  onProgressOrOptions?: ((percent: number) => void) | UploadImageOptions
): Promise<ServiceResult<string>> {
  const ext = file.name.split(".").pop() ?? "jpg";
  return uploadImageWithProgress(
    file,
    `${STORAGE_PATHS.categories}/${categoryId}/${Date.now()}.${ext}`,
    onProgressOrOptions
  );
}

export async function uploadBannerImage(
  file: File,
  bannerId: string,
  onProgressOrOptions?: ((percent: number) => void) | UploadImageOptions
): Promise<ServiceResult<string>> {
  const ext = file.name.split(".").pop() ?? "jpg";
  return uploadImageWithProgress(
    file,
    `${STORAGE_PATHS.banners}/${bannerId}/${Date.now()}.${ext}`,
    onProgressOrOptions
  );
}

export async function uploadModifierOptionImage(
  file: File,
  groupId: string,
  optionId: string,
  onProgressOrOptions?: ((percent: number) => void) | UploadImageOptions
): Promise<ServiceResult<string>> {
  const ext = file.name.split(".").pop() ?? "jpg";
  return uploadImageWithProgress(
    file,
    `${STORAGE_PATHS.modifiers}/${groupId}/${optionId}-${Date.now()}.${ext}`,
    onProgressOrOptions
  );
}

export async function uploadSettingsImage(
  file: File,
  type: "logo" | "store",
  onProgressOrOptions?: ((percent: number) => void) | UploadImageOptions
): Promise<ServiceResult<string>> {
  const ext = file.name.split(".").pop() ?? "jpg";
  return uploadImageWithProgress(
    file,
    `${STORAGE_PATHS.settings}/${type}-${Date.now()}.${ext}`,
    onProgressOrOptions
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
    return failure(error, storageErrorTranslationKey(error));
  }
}

export async function deleteImage(path: string): Promise<ServiceResult<void>> {
  try {
    const storage = getFirebaseStorage();
    await deleteObject(ref(storage, path));
    return success(undefined);
  } catch (error) {
    return failure(error, storageErrorTranslationKey(error));
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
