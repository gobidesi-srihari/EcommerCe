import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  apiRequest,
  assignDeliveryAgent,
  createOrderComplaint,
  getDeliveryAgents,
  getOrders,
  updateOrderComplaint,
  updateOrderStatus,
} from "../services/api.js";

const ORDER_STEPS = [
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];

const ADMIN_NEXT_STATUSES = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

function humanize(value) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function OrderTimeline({ order }) {
  if (order.status === "cancelled") {
    return <p className="order-cancelled">This order was cancelled.</p>;
  }
  const completedIndex = ORDER_STEPS.indexOf(order.status);
  return (
    <ol className="order-timeline">
      {ORDER_STEPS.map((step, index) => (
        <li className={index <= completedIndex ? "timeline-complete" : ""} key={step}>
          <span className="timeline-dot" />
          <span>{humanize(step)}</span>
        </li>
      ))}
    </ol>
  );
}

function ComplaintForm({ orderId, onCreate }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onCreate(orderId, { subject, message });
      setSubject("");
      setMessage("");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="complaint-form" onSubmit={submit}>
      <h4>Report an issue with this order</h4>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <label>
        Subject
        <input value={subject} onChange={(event) => setSubject(event.target.value)} minLength={3} maxLength={150} required />
      </label>
      <label>
        Details
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={5000} rows={3} required />
      </label>
      <button className="button button-outline" type="submit" disabled={saving}>
        {saving ? "Submitting..." : "Submit complaint"}
      </button>
    </form>
  );
}

function ComplaintReview({ orderId, complaint, onUpdate }) {
  const [status, setStatus] = useState(complaint.status);
  const [response, setResponse] = useState(complaint.admin_response || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(complaint.status);
    setResponse(complaint.admin_response || "");
  }, [complaint.status, complaint.admin_response]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onUpdate(orderId, complaint.id, { status, admin_response: response });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="complaint-entry">
      <div className="complaint-entry-header">
        <h4>{complaint.subject}</h4>
        <span className={`complaint-status complaint-${complaint.status}`}>{humanize(complaint.status)}</span>
      </div>
      <p className="complaint-message">{complaint.message}</p>
      {complaint.admin_response && <p className="complaint-response"><strong>Admin response:</strong> {complaint.admin_response}</p>}
      <form className="complaint-reply" onSubmit={submit}>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="open">Open</option>
            <option value="in_review">In review</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>
        <label>
          Reply to customer
          <textarea value={response} onChange={(event) => setResponse(event.target.value)} maxLength={5000} rows={2} required={status === "resolved"} />
        </label>
        <button className="button button-outline" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save complaint"}
        </button>
      </form>
    </article>
  );
}

