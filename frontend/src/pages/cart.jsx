import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, getCart, getSavedAddress, placeOrder, removeCartItem, updateCartItem } from "../services/api.js";

function Cart() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [deliveryInfo, setDeliveryInfo] = useState({
    delivery_name: "",
    delivery_phone: "",
    delivery_address: "",
    delivery_city: "",
    delivery_postal_code: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  const load = async () => {
    try {
      const [cart, currentUser, savedAddress] = await Promise.all([
        getCart(),
        apiRequest("/auth/me"),
        getSavedAddress(),
      ]);
      setItems(cart);
      setDeliveryInfo((current) => ({
        ...current,
        ...(savedAddress || {}),
        delivery_name: current.delivery_name || savedAddress?.delivery_name || currentUser.full_name,
      }));
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + Number(item.product.price) * item.quantity, 0),
    [items]
  );

  const changeQuantity = async (item, quantity) => {
    setUpdating(true);
    setError("");
    try {
      setItems(await updateCartItem(item.id, quantity));
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setUpdating(false);
    }
  };

  const removeItem = async (item) => {
    setUpdating(true);
    setError("");
    try {
      await removeCartItem(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (removeError) {
      setError(removeError.message);
    } finally {
      setUpdating(false);
    }
  };

  const placeCustomerOrder = async (event) => {
    event.preventDefault();
    setPlacingOrder(true);
    setError("");
    try {
      const order = await placeOrder(deliveryInfo);
      navigate("/orders", { state: { newOrderNumber: order.order_number } });
    } catch (orderError) {
      setError(orderError.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  const updateDeliveryInfo = (event) => {
    const { name, value } = event.target;
    setDeliveryInfo((current) => ({ ...current, [name]: value }));
  };

  return (
    <div className="store-page cart-page">
      <section className="page-intro">
        <div><p className="eyebrow">YOUR PICKS</p><h1>Shopping cart</h1><p>Review your items before you continue shopping.</p></div>
        <Link className="button button-outline" to="/products">Continue shopping</Link>
      </section>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {loading ? <p className="loading-state">Loading your cart...</p> : items.length ? (
        <div className="cart-layout">
          <section className="cart-items" aria-label="Cart items">
            {items.map((item) => (
              <article className="cart-item" key={item.id}>
                <div className="cart-item-image">
                  {item.product.image_url ? <img src={item.product.image_url} alt={item.product.name} /> : <span aria-hidden="true">✦</span>}
                </div>
                <div className="cart-item-info">
                  <span className="product-category">{item.product.category}</span>
                  <h2>{item.product.name}</h2>
                  <p>₹{Number(item.product.price).toFixed(2)} each</p>
                  {!item.product.is_active && <p className="cart-unavailable">This product is no longer available.</p>}
                  <button className="text-button" disabled={updating} onClick={() => removeItem(item)}>Remove</button>
                </div>
                <div className="quantity-control">
                  <span>Quantity</span>
                  <div className="quantity-stepper">
                    <button type="button" aria-label="Decrease quantity" disabled={updating || item.quantity <= 1 || !item.product.is_active} onClick={() => changeQuantity(item, item.quantity - 1)}>−</button>
                    <output>{item.quantity}</output>
                    <button type="button" aria-label="Increase quantity" disabled={updating || item.quantity >= item.product.stock || !item.product.is_active} onClick={() => changeQuantity(item, item.quantity + 1)}>+</button>
                  </div>
                </div>
                <strong className="cart-line-total">₹{(Number(item.product.price) * item.quantity).toFixed(2)}</strong>
              </article>
            ))}
          </section>
          <aside className="cart-summary">
            <p className="eyebrow">ORDER SUMMARY</p>
            <h2>Cash on delivery</h2>
            <div className="summary-row"><span>Subtotal</span><strong>₹{subtotal.toFixed(2)}</strong></div>
            <div className="summary-row"><span>Delivery</span><span>Free</span></div>
            <div className="summary-total"><span>Total</span><strong>₹{subtotal.toFixed(2)}</strong></div>
            <form className="checkout-form" onSubmit={placeCustomerOrder}>
              <h3>Delivery details</h3>
              <p className="checkout-note">These details are saved to your account when you place an order.</p>
              <label>
                Recipient name
                <input name="delivery_name" value={deliveryInfo.delivery_name} onChange={updateDeliveryInfo} maxLength={150} required />
              </label>
              <label>
                Phone number
                <input name="delivery_phone" type="tel" value={deliveryInfo.delivery_phone} onChange={updateDeliveryInfo} minLength={8} maxLength={24} autoComplete="tel" required />
              </label>
              <label>
                Street address
                <textarea name="delivery_address" value={deliveryInfo.delivery_address} onChange={updateDeliveryInfo} minLength={5} maxLength={1000} autoComplete="street-address" rows={3} required />
              </label>
              <div className="checkout-location-fields">
                <label>
                  City
                  <input name="delivery_city" value={deliveryInfo.delivery_city} onChange={updateDeliveryInfo} maxLength={100} autoComplete="address-level2" required />
                </label>
                <label>
                  Postal code
                  <input name="delivery_postal_code" value={deliveryInfo.delivery_postal_code} onChange={updateDeliveryInfo} minLength={4} maxLength={12} autoComplete="postal-code" required />
                </label>
              </div>
              <button className="button button-primary checkout-submit" type="submit" disabled={placingOrder || updating}>
                {placingOrder ? "Placing order..." : `Place order · ₹${subtotal.toFixed(2)}`}
              </button>
              <p className="checkout-note">Pay in cash when your order is delivered.</p>
            </form>
          </aside>
        </div>
      ) : (
        <div className="empty-state"><span aria-hidden="true">♡</span><h3>Your cart is waiting</h3><p>Browse the store and add something you love.</p><Link className="button button-primary" to="/products">Explore products</Link></div>
      )}
    </div>
  );
}

export default Cart;
