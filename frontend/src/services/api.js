const API_BASE_URL = window.location.pathname.startsWith("/ecommerce")
  ? "/ecommerce/api"
  : "/api";

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("access_token");
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (isFormData) {
    delete headers["Content-Type"];
    delete headers["content-type"];
  } else if (!Object.keys(headers).some((key) => key.toLowerCase() === "content-type")) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : data.message || `Request failed (${response.status})`
    );
  }
  return data;
}

export const getProducts = () => apiRequest("/products/");
export const getCart = () => apiRequest("/cart/");

export const addCartItem = (productId, quantity = 1) =>
  apiRequest("/cart/items", {
    method: "POST",
    body: JSON.stringify({ product_id: productId, quantity }),
  });

export const updateCartItem = (itemId, quantity) =>
  apiRequest(`/cart/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });

export const removeCartItem = (itemId) =>
  apiRequest(`/cart/items/${itemId}`, { method: "DELETE" });

export const placeOrder = (deliveryDetails) =>
  apiRequest("/orders/", {
    method: "POST",
    body: JSON.stringify(deliveryDetails),
  });

export const getSavedAddress = () => apiRequest("/customers/me/address");
export const getOrders = () => apiRequest("/orders/");
export const getDeliveryAgents = () => apiRequest("/orders/delivery-agents");

export const createOrderComplaint = (orderId, complaint) =>
  apiRequest(`/orders/${orderId}/complaints`, {
    method: "POST",
    body: JSON.stringify(complaint),
  });

export const updateOrderComplaint = (orderId, complaintId, update) =>
  apiRequest(`/orders/${orderId}/complaints/${complaintId}`, {
    method: "PATCH",
    body: JSON.stringify(update),
  });

export const updateOrderStatus = (orderId, nextStatus) =>
  apiRequest(`/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: nextStatus }),
  });

export const assignDeliveryAgent = (orderId, deliveryAgentId) =>
  apiRequest(`/orders/${orderId}/assignment`, {
    method: "PATCH",
    body: JSON.stringify({ delivery_agent_id: deliveryAgentId || null }),
  });
