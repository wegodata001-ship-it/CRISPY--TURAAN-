"use client";

import type { CSSProperties, ReactNode } from "react";
import type { MenuPage, PageTemplateId, PdfMenuCategoryWithProducts, PdfMenuProductView, PdfMenuTemplate } from "@/types/pdf-menu";
import { A4_HEIGHT_PX, A4_SAFE_PX, A4_WIDTH_PX, MENU_ARABIC_FONT, formatMenuPrice } from "@/lib/pdf-menu/a4";
import { productDensity, visibleProducts } from "@/lib/pdf-menu/page-content";
import { hexToRgba, isDarkColor, mixHexWithWhite } from "@/lib/pdf-menu/pdf-safe-color";
import { hasMenuImageFailed, resolveMenuImageSrc, sanitizeMenuImageUrl } from "@/lib/pdf-menu/menu-image";
import {
  getCategoryPresentation,
  productRowWeight,
  splitBalanced,
  twoCategoryOrientation,
  type CategoryPresentation,
} from "@/lib/pdf-menu/presentation";
import { SafeMenuImage, useMenuImageHealthVersion } from "./safe-menu-image";

export type MenuPageMode = "preview" | "pdf" | "thumb" | "export";

interface MenuPageRendererProps {
  page: MenuPage;
  menuTemplate: PdfMenuTemplate | null;
  mode?: MenuPageMode;
  debug?: boolean;
}

type Palette = {
  bg: string;
  text: string;
  heading: string;
  accent: string;
  muted: string;
  line: string;
  panel: string;
  card: string;
  dark: boolean;
};

function Price({ value, color, size }: { value: number; color: string; size: number }) {
  const text = formatMenuPrice(value);
  if (!text) return null;
  return (
    <span
      dir="ltr"
      style={{
        unicodeBidi: "isolate",
        fontWeight: 700,
        color,
        fontSize: size,
        whiteSpace: "nowrap",
        flexShrink: 0,
        letterSpacing: "0.01em",
      }}
    >
      {text}
    </span>
  );
}

function instagramHandle(value?: string): string {
  if (!value) return "";
  const handle = value
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/\/$/, "")
    .replace(/^@/, "");
  return handle ? `@${handle}` : "";
}

function Ltr({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span dir="ltr" style={{ unicodeBidi: "isolate", ...style }}>
      {children}
    </span>
  );
}

function workingImage(url: string | undefined | null): string | null {
  const clean = sanitizeMenuImageUrl(url);
  if (!clean || hasMenuImageFailed(clean)) return null;
  return clean;
}

function makePalette(page: MenuPage, isCover: boolean): Palette {
  const settings = page.customSettings;
  const darkPage = page.pageTemplateId === "full-background" || isCover;
  const bg = settings.backgroundColor || (darkPage ? "#1A1410" : "#F8F3ED");
  const dark = darkPage || isDarkColor(bg);
  const text = settings.textColor || (dark ? "#FFF8F3" : "#1A1410");
  const heading = settings.headingColor || text;
  const accent = settings.accentColor || "#D4A76A";
  return {
    bg,
    text,
    heading,
    accent,
    muted: dark ? hexToRgba("#FFF8F3", 0.62) : mixHexWithWhite(text, 0.42),
    line: hexToRgba(dark ? "#FFF8F3" : heading, dark ? 0.18 : 0.14),
    panel: dark ? hexToRgba("#FFF8F3", 0.06) : mixHexWithWhite(accent, 0.88),
    card: dark ? hexToRgba("#FFF8F3", 0.08) : "#FFFFFF",
    dark,
  };
}