function Orders() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [agents, setAgents] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [notice, setNotice] = useState("");

  const load = async () => {
    try {
      const [currentUser, listedOrders] = await Promise.all([
        apiRequest("/auth/me"),
        getOrders(),
      ]);
      setUser(currentUser);
      setOrders(listedOrders);
      if (currentUser.role === "admin") {
        setAgents(await getDeliveryAgents());
      } else {
        setAgents([]);
      }
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const isAdmin = user?.role === "admin";
  const isDeliveryAgent = user?.role === "delivery_agent";
  const isCustomer = user?.role === "customer";

  const changeStatus = async (order, nextStatus) => {
    setBusyOrderId(order.id);
    setError("");
    setNotice("");
    try {
      const updated = await updateOrderStatus(order.id, nextStatus);
      setOrders((current) => current.map((item) => item.id === order.id ? updated : item));
      setNotice(`${order.order_number} updated to ${humanize(nextStatus)}.`);
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setBusyOrderId(null);
    }
  };

  const changeAgent = async (order, agentId) => {
    setBusyOrderId(order.id);
    setError("");
    setNotice("");
    try {
      const updated = await assignDeliveryAgent(order.id, agentId);
      setOrders((current) => current.map((item) => item.id === order.id ? updated : item));
      setNotice(`${order.order_number} delivery assignment updated.`);
    } catch (assignError) {
      setError(assignError.message);
    } finally {
      setBusyOrderId(null);
    }
  };

  const addComplaint = async (orderId, complaintData) => {
    const complaint = await createOrderComplaint(orderId, complaintData);
    setOrders((current) => current.map((order) => order.id === orderId
      ? { ...order, complaints: [...order.complaints, complaint] }
      : order));
  };

  const saveComplaint = async (orderId, complaintId, update) => {
    const complaint = await updateOrderComplaint(orderId, complaintId, update);
    setOrders((current) => current.map((order) => order.id === orderId
      ? {
          ...order,
          complaints: order.complaints.map((item) => item.id === complaintId ? complaint : item),
        }
      : order));
  };

  const pageTitle = isAdmin ? "Order management" : isDeliveryAgent ? "My deliveries" : "Order tracking";

  return (
    <div className="store-page orders-page">
      <section className="page-intro">
        <div>
          <p className="eyebrow">{isAdmin ? "FULFILMENT" : isDeliveryAgent ? "DELIVERY QUEUE" : "YOUR PURCHASES"}</p>
          <h1>{pageTitle}</h1>
          <p>
            {isAdmin
              ? "Review orders, assign delivery agents, and move orders through fulfilment."
              : isDeliveryAgent
                ? "See your assigned deliveries and update customers as you deliver."
                : "Follow each order from confirmation through cash-on-delivery."}
          </p>
        </div>
        {isCustomer && <Link className="button button-outline" to="/products">Continue shopping</Link>}
      </section>

      {location.state?.newOrderNumber && (
        <p className="notice notice-success" role="status">
          Order {location.state.newOrderNumber} placed successfully. Pay cash when it arrives.
        </p>
      )}
      {notice && <p className="notice notice-success" role="status">{notice}</p>}
      {error && <p className="notice notice-error" role="alert">{error}</p>}

      {loading ? <p className="loading-state">Loading orders...</p> : orders.length ? (
        <div className="order-list">
          {orders.map((order) => {
            const isBusy = busyOrderId === order.id;
            const adminStatuses = ADMIN_NEXT_STATUSES[order.status] || [];
            const agentStatus = order.status === "shipped"
              ? "out_for_delivery"
              : order.status === "out_for_delivery"
                ? "delivered"
                : null;
            return (
              <article className="order-card" key={order.id}>
                <header className="order-card-header">
                  <div>
                    <p className="eyebrow">{order.order_number}</p>
                    <h2>{formatDate(order.created_at)}</h2>
                    {(isAdmin || isDeliveryAgent) && <p className="order-customer">Customer: {order.customer_name} · {order.delivery_phone}</p>}
                  </div>
                  <span className={`order-status status-${order.status}`}>{humanize(order.status)}</span>
                </header>

                <div className="order-content">
                  <section className="order-products" aria-label="Ordered products">
                    {order.items.map((item) => (
                      <div className="order-product-row" key={item.id}>
                        <span>{item.product_name} <small>× {item.quantity}</small></span>
                        <strong>₹{(Number(item.unit_price) * item.quantity).toFixed(2)}</strong>
                      </div>
                    ))}
                    <div className="order-total-row"><span>Total</span><strong>₹{Number(order.total_amount).toFixed(2)}</strong></div>
                  </section>

                  <section className="order-delivery">
                    <h3>Delivery details</h3>
                    <p><strong>{order.delivery_name}</strong></p>
                    <p>{order.delivery_address}, {order.delivery_city} {order.delivery_postal_code}</p>
                    <p>{order.delivery_phone}</p>
                    <p className="order-payment">
                      Cash on delivery · {order.payment_status === "collected" ? "Cash collected" : order.payment_status === "cancelled" ? "Cancelled" : "Payment due on delivery"}
                    </p>
                    {order.delivery_agent_name && <p>Delivery agent: <strong>{order.delivery_agent_name}</strong></p>}
                  </section>
                </div>

                <OrderTimeline order={order} />

                {isAdmin && order.status !== "delivered" && order.status !== "cancelled" && (
                  <div className="order-admin-actions">
                    <label>
                      Delivery agent
                      <select
                        value={order.delivery_agent_id || ""}
                        disabled={isBusy}
                        onChange={(event) => changeAgent(order, event.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {agents.map((agent) => (
                          <option value={agent.id} key={agent.id}>{agent.full_name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Update status
                      <select
                        key={`${order.id}-${order.status}`}
                        defaultValue=""
                        disabled={isBusy || !adminStatuses.length}
                        onChange={(event) => {
                          if (event.target.value) changeStatus(order, event.target.value);
                        }}
                      >
                        <option value="" disabled>{adminStatuses.length ? "Choose next status" : "No further actions"}</option>
                        {adminStatuses.map((nextStatus) => <option value={nextStatus} key={nextStatus}>{humanize(nextStatus)}</option>)}
                      </select>
                    </label>
                  </div>
                )}

                {isDeliveryAgent && agentStatus && (
                  <div className="order-agent-actions">
                    <button className="button button-primary" disabled={isBusy} onClick={() => changeStatus(order, agentStatus)}>
                      {agentStatus === "out_for_delivery" ? "Start delivery" : "Mark as delivered"}
                    </button>
                  </div>
                )}

                <details className="order-history">
                  <summary>Tracking history</summary>
                  <ol>
                    {order.history.map((entry) => (
                      <li key={entry.id}>
                        <span><strong>{entry.event_type === "assignment" ? "Delivery assignment" : humanize(entry.status)}</strong> — {entry.note}</span>
                        <time dateTime={entry.created_at}>{formatDate(entry.created_at)}</time>
                      </li>
                    ))}
                  </ol>
                </details>

                {(isCustomer || isAdmin) && (
                  <section className="order-complaints" aria-label="Order complaints">
                    <h3>{isAdmin ? "Customer complaints" : "Order support"}</h3>
                    {order.complaints.map((complaint) => isAdmin ? (
                      <ComplaintReview
                        key={complaint.id}
                        orderId={order.id}
                        complaint={complaint}
                        onUpdate={saveComplaint}
                      />
                    ) : (
                      <article className="complaint-entry" key={complaint.id}>
                        <div className="complaint-entry-header">
                          <h4>{complaint.subject}</h4>
                          <span className={`complaint-status complaint-${complaint.status}`}>{humanize(complaint.status)}</span>
                        </div>
                        <p className="complaint-message">{complaint.message}</p>
                        {complaint.admin_response && <p className="complaint-response"><strong>Admin response:</strong> {complaint.admin_response}</p>}
                      </article>
                    ))}
                    {isAdmin && order.complaints.length === 0 && <p className="complaint-empty">No complaints for this order.</p>}
                    {isCustomer && <ComplaintForm orderId={order.id} onCreate={addComplaint} />}
                  </section>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <span aria-hidden="true">▤</span>
          <h3>{isCustomer ? "No orders yet" : isDeliveryAgent ? "No deliveries assigned" : "No orders to manage"}</h3>
          <p>{isCustomer ? "Your placed orders and tracking updates will appear here." : isDeliveryAgent ? "Orders assigned to you will appear here." : "Customer orders will appear here when placed."}</p>
          {isCustomer && <Link className="button button-primary" to="/products">Explore products</Link>}
        </div>
      )}
    </div>
  );
}

export default Orders;
