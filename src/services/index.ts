export {
  getProducts,
  getProductById,
  getPopularProducts,
  subscribeToProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  reorderProducts,
  readOneProductForTest,
} from "./productService";

export {
  getCategories,
  getCategoryById,
  subscribeToCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  readOneCategoryForTest,
} from "./categoryService";

export {
  getCustomers,
  getCustomerById,
  getTopCustomers,
  subscribeToCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getOrCreateGuestCustomer,
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
  testFirebaseConnection,
  runFirestoreWriteTest,
  isConnectionHealthy,
} from "./connectionService";

export type { ConnectionTestResult } from "./connectionService";
