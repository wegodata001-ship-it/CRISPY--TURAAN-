import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { getDb, isFirebaseInitialized, getFirebaseAuth } from "@/lib/firebase";
import { validateFirebaseEnv } from "@/lib/firebase/env";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { readOneCategoryForTest } from "@/services/categoryService";
import { readOneProductForTest } from "@/services/productService";
import { uploadTestImage } from "@/services/storageService";
import { type ServiceResult, success, failure } from "@/lib/errors";

export interface ConnectionTestResult {
  envValid: boolean;
  missingEnv: string[];
  initialized: boolean;
  authReady: boolean;
  categoryRead: boolean;
  productRead: boolean;
  writeTest: boolean;
  storageReady: boolean;
  error?: string;
}

export async function testFirebaseConnection(): Promise<ConnectionTestResult> {
  const envCheck = validateFirebaseEnv();
  const result: ConnectionTestResult = {
    envValid: envCheck.valid,
    missingEnv: envCheck.missing,
    initialized: false,
    authReady: false,
    categoryRead: false,
    productRead: false,
    writeTest: false,
    storageReady: false,
  };

  if (!envCheck.valid) {
    result.error = `Missing environment variables: ${envCheck.missing.join(", ")}`;
    return result;
  }

  try {
    result.initialized = isFirebaseInitialized();
    getFirebaseAuth();
    result.authReady = true;

    const categoryResult = await readOneCategoryForTest();
    result.categoryRead = categoryResult.success;

    const productResult = await readOneProductForTest();
    result.productRead = productResult.success;

    const writeResult = await runFirestoreWriteTest();
    result.writeTest = writeResult.success;

    const storageResult = await uploadTestImage();
    result.storageReady = storageResult.success;

    if (!categoryResult.success && categoryResult.error) {
      result.error = categoryResult.error;
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : "Connection test failed";
  }

  return result;
}

export async function runFirestoreWriteTest(): Promise<ServiceResult<boolean>> {
  try {
    const db = getDb();
    const testId = `test-${Date.now()}`;
    const testRef = doc(db, COLLECTIONS.connectionTest, testId);

    await setDoc(testRef, {
      message: "connection test",
      timestamp: new Date().toISOString(),
    });

    const readSnap = await getDoc(testRef);
    if (!readSnap.exists()) {
      return failure(new Error("Write test document not found after create"));
    }

    await updateDoc(testRef, { message: "connection test updated" });

    const updatedSnap = await getDoc(testRef);
    if (updatedSnap.data()?.message !== "connection test updated") {
      return failure(new Error("Write test update failed"));
    }

    await deleteDoc(testRef);
    return success(true);
  } catch (error) {
    return failure(error, "Firestore write test failed");
  }
}

export function isConnectionHealthy(result: ConnectionTestResult): boolean {
  return (
    result.envValid &&
    result.initialized &&
    result.authReady &&
    result.categoryRead &&
    result.productRead &&
    result.writeTest
  );
}
