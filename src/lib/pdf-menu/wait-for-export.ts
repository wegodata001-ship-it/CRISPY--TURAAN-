export async function waitForFonts(doc: Document = document): Promise<void> {
  if (!doc.fonts) return;
  try {
    await doc.fonts.ready;
  } catch {
    /* ignore */
  }
}

export async function waitForImages(root: ParentNode, timeoutMs = 4000): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          const finish = () => {
            img.removeEventListener("load", onLoad);
            img.removeEventListener("error", onError);
            resolve();
          };
          const onLoad = () => finish();
          const onError = () => {
            img.remove();
            finish();
          };
          if (img.complete) {
            if (img.naturalWidth === 0) img.remove();
            resolve();
            return;
          }
          img.addEventListener("load", onLoad);
          img.addEventListener("error", onError);
          window.setTimeout(() => {
            if (!img.complete || img.naturalWidth === 0) img.remove();
            finish();
          }, timeoutMs);
        })
    )
  );
}

export async function waitTwoFrames(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}