export function MenuPageRenderer({ page, menuTemplate, mode = "preview", debug = false }: MenuPageRendererProps) {
  const showDebug = debug && process.env.NODE_ENV !== "production";
  const isExport = mode === "pdf" || mode === "export";
  const isCover = page.pageKind === "cover" || page.pageTemplateId === "cover";
  const palette = makePalette(page, isCover);
  const products = visibleProducts(page);
  const density = productDensity(products.length);
  const coverBg = isCover ? resolveMenuImageSrc(page.customSettings.backgroundImageUrl, mode) : null;

  const pageStyle: CSSProperties = {
    width: A4_WIDTH_PX,
    height: A4_HEIGHT_PX,
    position: "relative",
    overflow: "hidden",
    backgroundColor: palette.bg,
    color: palette.text,
    fontFamily: isExport
      ? 'Tahoma, "Segoe UI", "Noto Naskh Arabic", Arial, sans-serif'
      : MENU_ARABIC_FONT,
    direction: "rtl",
    textAlign: "right",
    unicodeBidi: "plaintext",
    WebkitPrintColorAdjust: "exact",
    printColorAdjust: "exact" as const,
    boxSizing: "border-box",
  };

  return (
    <div
      className={isExport ? "menu-pdf-page pdf-export-mode" : "menu-pdf-page"}
      data-page-id={page.id}
      data-template={page.pageTemplateId}
      lang="ar"
      dir="rtl"
      style={pageStyle}
    >
      <PageAtmosphere
        templateId={page.pageTemplateId}
        palette={palette}
        logoUrl={menuTemplate?.coverSettings.logoUrl}
        mode={mode}
        isCover={isCover}
        coverBg={coverBg}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          boxSizing: "border-box",
          padding: isCover ? 0 : A4_SAFE_PX,
          display: "flex",
          flexDirection: "column",
          outline: showDebug ? "2px dashed #E07A5F" : undefined,
          outlineOffset: showDebug ? -8 : undefined,
        }}
      >
        {isCover ? (
          <CoverBody page={page} menuTemplate={menuTemplate} palette={palette} mode={mode} />
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            {page.pageTemplateId === "split" ? (
              <SplitBody page={page} palette={palette} density={density} debug={showDebug} mode={mode} />
            ) : page.pageTemplateId === "two-categories" ? (
              <TwoCatBody page={page} palette={palette} density={density} debug={showDebug} mode={mode} />
            ) : (
              <CategoryStack page={page} palette={palette} density={density} debug={showDebug} mode={mode} />
            )}
          </div>
        )}

        {menuTemplate?.footerSettings.enabled && !isCover && (
          <PageFooter page={page} menuTemplate={menuTemplate} palette={palette} mode={mode} />
        )}
      </div>
    </div>
  );
}

function PageAtmosphere({
  templateId,
  palette,
  logoUrl,
  mode,
  isCover,
  coverBg,
}: {
  templateId: PageTemplateId;
  palette: Palette;
  logoUrl?: string;
  mode: MenuPageMode;
  isCover: boolean;
  coverBg: string | null;
}) {
  if (isCover) {
    return (
      <>
        {coverBg && (
          <SafeMenuImage
            src={coverBg}
            alt=""
            mode={mode}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: coverBg ? "rgba(26,20,16,0.5)" : "transparent",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: hexToRgba(palette.accent, 0.16),
            top: -90,
            right: -80,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 240,
            height: 240,
            borderRadius: "50%",
            background: hexToRgba(palette.accent, 0.1),
            bottom: 90,
            left: -70,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 28,
            border: `1px solid ${hexToRgba(palette.accent, 0.32)}`,
            borderRadius: 10,
            pointerEvents: "none",
          }}
        />
      </>
    );
  }

  return (
    <>
      {templateId === "full-background" && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.42)" }} />
      )}
      {templateId === "promo" && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 10, background: palette.accent }} />
      )}
      <div
        style={{
          position: "absolute",
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: hexToRgba(palette.accent, templateId === "promo" ? 0.16 : 0.08),
          top: -110,
          left: -80,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: hexToRgba(palette.heading, 0.05),
          bottom: 80,
          right: -70,
        }}
      />
      {templateId === "elegant" && (
        <div
          style={{
            position: "absolute",
            inset: 22,
            border: `1px solid ${hexToRgba(palette.accent, 0.28)}`,
            borderRadius: 6,
            pointerEvents: "none",
          }}
        />
      )}
      {templateId !== "minimal" && templateId !== "elegant" && (
        <div
          style={{
            position: "absolute",
            inset: 18,
            border: `1px solid ${hexToRgba(palette.accent, 0.14)}`,
            borderRadius: 18,
            pointerEvents: "none",
          }}
        />
      )}
      {logoUrl && (
        <SafeMenuImage
          src={logoUrl}
          alt=""
          mode={mode}
          style={{
            position: "absolute",
            left: "50%",
            top: "46%",
            width: 280,
            height: 280,
            marginLeft: -140,
            marginTop: -140,
            objectFit: "contain",
            opacity: 0.06,
            pointerEvents: "none",
          }}
        />
      )}
    </>
  );
}

