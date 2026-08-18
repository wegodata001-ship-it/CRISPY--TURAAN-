import type { PageTemplateId } from "@/types/pdf-menu";
import {
  getCategoryPresentation,
  suggestedSizeName,
  type CategoryPresentationInput,
} from "@/lib/pdf-menu/presentation";

export type SuggestedPageSize = "quarter" | "half" | "three_quarters" | "full";

export interface CategoryLayoutEstimate {
  suggestedSize: SuggestedPageSize;
  capacity: 25 | 50 | 75 | 100;
  estimatedHeight: number;
  productCount: number;
  imageRatio: number;
  preferList: boolean;
}

/**
 * Auto packing size. Small categories stay small so they can share a page.
 * Template changes how much room image-heavy layouts need.
 */
export function estimateCategoryLayoutSize(input: CategoryPresentationInput): CategoryLayoutEstimate {
  const presentation = getCategoryPresentation(input);
  return {
    suggestedSize: suggestedSizeName(presentation.capacity),
    capacity: presentation.capacity,
    estimatedHeight: presentation.estimatedHeight,
    productCount: presentation.productCount,
    imageRatio: presentation.imageCoverage,
    preferList: presentation.preferList,
  };
}

export function computeSmartSize(input: CategoryPresentationInput & { templateId?: PageTemplateId }): number {
  return estimateCategoryLayoutSize(input).capacity;
}
