import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  runTransaction,
  type Unsubscribe,
  type DocumentData,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { ServiceError, type ServiceResult, success, failure } from "@/lib/errors";
import { mapOrder } from "@/lib/mappers";
import { orderSchema, type OrderInput } from "@/lib/validation/schemas";
import { nowTimestamp } from "@/types/firestore";
import type { Order, OrderStatus, OrderItem, CartItem } from "@/types";
import type { FirestoreOrder, FirestoreDoc } from "@/types/firestore";

function docToOrder(id: string, data: DocumentData): FirestoreDoc<FirestoreOrder> {
  return { id, ...(data as FirestoreOrder) };
}

function filterOrders(
  orders: Order[],
  filters?: { search?: string; status?: OrderStatus | "all" }
): Order[] {
  let result = [...orders];

  if (filters?.status && filters.status !== "all") {
    result = result.filter((o) => o.status === filters.status);
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q)
    );
  }

  return result.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const db = getDb();
  const snapshot = await getDocs(collection(db, COLLECTIONS.orders));
  const nextNum = snapshot.size + 1;
  return `MC-${year}-${String(nextNum).padStart(4, "0")}`;
}

export async function getOrders(filters?: {
  search?: string;
  status?: OrderStatus | "all";
}): Promise<Order[]> {
  try {
    const db = getDb();
    const q = query(
      collection(db, COLLECTIONS.orders),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map((d) =>
      mapOrder(docToOrder(d.id, d.data()))
    );
    return filterOrders(orders, filters);
  } catch (error) {
    throw new ServiceError(
      error instanceof Error ? error.message : "Failed to fetch orders",
      "ORDERS_READ_FAILED"
    );
  }
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  try {
    const db = getDb();
    const snap = await getDoc(doc(db, COLLECTIONS.orders, id));
    if (!snap.exists()) return undefined;
    return mapOrder(docToOrder(snap.id, snap.data()));
  } catch (error) {
    throw new ServiceError(
      error instanceof Error ? error.message : "Failed to fetch order",
      "ORDER_READ_FAILED"
    );
  }
}

export async function getOrdersByCustomer(customerId: string): Promise<Order[]> {
  try {
    const orders = await getOrders();
    return orders.filter((o) => o.customerId === customerId);
  } catch (error) {
    throw new ServiceError(
      error instanceof Error ? error.message : "Failed to fetch customer orders",
      "ORDERS_BY_CUSTOMER_FAILED"
    );
  }
}

export async function getOrderStats(): Promise<{
  total: number;
  pending: number;
  preparing: number;
  ready: number;
  delivered: number;
  cancelled: number;
}> {
  try {
    const orders = await getOrders();
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      preparing: orders.filter((o) => o.status === "preparing").length,
      ready: orders.filter((o) => o.status === "ready").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
    };
  } catch (error) {
    throw new ServiceError(
      error instanceof Error ? error.message : "Failed to fetch order stats",
      "ORDER_STATS_FAILED"
    );
  }
}

export function subscribeToOrders(
  filters: { search?: string; status?: OrderStatus | "all" } | undefined,
  onData: (orders: Order[]) => void,
  onError: (error: string) => void
): Unsubscribe {
  try {
    const db = getDb();
    const q = query(
      collection(db, COLLECTIONS.orders),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const orders = snapshot.docs.map((d) =>
          mapOrder(docToOrder(d.id, d.data()))
        );
        onData(filterOrders(orders, filters));
      },
      (error) => onError(error.message)
    );
  } catch (error) {
    onError(error instanceof Error ? error.message : "Failed to subscribe to orders");
    return () => {};
  }
}

export async function createOrder(input: OrderInput): Promise<ServiceResult<Order>> {
  try {
    const parsed = orderSchema.parse(input);
    const db = getDb();
    const orderNumber = await generateOrderNumber();
    const now = nowTimestamp();

    const orderData: FirestoreOrder = {
      orderNumber,
      customerId: parsed.customerId,
      customerName: parsed.customerName,
      items: parsed.items,
      status: parsed.status,
      subtotal: parsed.subtotal,
      discount: parsed.discount,
      delivery: parsed.delivery,
      total: parsed.total,
      paymentMethod: parsed.paymentMethod,
      notes: parsed.notes,
      createdAt: now,
    };

    const result = await runTransaction(db, async (transaction) => {
      const customerRef = doc(db, COLLECTIONS.customers, parsed.customerId);
      const customerSnap = await transaction.get(customerRef);

      if (!customerSnap.exists()) {
        throw new ServiceError("Customer not found", "CUSTOMER_NOT_FOUND");
      }

      const orderRef = doc(collection(db, COLLECTIONS.orders));
      transaction.set(orderRef, orderData);

      const customerData = customerSnap.data() as { ordersCount?: number };
      transaction.update(customerRef, {
        ordersCount: (customerData.ordersCount ?? 0) + 1,
        lastOrder: now,
      });

      return { id: orderRef.id, ...orderData };
    });

    return success(mapOrder(result as FirestoreDoc<FirestoreOrder>));
  } catch (error) {
    return failure(error, "Failed to create order");
  }
}

export async function createOrderFromCart(
  cartItems: CartItem[],
  customerId: string,
  customerName: string
): Promise<ServiceResult<Order>> {
  const items: OrderItem[] = cartItems.map((item) => ({
    productId: item.product.id,
    productName: item.product.name_he || item.product.name_en,
    quantity: item.quantity,
    price: item.product.price,
  }));

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return createOrder({
    customerId,
    customerName,
    items,
    status: "pending",
    subtotal,
    discount: 0,
    delivery: 0,
    total: subtotal,
    paymentMethod: "cash",
    notes: "",
  });
}

export async function updateOrder(
  id: string,
  input: Partial<OrderInput & { orderNumber?: string }>
): Promise<ServiceResult<Order>> {
  try {
    const db = getDb();
    const ref = doc(db, COLLECTIONS.orders, id);
    await updateDoc(ref, input);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return failure(new ServiceError("Order not found", "NOT_FOUND"));
    }
    return success(mapOrder(docToOrder(snap.id, snap.data())));
  } catch (error) {
    return failure(error, "Failed to update order");
  }
}

export async function deleteOrder(id: string): Promise<ServiceResult<void>> {
  try {
    const db = getDb();
    await deleteDoc(doc(db, COLLECTIONS.orders, id));
    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to delete order");
  }
}