function PageFooter({
  page,
  menuTemplate,
  palette,
  mode,
}: {
  page: MenuPage;
  menuTemplate: PdfMenuTemplate;
  palette: Palette;
  mode: MenuPageMode;
}) {
  const ig = instagramHandle(menuTemplate.footerSettings.instagram);
  const logo = menuTemplate.coverSettings.logoUrl;
  return (
    <div
      style={{
        marginTop: "auto",
        paddingTop: 12,
        borderTop: `1px solid ${palette.line}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        fontSize: 11,
        color: palette.muted,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {logo && (
          <SafeMenuImage src={logo} alt="" mode={mode} style={{ width: 18, height: 18, objectFit: "contain" }} />
        )}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {menuTemplate.footerSettings.businessName}
        </span>
      </div>
      <span>
        <Ltr>{ig}</Ltr>
      </span>
      <span style={{ fontWeight: 600, color: palette.accent }}>
        {menuTemplate.footerSettings.showPageNumber ? page.pageNumber : ""}
      </span>
    </div>
  );
}

function CoverBody({
  page,
  menuTemplate,
  palette,
  mode,
}: {
  page: MenuPage;
  menuTemplate: PdfMenuTemplate | null;
  palette: Palette;
  mode: MenuPageMode;
}) {
  const cover = menuTemplate?.coverSettings;
  void page;
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "64px 52px 48px",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div style={{ flex: "1 1 0" }} />
      {cover?.logoUrl && (
        <div
          style={{
            width: 210,
            height: 210,
            borderRadius: "50%",
            background: "#F8F3ED",
            display: "grid",
            placeItems: "center",
            marginBottom: 22,
            padding: 18,
            boxSizing: "border-box",
          }}
        >
          <SafeMenuImage
            src={cover.logoUrl}
            alt=""
            mode={mode}
            timeoutMs={20000}
            style={{ width: 174, height: 174, objectFit: "contain" }}
          />
        </div>
      )}
      <h1
        style={{
          margin: 0,
          fontSize: 48,
          fontWeight: 700,
          color: palette.heading,
          letterSpacing: 0.6,
          lineHeight: 1.15,
        }}
      >
        {cover?.businessName || "MISHKAT"}
      </h1>
      <div
        style={{
          width: 72,
          height: 2,
          background: palette.accent,
          margin: "16px auto 14px",
          borderRadius: 2,
        }}
      />
      <p
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 500,
          color: palette.accent,
          letterSpacing: 4,
        }}
      >
        {cover?.subtitle || "القائمة"}
      </p>
      <div style={{ flex: "1.2 1 0" }} />
      {cover?.showQr && cover.qrUrl && (
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 16,
            padding: "14px 16px 12px",
            boxShadow: "0 8px 24px rgba(26,20,16,0.18)",
          }}
        >
          <SafeMenuImage
            src={cover.qrUrl}
            alt=""
            mode={mode}
            timeoutMs={8000}
            style={{ width: 96, height: 96, minWidth: 96, minHeight: 96, margin: "0 auto", display: "block" }}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: "#3D2B24", fontWeight: 600 }}>امسح للطلب</div>
        </div>
      )}
      <div style={{ flex: "0.55 1 0" }} />
      <div style={{ fontSize: 13, color: hexToRgba(palette.heading, 0.78), lineHeight: 1.9, letterSpacing: 0.2 }}>
        {cover?.phone && (
          <div>
            <Ltr>{cover.phone}</Ltr>
          </div>
        )}
        {cover?.instagram && (
          <div>
            <Ltr>{instagramHandle(cover.instagram)}</Ltr>
          </div>
        )}
      </div>
    </div>
  );
}

function SplitBody({
  page,
  palette,
  density,
  debug,
  mode,
}: {
  page: MenuPage;
  palette: Palette;
  density: ReturnType<typeof productDensity>;
  debug: boolean;
  mode: MenuPageMode;
}) {
  const cat = page.categories[0];
  const image =
    workingImage(cat?.category.image) ||
    workingImage(cat?.products.find((p) => workingImage(p.image))?.image) ||
    workingImage(page.customSettings.backgroundImageUrl);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, height: "100%", minHeight: 0 }}>
      <div
        style={{
          borderRadius: 18,
          overflow: "hidden",
          background: palette.panel,
          position: "relative",
          outline: debug ? "1px solid #2C9C8C" : undefined,
        }}
      >
        {image ? (
          <SafeMenuImage src={image} alt={cat?.category.name || ""} mode={mode} style={{ width: "100%", height: "100%" }} />
        ) : (
          <DecorativePanel palette={palette} title={cat?.category.name || ""} />
        )}
      </div>
      <div style={{ minHeight: 0, overflow: "hidden" }}>
        {cat && (
          <CategorySection
            category={cat}
            page={page}
            palette={palette}
            density={density}
            forceList
            fill
            debug={debug}
            mode={mode}
            narrow
          />
        )}
      </div>
    </div>
  );
}

function DecorativePanel({ palette, title }: { palette: Palette; title: string }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 180,
          height: 180,
          borderRadius: "50%",
          border: `1px solid ${hexToRgba(palette.accent, 0.35)}`,
          top: 40,
          right: -40,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: hexToRgba(palette.accent, 0.12),
          bottom: 36,
          left: -20,
        }}
      />
      <div
        style={{
          width: 48,
          height: 2,
          background: palette.accent,
          marginBottom: 16,
        }}
      />
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: palette.heading,
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        {title}
      </div>
    </div>
  );
}

function TwoCatBody(props: {
  page: MenuPage;
  palette: Palette;
  density: ReturnType<typeof productDensity>;
  debug: boolean;
  mode: MenuPageMode;
}) {
  const cats = props.page.categories.slice(0, 2);
  if (cats.length <= 1) return <CategoryStack {...props} />;
  const auto = twoCategoryOrientation(cats.map((c) => c.products.length));
  const stacked = props.page.customSettings.columns === 1 || (props.page.customSettings.columns !== 2 && auto === "stacked");
  const compactPair = cats.every((c) => c.products.length <= 8);
  return (
    <div
      style={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: compactPair ? "center" : "stretch",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: stacked ? "1fr" : "1fr 1fr",
          gridTemplateRows: stacked && !compactPair ? "1fr 1fr" : "auto",
          gap: 18,
          width: "100%",
          minHeight: 0,
          flex: compactPair ? undefined : 1,
        }}
      >
        {cats.map((cat) => (
          <div
            key={cat.setting.categoryId}
            style={{
              minHeight: 0,
              overflow: "hidden",
              border: `1px solid ${hexToRgba(props.palette.accent, 0.22)}`,
              borderRadius: 16,
              padding: "22px 18px 20px",
              background: props.palette.panel,
              minHeight: stacked ? 280 : 520,
              breakInside: "avoid",
              outline: props.debug ? "1px solid #E8A87C" : undefined,
            }}
          >
            <CategorySection
              category={cat}
              page={props.page}
              palette={props.palette}
              density={props.density}
              fill={!compactPair}
              debug={props.debug}
              mode={props.mode}
              narrow={!stacked}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryStack(props: {
  page: MenuPage;
  palette: Palette;
  density: ReturnType<typeof productDensity>;
  debug: boolean;
  mode: MenuPageMode;
}) {
  const { page } = props;
  if (page.categories.length === 0) {
    return (
      <div style={{ height: "100%", display: "grid", placeItems: "center", opacity: 0.35, fontSize: 18 }}>
        صفحة فارغة
      </div>
    );
  }
  const lone = page.categories.length === 1;
  const compactPair = !lone && page.categories.every((c) => c.products.length <= 8);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        height: "100%",
        minHeight: 0,
        justifyContent: compactPair ? "center" : "flex-start",
      }}
    >
      {page.categories.map((cat) => (
        <div
          key={cat.setting.categoryId}
          style={{
            flex: lone || !compactPair ? `${Math.max(cat.computedSize, 25)} 1 0` : "0 0 auto",
            minHeight: 0,
            overflow: "hidden",
            breakInside: "avoid",
            outline: props.debug ? "1px solid #2C9C8C" : undefined,
          }}
        >
          <CategorySection {...props} category={cat} fill={lone || !compactPair} />
        </div>
      ))}
    </div>
  );
}

function CategoryHeader({
  name,
  palette,
  templateId,
  titleSize,
  logoUrl,
  mode,
}: {
  name: string;
  palette: Palette;
  templateId: PageTemplateId;
  titleSize: number;
  logoUrl?: string;
  mode: MenuPageMode;
}) {
  const promo = templateId === "promo";
  if (promo) {
    const onAccent = isDarkColor(palette.accent) ? "#FFF8F3" : "#1A1410";
    return (
      <div
        style={{
          background: palette.accent,
          color: onAccent,
          borderRadius: 12,
          padding: "10px 16px",
          marginBottom: 16,
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        <h2 style={{ margin: 0, fontSize: titleSize - 2, fontWeight: 700, lineHeight: 1.2 }}>{name}</h2>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ flex: 1, height: 1, background: palette.accent, opacity: 0.55 }} />
        {logoUrl && (
          <SafeMenuImage src={logoUrl} alt="" mode={mode} style={{ width: 22, height: 22, objectFit: "contain" }} />
        )}
        <h2
          style={{
            margin: 0,
            fontSize: titleSize,
            fontWeight: 700,
            color: palette.heading,
            lineHeight: 1.2,
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </h2>
        <span style={{ flex: 1, height: 1, background: palette.accent, opacity: 0.55 }} />
      </div>
      {templateId === "elegant" && (
        <div style={{ height: 1, background: hexToRgba(palette.accent, 0.28), margin: "6px 18% 0" }} />
      )}
    </div>
  );
}

function CategorySection({
  category,
  page,
  palette,
  density,
  forceList,
  fill,
  debug,
  mode = "preview",
  narrow,
}: {
  category: PdfMenuCategoryWithProducts;
  page: MenuPage;
  palette: Palette;
  density: ReturnType<typeof productDensity>;
  forceList?: boolean;
  fill?: boolean;
  debug?: boolean;
  mode?: MenuPageMode;
  narrow?: boolean;
}) {
  useMenuImageHealthVersion();
  const products = category.products.filter((p) => p.visible);
  const templateId = page.pageTemplateId;
  const imageCount = products.filter((p) => Boolean(workingImage(p.image))).length;
  const presentation = getCategoryPresentation({
    productCount: products.length,
    imageCount,
    avgNameLen: products.reduce((s, p) => s + p.name.length, 0) / Math.max(1, products.length),
    avgDescLen: products.reduce((s, p) => s + p.description.length, 0) / Math.max(1, products.length),
    hasCategoryImage: Boolean(workingImage(category.category.image)),
    templateId,
    pageCategoryCount: page.categories.length,
    forceList,
  });
  const isList = presentation.layout === "list" || presentation.layout === "hero-list" || Boolean(forceList);
  const cols = narrow ? 1 : presentation.columns;
  const lone = page.categories.length === 1 && !narrow;
  const centerCluster = Boolean(fill && lone && isList);
  const heroUrl = presentation.useCategoryHero ? workingImage(category.category.image) : null;

  return (
    <div
      style={{
        height: fill ? "100%" : undefined,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        justifyContent: centerCluster ? "center" : "flex-start",
      }}
    >
      <div
        style={
          centerCluster
            ? {
                border: `1px solid ${hexToRgba(palette.accent, 0.28)}`,
                borderRadius: 18,
                padding: "28px 22px 24px",
                background: palette.panel,
                minHeight: products.length <= 3 ? 420 : products.length <= 8 ? 640 : 740,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
              }
            : undefined
        }
      >
      {category.setting.showTitle !== false && (
        <CategoryHeader
          name={category.category.name}
          palette={palette}
          templateId={templateId}
          titleSize={presentation.titleSize}
          mode={mode}
        />
      )}
      {heroUrl && (
        <div
          style={{
            aspectRatio: "16 / 7",
            maxHeight: page.categories.length === 1 ? 180 : 110,
            borderRadius: 14,
            overflow: "hidden",
            marginBottom: 14,
            flexShrink: 0,
          }}
        >
          <SafeMenuImage src={heroUrl} alt="" mode={mode} style={{ width: "100%", height: "100%" }} />
        </div>
      )}
      {isList ? (
        <ListBlock
          products={products}
          columns={cols}
          presentation={presentation}
          palette={palette}
          page={page}
          density={density}
          cluster={centerCluster}
          mode={mode}
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: presentation.rowGap,
            minHeight: 0,
            flex: 1,
            alignContent: products.length <= 6 ? "stretch" : "start",
            alignItems: "stretch",
          }}
        >
          {products.map((product) => (
            <CardProduct
              key={product.id}
              product={product}
              page={page}
              palette={palette}
              presentation={presentation}
              debug={debug}
              mode={mode}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

function ListBlock({
  products,
  columns,
  presentation,
  palette,
  page,
  density,
  cluster,
  mode,
}: {
  products: PdfMenuProductView[];
  columns: number;
  presentation: CategoryPresentation;
  palette: Palette;
  page: MenuPage;
  density: ReturnType<typeof productDensity>;
  cluster: boolean;
  mode: MenuPageMode;
}) {
  const colStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: products.length >= 9 ? 8 : presentation.rowGap,
    minHeight: 0,
    flex: 1,
    justifyContent: products.length >= 5 ? "space-between" : "center",
  };

  if (columns < 2 || products.length < 2) {
    return (
      <div style={colStyle}>
        {products.map((product) => (
          <ListProduct
            key={product.id}
            product={product}
            page={page}
            palette={palette}
            presentation={presentation}
            density={density}
            mode={mode}
          />
        ))}
      </div>
    );
  }

  const [colA, colB] = splitBalanced(products, productRowWeight);
  const renderCol = (items: PdfMenuProductView[]) => (
    <div style={colStyle}>
      {items.map((product) => (
        <ListProduct
          key={product.id}
          product={product}
          page={page}
          palette={palette}
          presentation={presentation}
          density={density}
          mode={mode}
        />
      ))}
    </div>
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 28,
        minHeight: 0,
        flex: 1,
      }}
    >
      {renderCol(colA)}
      {renderCol(colB)}
    </div>
  );
}

function ListProduct({
  product,
  page,
  palette,
  presentation,
  density,
  mode = "preview",
}: {
  product: PdfMenuProductView;
  page: MenuPage;
  palette: Palette;
  presentation: CategoryPresentation;
  density: ReturnType<typeof productDensity>;
  mode?: MenuPageMode;
}) {
  const imageUrl = presentation.showProductImages ? workingImage(product.image) : null;
  const showDesc = Boolean(product.description) && presentation.density !== "compact";
  void page;
  return (
    <div
      style={{
        display: "flex",
        alignItems: showDesc ? "flex-start" : "center",
        gap: 10,
        breakInside: "avoid",
        pageBreakInside: "avoid",
        padding: "6px 0",
      }}
    >
      {imageUrl && (
        <SafeMenuImage
          src={product.image}
          alt=""
          mode={mode}
          productId={product.id}
          productName={product.name}
          style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0 }}
        />
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            style={{
              fontSize: presentation.nameSize,
              fontWeight: 600,
              color: palette.text,
              lineHeight: 1.25,
            }}
          >
            {product.name}
          </span>
          <span
            style={{
              flex: 1,
              borderBottom: `1px dotted ${palette.line}`,
              transform: "translateY(-5px)",
              minWidth: 12,
              opacity: 0.9,
            }}
          />
          <Price value={product.price} color={palette.accent} size={presentation.priceSize} />
        </div>
        {showDesc && (
          <div
            style={{
              fontSize: presentation.descSize,
              color: palette.muted,
              marginTop: 3,
              lineHeight: 1.35,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {product.description}
          </div>
        )}
      </div>
    </div>
  );
}

function SoftPhotoFallback({ palette }: { palette: Palette }) {
  return (
    <div
      style={{
        aspectRatio: "4 / 3",
        borderRadius: 10,
        background: hexToRgba(palette.accent, 0.12),
        display: "grid",
        placeItems: "center",
        marginBottom: 8,
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          border: `1.5px solid ${hexToRgba(palette.accent, 0.45)}`,
        }}
      />
    </div>
  );
}

function CardProduct({
  product,
  page,
  palette,
  presentation,
  debug,
  mode = "preview",
}: {
  product: PdfMenuProductView;
  page: MenuPage;
  palette: Palette;
  presentation: CategoryPresentation;
  debug?: boolean;
  mode?: MenuPageMode;
}) {
  const imageUrl = workingImage(product.image);
  const promo = page.pageTemplateId === "promo";
  const radius = page.customSettings.borderRadius || 14;
  return (
    <div
      style={{
        breakInside: "avoid",
        pageBreakInside: "avoid",
        background: promo ? palette.card : palette.dark ? palette.card : hexToRgba("#FFFFFF", 0.72),
        borderRadius: radius,
        overflow: "hidden",
        padding: presentation.density === "compact" ? 8 : 10,
        border: `1px solid ${hexToRgba(palette.accent, promo ? 0.28 : 0.16)}`,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        outline: debug ? "1px solid #C4A484" : undefined,
      }}
    >
      {imageUrl ? (
        <div style={{ aspectRatio: "4 / 3", flex: "1 1 auto", minHeight: 120, marginBottom: 8, borderRadius: 10, overflow: "hidden" }}>
          <SafeMenuImage
            src={product.image}
            alt=""
            mode={mode}
            productId={product.id}
            productName={product.name}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      ) : presentation.showProductImages ? (
        <SoftPhotoFallback palette={palette} />
      ) : null}
      <div
        style={{
          fontSize: presentation.nameSize,
          fontWeight: 600,
          color: palette.text,
          lineHeight: 1.35,
        }}
      >
        {product.name}
      </div>
      {product.description && presentation.density !== "compact" && (
        <div
          style={{
            fontSize: presentation.descSize,
            color: palette.muted,
            marginTop: 4,
            lineHeight: 1.4,
          }}
        >
          {product.description}
        </div>
      )}
      <div style={{ marginTop: "auto", paddingTop: 8, textAlign: "left" }}>
        <Price value={product.price} color={palette.accent} size={promo ? presentation.priceSize + 2 : presentation.priceSize} />
      </div>
    </div>
  );
}
