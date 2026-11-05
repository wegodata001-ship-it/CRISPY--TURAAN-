import { describe, expect, it } from "vitest";
import { categorySchema } from "@/lib/validation/schemas";

const baseCategory = {
  nameHe: "בדיקה",
  nameAr: "تجريبي",
  nameEn: "Test",
  icon: "coffee",
  color: "#8B6914",
  sortOrder: 1,
  active: true,
  parentId: "",
};

describe("categorySchema imageUrl", () => {
  it("accepts a category without a cover image (empty imageUrl)", () => {
    const parsed = categorySchema.parse({
      ...baseCategory,
      imageUrl: "",
    });
    expect(parsed.imageUrl).toBe("");
    expect(parsed.nameEn).toBe("Test");
  });

  it("accepts a category with imageUrl omitted", () => {
    const parsed = categorySchema.parse(baseCategory);
    expect(parsed.imageUrl).toBeUndefined();
  });

  it("accepts a valid cover image URL", () => {
    const parsed = categorySchema.parse({
      ...baseCategory,
      imageUrl: "https://example.com/category.jpg",
    });
    expect(parsed.imageUrl).toBe("https://example.com/category.jpg");
  });

  it("rejects an invalid cover image URL", () => {
    const result = categorySchema.safeParse({
      ...baseCategory,
      imageUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const imageIssue = result.error.issues.find((issue) => issue.path.includes("imageUrl"));
      expect(imageIssue).toBeTruthy();
    }
  });
});
