import { describe, expect, it } from "vitest";
import {
  isEmbeddedImagePayload,
  STORAGE_ERROR_KEYS,
  storageErrorTranslationKey,
  uploadErrorMessage,
} from "@/lib/storage/errors";
import { isAllowedProductImageUrl } from "@/lib/menu/placeholders";

describe("storageErrorTranslationKey", () => {
  it("maps canceled uploads", () => {
    expect(storageErrorTranslationKey({ code: "storage/canceled" })).toBe(
      STORAGE_ERROR_KEYS.canceled
    );
  });

  it("maps missing Storage bucket", () => {
    expect(
      storageErrorTranslationKey(new Error("storage/unknown: Firebase Storage is not enabled. Get Started"))
    ).toBe(STORAGE_ERROR_KEYS.notReady);
  });

  it("maps staff permission errors", () => {
    expect(storageErrorTranslationKey({ code: "storage/unauthorized" })).toBe(
      STORAGE_ERROR_KEYS.unauthorized
    );
  });

  it("maps invalid file type", () => {
    expect(storageErrorTranslationKey("admin.upload.invalidType")).toBe(
      STORAGE_ERROR_KEYS.invalidType
    );
  });

  it("returns localized copy through uploadErrorMessage", () => {
    const t = (key: string) => `AR:${key}`;
    expect(uploadErrorMessage("storage/unauthorized", t)).toBe(
      `AR:${STORAGE_ERROR_KEYS.unauthorized}`
    );
    expect(uploadErrorMessage("storage/canceled", t)).toBe("");
  });
});

describe("embedded image payloads", () => {
  it("rejects base64 and blob values", () => {
    expect(isEmbeddedImagePayload("data:image/png;base64,aaaa")).toBe(true);
    expect(isEmbeddedImagePayload("blob:http://localhost/1")).toBe(true);
    expect(
      isAllowedProductImageUrl("data:image/png;base64,aaaa")
    ).toBe(false);
    expect(
      isAllowedProductImageUrl(
        "https://firebasestorage.googleapis.com/v0/b/crispy-d0bf7.firebasestorage.app/o/products%2Fx.jpg?alt=media"
      )
    ).toBe(true);
  });
});
