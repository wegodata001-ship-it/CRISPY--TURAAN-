export {
  getProducts,
  getProductById,
  getPopularProducts,
  getAllProductsForExport,
  subscribeToProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  reorderProducts,
  readOneProductForTest,
} from "./productService";

export {
  saveProductEditorChanges,
  type ProductEditorSaveInput,
  type ProductEditorSaveResult,
} from "./productEditorSaveService";

export {
  getCategories,
  getCategoryById,
  getAllCategoriesForExport,
  subscribeToCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  readOneCategoryForTest,
} from "./categoryService";

export {
  getModifierGroups,
  subscribeToModifierGroups,
  createModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,
  duplicateModifierGroup,
  reorderModifierGroups,
  getModifierOptions,
  subscribeToModifierOptions,
  createModifierOption,
  updateModifierOption,
  deleteModifierOption,
  saveModifierGroupWithOptions,
  reorderModifierOptions,
  linkProductModifierGroup,
  updateProductModifierGroup,
  unlinkProductModifierGroup,
  getProductModifierGroups,
  getProductModifierOptions,
  reorderProductModifierGroups,
  syncProductModifierLinks,
  syncCategoryModifierLinks,
  setProductAddonExclusion,
  loadProductBuilderConfig,
  subscribeToProductBuilderConfig,
  getBusinessRules,
  subscribeToBusinessRules,
  createBusinessRule,
  updateBusinessRule,
  deleteBusinessRule,
  createProductSuggestion,
  updateProductSuggestion,
  deleteProductSuggestion,
  upsertInventoryLink,
} from "./modifierService";

export {
  getCustomers,
  getCustomerById,
  getTopCustomers,
  subscribeToCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getOrCreateGuestCustomer,
  GUEST_CUSTOMER_ID,
} from "./customerService";

export {
  getOrders,
  getOrderById,
  getOrdersByCustomer,
  getOrderStats,
  subscribeToOrders,
  createOrder,
  createOrderFromCart,
  updateOrder,
  updateOrderStatus,
  updateOrderItemExtras,
  deleteOrder,
} from "./orderService";

export {
  getBanners,
  subscribeToBanners,
  subscribeToAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
} from "./bannerService";

export {
  uploadImageWithProgress,
  uploadProductImage,
  uploadCategoryImage,
  uploadBannerImage,
  uploadSettingsImage,
  uploadModifierOptionImage,
  deleteImageByUrl,
  deleteImage,
  storagePathFromUrl,
  uploadTestImage,
} from "./storageService";

export {
  getSettings,
  subscribeToSettings,
  updateSettings,
} from "./settingsService";

export {
  subscribeToIngredients,
  subscribeToRecipes,
  subscribeToCostingSettings,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  saveProductRecipe,
  saveCostingSettings,
} from "./costingService";

export {
  testFirebaseConnection,
  runFirestoreWriteTest,
  isConnectionHealthy,
} from "./connectionService";

export type { ConnectionTestResult } from "./connectionService";
