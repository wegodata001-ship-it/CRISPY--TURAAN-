import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { COLLECTIONS as APP_COLLECTIONS } from "@/lib/firebase/collections";
import { sanitizeFirestoreData } from "@/lib/firebase/sanitize-firestore-data";
import type {
  PdfMenuTemplate,
  PdfMenuCategorySetting,
  PdfMenuProductSetting,
  PdfMenuPageRecord,
} from "@/types/pdf-menu";
import {
  DEFAULT_COVER_SETTINGS,
  DEFAULT_FOOTER_SETTINGS,
  DEFAULT_QR_SETTINGS,
} from "@/types/pdf-menu";

const COLLECTIONS = {
  templates: APP_COLLECTIONS.pdfMenuTemplates,
  categorySettings: APP_COLLECTIONS.pdfMenuCategorySettings,
  productSettings: APP_COLLECTIONS.pdfMenuProductSettings,
  pages: APP_COLLECTIONS.pdfMenuPages,
};

export async function getTemplates(): Promise<PdfMenuTemplate[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, COLLECTIONS.templates));
  return snap.docs
    .map((d) => ({
      id: d.id,
      arrangeMode: "auto" as const,
      ...d.data(),
    } as PdfMenuTemplate))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function getTemplate(id: string): Promise<PdfMenuTemplate | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, COLLECTIONS.templates, id));
  if (!snap.exists()) return null;
  return { id: snap.id, arrangeMode: "auto", ...snap.data() } as PdfMenuTemplate;
}

export async function createTemplate(name: string): Promise<PdfMenuTemplate> {
  const db = getDb();
  const ref = doc(collection(db, COLLECTIONS.templates));
  const data = {
    name,
    active: true,
    language: "ar" as const,
    direction: "rtl" as const,
    arrangeMode: "auto" as const,
    coverSettings: DEFAULT_COVER_SETTINGS,
    footerSettings: DEFAULT_FOOTER_SETTINGS,
    qrSettings: DEFAULT_QR_SETTINGS,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, sanitizeFirestoreData(data));
  return {
    id: ref.id,
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function updateTemplate(
  id: string,
  updates: Partial<Omit<PdfMenuTemplate, "id" | "createdAt">>
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTIONS.templates, id), sanitizeFirestoreData({
    ...updates,
    updatedAt: serverTimestamp(),
  }));
}

async function deleteByTemplateId(collectionName: string, templateId: string): Promise<void> {
  const db = getDb();
  const snap = await getDocs(
    query(collection(db, collectionName), where("templateId", "==", templateId))
  );
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, COLLECTIONS.templates, id));
  await Promise.all([
    deleteByTemplateId(COLLECTIONS.categorySettings, id),
    deleteByTemplateId(COLLECTIONS.productSettings, id),
    deleteByTemplateId(COLLECTIONS.pages, id),
  ]);
}

export async function duplicateTemplate(sourceId: string, newName: string): Promise<PdfMenuTemplate> {
  const source = await getTemplate(sourceId);
  if (!source) throw new Error("Template not found");

  const newTemplate = await createTemplate(newName);

  const catSettings = await getCategorySettings(sourceId);
  for (const cat of catSettings) {
    await saveCategorySetting({ ...cat, id: "", templateId: newTemplate.id });
  }

  const prodSettings = await getProductSettings(sourceId);
  for (const prod of prodSettings) {
    await saveProductSetting({ ...prod, id: "", templateId: newTemplate.id });
  }

  const pages = await getMenuPages(sourceId);
  const idMap = new Map<string, string>();
  await saveMenuPages(
    pages.map((page) => {
      const newId = `page_${Math.random().toString(36).slice(2, 10)}`;
      idMap.set(page.id, newId);
      return { ...page, id: newId, templateId: newTemplate.id };
    })
  );

  await updateTemplate(newTemplate.id, {
    coverSettings: source.coverSettings,
    footerSettings: source.footerSettings,
    qrSettings: source.qrSettings,
    language: source.language,
    direction: source.direction,
    arrangeMode: source.arrangeMode,
  });

  return { ...newTemplate, ...source, id: newTemplate.id, name: newName };
}

export async function getCategorySettings(templateId: string): Promise<PdfMenuCategorySetting[]> {
  const db = getDb();
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.categorySettings),
      where("templateId", "==", templateId)
    )
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as PdfMenuCategorySetting))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function saveCategorySetting(setting: PdfMenuCategorySetting): Promise<string> {
  const db = getDb();
  const payload = sanitizeFirestoreData({ ...setting, id: undefined });
  if (setting.id) {
    await setDoc(doc(db, COLLECTIONS.categorySettings, setting.id), payload, { merge: true });
    return setting.id;
  }
  const ref = doc(collection(db, COLLECTIONS.categorySettings));
  await setDoc(ref, payload);
  return ref.id;
}

export async function saveCategorySettings(settings: PdfMenuCategorySetting[]): Promise<void> {
  for (const setting of settings) {
    await saveCategorySetting(setting);
  }
}

export async function getProductSettings(templateId: string): Promise<PdfMenuProductSetting[]> {
  const db = getDb();
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.productSettings), where("templateId", "==", templateId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PdfMenuProductSetting));
}

export async function saveProductSetting(setting: PdfMenuProductSetting): Promise<string> {
  const db = getDb();
  const payload = sanitizeFirestoreData({ ...setting, id: undefined });
  if (setting.id) {
    await setDoc(doc(db, COLLECTIONS.productSettings, setting.id), payload, { merge: true });
    return setting.id;
  }
  const ref = doc(collection(db, COLLECTIONS.productSettings));
  await setDoc(ref, payload);
  return ref.id;
}

export async function getMenuPages(templateId: string): Promise<PdfMenuPageRecord[]> {
  const db = getDb();
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.pages), where("templateId", "==", templateId))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as PdfMenuPageRecord))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function saveMenuPages(pages: PdfMenuPageRecord[]): Promise<void> {
  if (pages.length === 0) return;
  const db = getDb();
  const templateId = pages[0]!.templateId;
  const existing = await getDocs(
    query(collection(db, COLLECTIONS.pages), where("templateId", "==", templateId))
  );
  const keepIds = new Set(pages.map((p) => p.id));
  await Promise.all([
    ...existing.docs.filter((d) => !keepIds.has(d.id)).map((d) => deleteDoc(d.ref)),
    ...pages.map((page) =>
      setDoc(doc(db, COLLECTIONS.pages, page.id), sanitizeFirestoreData({ ...page }))
    ),
  ]);
}
