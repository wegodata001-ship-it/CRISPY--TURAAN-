import { listAll, ref, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";
import { STORAGE_PATHS } from "@/lib/firebase/collections";
import { type ServiceResult, success, failure } from "@/lib/errors";

export interface MediaFile {
  name: string;
  path: string;
  url: string;
  folder: string;
}

async function listFolder(prefix: string): Promise<MediaFile[]> {
  const storage = getFirebaseStorage();
  const folderRef = ref(storage, prefix);
  const result = await listAll(folderRef);
  const files: MediaFile[] = [];

  for (const item of result.items) {
    try {
      const url = await getDownloadURL(item);
      files.push({
        name: item.name,
        path: item.fullPath,
        url,
        folder: prefix,
      });
    } catch {
      // skip inaccessible files
    }
  }

  for (const sub of result.prefixes) {
    const subFiles = await listFolder(sub.fullPath);
    files.push(...subFiles);
  }

  return files;
}

export async function listMediaFiles(): Promise<ServiceResult<MediaFile[]>> {
  try {
    const folders = Object.values(STORAGE_PATHS).filter((f) => f !== "test");
    const all = await Promise.all(folders.map((f) => listFolder(f)));
    const files = all.flat().sort((a, b) => b.name.localeCompare(a.name));
    return success(files);
  } catch (error) {
    return failure(error, "Failed to list media files");
  }
}
