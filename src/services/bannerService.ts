import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  type Unsubscribe,
  type DocumentData,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { ServiceError, type ServiceResult, success, failure } from "@/lib/errors";
import { mapBanner, isBannerLive } from "@/lib/mappers";
import { bannerSchema, type BannerInput } from "@/lib/validation/schemas";
import type { BannerSlide } from "@/types";
import type { FirestoreBanner, FirestoreDoc } from "@/types/firestore";

function docToBanner(id: string, data: DocumentData): FirestoreDoc<FirestoreBanner> {
  return { id, ...(data as FirestoreBanner) };
}

export async function getBanners(): Promise<BannerSlide[]> {
  try {
    const db = getDb();
    const q = query(
      collection(db, COLLECTIONS.banners),
      orderBy("sortOrder", "asc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => mapBanner(docToBanner(d.id, d.data())))
      .filter(isBannerLive);
  } catch (error) {
    throw new ServiceError(
      error instanceof Error ? error.message : "Failed to fetch banners",
      "BANNERS_READ_FAILED"
    );
  }
}

export function subscribeToBanners(
  onData: (banners: BannerSlide[]) => void,
  onError: (error: string) => void
): Unsubscribe {
  try {
    const db = getDb();
    const q = query(
      collection(db, COLLECTIONS.banners),
      orderBy("sortOrder", "asc")
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const banners = snapshot.docs
          .map((d) => mapBanner(docToBanner(d.id, d.data())))
          .filter(isBannerLive);
        onData(banners);
      },
      (error) => onError(error.message)
    );
  } catch (error) {
    onError(error instanceof Error ? error.message : "Failed to subscribe to banners");
    return () => {};
  }
}

export function subscribeToAllBanners(
  onData: (banners: BannerSlide[]) => void,
  onError: (error: string) => void
): Unsubscribe {
  try {
    const db = getDb();
    const q = query(
      collection(db, COLLECTIONS.banners),
      orderBy("sortOrder", "asc")
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const banners = snapshot.docs.map((d) =>
          mapBanner(docToBanner(d.id, d.data()))
        );
        onData(banners);
      },
      (error) => onError(error.message)
    );
  } catch (error) {
    onError(error instanceof Error ? error.message : "Failed to subscribe to banners");
    return () => {};
  }
}

export async function reorderBanners(
  orderedIds: string[]
): Promise<ServiceResult<void>> {
  try {
    const db = getDb();
    await Promise.all(
      orderedIds.map((id, index) =>
        updateDoc(doc(db, COLLECTIONS.banners, id), { sortOrder: index + 1 })
      )
    );
    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to reorder banners");
  }
}

export async function createBanner(input: BannerInput): Promise<ServiceResult<BannerSlide>> {
  try {
    const parsed = bannerSchema.parse(input);
    const db = getDb();
    const ref = await addDoc(collection(db, COLLECTIONS.banners), parsed);
    const snap = await getDoc(ref);
    return success(mapBanner(docToBanner(snap.id, snap.data()!)));
  } catch (error) {
    return failure(error, "Failed to create banner");
  }
}

export async function updateBanner(
  id: string,
  input: Partial<BannerInput>
): Promise<ServiceResult<BannerSlide>> {
  try {
    const db = getDb();
    const ref = doc(db, COLLECTIONS.banners, id);
    await updateDoc(ref, input);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return failure(new ServiceError("Banner not found", "NOT_FOUND"));
    }
    return success(mapBanner(docToBanner(snap.id, snap.data())));
  } catch (error) {
    return failure(error, "Failed to update banner");
  }
}

export async function deleteBanner(id: string): Promise<ServiceResult<void>> {
  try {
    const db = getDb();
    await deleteDoc(doc(db, COLLECTIONS.banners, id));
    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to delete banner");
  }
}
