import assert from "node:assert/strict";
import { mapBanner, isBannerLive } from "../src/lib/mappers";
import {
  bannerToDraft,
  bannerVisibility,
  draftToBanner,
  pickChangedBannerFields,
} from "../src/lib/banners/manager";

const legacy = mapBanner({
  id: "legacy",
  title: "Legacy banner",
  subtitle: "Existing content",
  imageUrl: "https://example.com/desktop.jpg",
  active: true,
  sortOrder: 1,
});

assert.equal(legacy.desktopPositionX, 50);
assert.equal(legacy.mobilePositionY, 50);
assert.equal(legacy.desktopZoom, 1);
assert.equal(legacy.ctaAction, "none");
assert.equal(isBannerLive(legacy), true);
assert.equal(draftToBanner(bannerToDraft(legacy)).mobileImage, undefined);

const initial = bannerToDraft(legacy);
const patch = pickChangedBannerFields(
  { ...initial, titleHe: "כותרת חדשה", title: "כותרת חדשה" },
  initial
);
assert.deepEqual(Object.keys(patch).sort(), ["title", "titleHe"]);
assert.equal("imageUrl" in patch, false);

const future = {
  ...legacy,
  startDate: new Date(Date.now() + 60_000).toISOString(),
};
assert.equal(bannerVisibility(future), "scheduled");
assert.equal(isBannerLive(future), false);
assert.equal(
  bannerVisibility({ ...legacy, endDate: new Date(Date.now() - 60_000).toISOString() }),
  "ended"
);
assert.equal(bannerVisibility({ ...legacy, active: false }), "inactive");

console.log(
  JSON.stringify(
    {
      legacyCompatibility: true,
      unchangedImageSkipped: true,
      dirtyFieldsOnly: true,
      mobileFallback: true,
      scheduling: true,
    },
    null,
    2
  )
);
