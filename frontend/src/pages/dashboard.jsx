import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest, getProducts } from "../services/api.js";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [userCount, setUserCount] = useState(null);
  const [orderCount, setOrderCount] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        const [currentUser, catalog] = await Promise.all([
          apiRequest("/auth/me"),
          getProducts(),
        ]);
        if (!active) return;
        setUser(currentUser);
        setProducts(catalog);
        if (currentUser.role === "admin") {
          const users = await apiRequest("/users/");
          if (active) setUserCount(users.length);
        } else if (currentUser.role === "delivery_agent") {
          const orders = await apiRequest("/orders/");
          if (active) setOrderCount(orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length);
        }
      } catch (loadError) {
        if (active) setError(loadError.message);
      }
    }
    loadDashboard();
    return () => { active = false; };
  }, []);

  const isAdmin = user?.role === "admin";
  const isDeliveryAgent = user?.role === "delivery_agent";

  return (
    <div className="store-dashboard">
      <section className="store-hero">
        <div>
          <p className="eyebrow">{isAdmin ? "STORE OVERVIEW" : isDeliveryAgent ? "DELIVERY OVERVIEW" : "WELCOME TO YOUR STORE"}</p>
          <h1>{isAdmin ? "Welcome back" : `Hello${user?.full_name ? `, ${user.full_name}` : ""}!`}</h1>
          <p>{isAdmin ? "Your products, customers, and orders in one place." : isDeliveryAgent ? "Your assigned deliveries and their latest status." : "Find something you love and add it to your cart."}</p>
          <Link className="button button-light" to={isDeliveryAgent ? "/orders" : "/products"}>
            {isAdmin ? "Manage products" : isDeliveryAgent ? "View my deliveries" : "Browse products"}
          </Link>
        </div>
        <div className="hero-mark" aria-hidden="true">SHOP</div>
      </section>

      {error && <p className="notice notice-error" role="alert">{error}</p>}

      <section className="store-stat-grid">
        <article className="store-stat">
          <span>{isAdmin ? "Active products" : "Products to explore"}</span>
          <strong>{products.length}</strong>
          <small>{isAdmin ? "Available in your store" : "Ready to shop"}</small>
        </article>
        {isAdmin ? (
          <article className="store-stat">
            <span>Registered users</span>
            <strong>{userCount ?? "—"}</strong>
            <small>Customers and administrators</small>
          </article>
        ) : isDeliveryAgent ? (
          <article className="store-stat">
            <span>Active deliveries</span>
            <strong>{orderCount ?? "—"}</strong>
            <small><Link to="/orders">Open delivery queue</Link></small>
          </article>
        ) : (
          <article className="store-stat">
            <span>Your shopping cart</span>
            <strong>♡</strong>
            <small><Link to="/cart">Review your saved items</Link></small>
          </article>
        )}
      </section>

      <section className="dashboard-section-heading">
        <div>
          <p className="eyebrow">{isAdmin ? "STORE INVENTORY" : "CURATED FOR YOU"}</p>
          <h2>{isAdmin ? "Recently added products" : "Featured products"}</h2>
        </div>
        <Link to="/products">View all <span aria-hidden="true">→</span></Link>
      </section>
      {products.length ? (
        <div className="product-grid">
          {products.slice(0, 4).map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-image">
                {product.image_url
                  ? <img src={product.image_url} alt={product.name} />
                  : <span aria-hidden="true">✦</span>}
              </div>
              <div className="product-card-body">
                <span className="product-category">{product.category}</span>
                <h3>{product.name}</h3>
                <strong className="product-price">₹{Number(product.price).toFixed(2)}</strong>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span aria-hidden="true">✦</span>
          <h3>{isAdmin ? "Your store is ready for its first product" : "The store is getting ready"}</h3>
          <p>{isAdmin ? "Add a product to make it available to customers." : "Please check back soon for new products."}</p>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
