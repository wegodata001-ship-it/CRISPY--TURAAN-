import {
  masterMenuCategories,
  masterMenuProducts,
  MASTER_MENU_STATS,
} from "../src/data/master-menu";

function audit() {
  const errors: string[] = [];
  const warnings: string[] = [];

  const categoryIds = new Set(masterMenuCategories.map((c) => c.id));
  const productIds = new Set<string>();

  if (masterMenuCategories.length !== 12) {
    warnings.push(
      `Expected 12 categories, found ${masterMenuCategories.length}`
    );
  }

  for (const product of masterMenuProducts) {
    if (productIds.has(product.id)) {
      errors.push(`Duplicate product id: ${product.id}`);
    }
    productIds.add(product.id);

    if (!categoryIds.has(product.categoryId)) {
      errors.push(
        `Product "${product.nameHe}" has invalid category: ${product.categoryId}`
      );
    }

    if (product.price <= 0) {
      errors.push(`Product "${product.nameHe}" has invalid price`);
    }

    if (
      product.profit !==
      Math.round((product.price - product.cost) * 100) / 100
    ) {
      warnings.push(`Profit mismatch for "${product.nameHe}"`);
    }
  }

  for (const cat of masterMenuCategories) {
    const count = masterMenuProducts.filter(
      (p) => p.categoryId === cat.id
    ).length;
    if (count === 0) {
      errors.push(`Category "${cat.nameHe}" has no products`);
    }
  }

  process.stdout.write("\n=== MISHKAT CAFÉ — Master Menu Audit ===\n\n");
  process.stdout.write(`Categories: ${MASTER_MENU_STATS.categories}\n`);
  process.stdout.write(`Products:   ${MASTER_MENU_STATS.products}\n`);
  process.stdout.write(`Popular:    ${MASTER_MENU_STATS.popular}\n\n`);
  process.stdout.write("Products per category:\n");

  for (const cat of masterMenuCategories) {
    const count = masterMenuProducts.filter(
      (p) => p.categoryId === cat.id
    ).length;
    process.stdout.write(`  ${cat.nameHe}: ${count}\n`);
  }

  process.stdout.write("\n");

  if (errors.length > 0) {
    process.stdout.write("✗ ERRORS:\n");
    errors.forEach((e) => process.stdout.write(`  - ${e}\n`));
  } else {
    process.stdout.write("✔ No duplicate IDs\n");
    process.stdout.write("✔ All products have valid categories\n");
    process.stdout.write("✔ All prices valid\n");
  }

  if (warnings.length > 0) {
    process.stdout.write("\n⚠ WARNINGS:\n");
    warnings.forEach((w) => process.stdout.write(`  - ${w}\n`));
  }

  process.stdout.write(
    errors.length === 0
      ? "\n✔ Master menu data is valid.\n"
      : `\n✗ Audit failed with ${errors.length} error(s).\n`
  );

  process.exit(errors.length > 0 ? 1 : 0);
}

audit();
