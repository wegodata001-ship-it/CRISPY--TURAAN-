import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type UploadTask,
} from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";
import { STORAGE_PATHS } from "@/lib/firebase/collections";
import { type ServiceResult, success, failure } from "@/lib/errors";

const STALL_MS = 25_000;

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

function firebaseStorageMessage(error: unknown): string {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: string }).code)
      : "";
  const message = error instanceof Error ? error.message : "Upload failed";
  console.error("[Storage] upload failed", { code, message, error });
  if (code === "storage/canceled") return "storage/canceled";
  if (code) return `${code}: ${message}`;
  return message;
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

async function assertStorageBucketExists() {
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  if (!bucket) {
    throw new Error("storage/unknown: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is missing");
  }
  const res = await fetch(
    `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o?maxResults=1`
  );
  if (res.status === 404) {
    throw new Error(
      "storage/unknown: Firebase Storage is not enabled. Open Firebase Console → Storage → Get Started, then try again."
    );
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
    await assertStorageBucketExists();
    const storage = getFirebaseStorage();
    const storageRef = ref(storage, path);
    const task: UploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || "image/jpeg",
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
            "storage/retry-limit-exceeded: no progress"
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
        (error) => finish(failure(error, firebaseStorageMessage(error))),
        async () => {
          try {
            onProgress?.(100);
            const url = await getDownloadURL(task.snapshot.ref);
            if (!url) {
              finish(failure(new Error("storage/object-not-found"), "storage/object-not-found"));
              return;
            }
            finish(success(url));
          } catch (error) {
            finish(failure(error, firebaseStorageMessage(error)));
          }
        }
      );
    });
  } catch (error) {
    return failure(error, firebaseStorageMessage(error));
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
