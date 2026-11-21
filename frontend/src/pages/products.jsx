import { useEffect, useState } from "react";
import { apiRequest, addCartItem, getProducts } from "../services/api.js";

const emptyForm = {
  name: "",
  description: "",
  category: "",
  price: "",
  stock: "",
  image_url: "",
};

function Products() {
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [currentUser, items] = await Promise.all([
        apiRequest("/auth/me"),
        getProducts(),
      ]);
      setUser(currentUser);
      setProducts(items);
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const isAdmin = user?.role === "admin";
  const shownProducts = products.filter((product) =>
    `${product.name} ${product.category} ${product.description}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const payload = {
      ...form,
      price: Number(form.price),
      stock: Number(form.stock),
      category: form.category.trim() || "General",
    };
    try {
      await apiRequest(editingId ? `/products/${editingId}` : "/products/", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setMessage(editingId ? "Product updated." : "Product created.");
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const beginEdit = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      stock: product.stock,
      image_url: product.image_url,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleProduct = async (product) => {
    setError("");
    setMessage("");
    try {
      await apiRequest(`/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !product.is_active }),
      });
      setMessage(product.is_active ? "Product hidden from the shop." : "Product is now available.");
      await load();
    } catch (updateError) {
      setError(updateError.message);
    }
  };

  const addToCart = async (product) => {
    setError("");
    setMessage("");
    try {
      await addCartItem(product.id);
      setMessage(`${product.name} added to your cart.`);
    } catch (cartError) {
      setError(cartError.message);
    }
  };

  return (
    <div className="store-page">
      <section className="page-intro">
        <div>
          <p className="eyebrow">{isAdmin ? "CATALOG MANAGEMENT" : "THE COLLECTION"}</p>
          <h1>{isAdmin ? "Your products" : "Shop products"}</h1>
          <p>{isAdmin ? "Create, update, and manage the products customers can buy." : "Browse the collection and add your favorites to your cart."}</p>
        </div>
        <label className="search-field">
          <span className="visually-hidden">Search products</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products..." />
        </label>
      </section>

      {message && <p className="notice notice-success" role="status">{message}</p>}
      {error && <p className="notice notice-error" role="alert">{error}</p>}

      {isAdmin && (
        <section className="admin-product-form">
          <div className="form-section-title">
            <div>
              <p className="eyebrow">{editingId ? "EDIT LISTING" : "NEW LISTING"}</p>
              <h2>{editingId ? "Update product details" : "Add a product"}</h2>
            </div>
            {editingId && (
              <button className="button button-quiet" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                Cancel edit
              </button>
            )}
          </div>
          <form className="product-form" onSubmit={handleSubmit}>
            <label>Product name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={150} required /></label>
            <label>Category<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} maxLength={80} placeholder="General" /></label>
            <label>Price (₹)<input type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} min="0.01" step="0.01" required /></label>
            <label>Stock<input type="number" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} min="0" step="1" required /></label>
            <label className="form-wide">Image URL<input type="url" value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })} maxLength={1000} placeholder="https://..." /></label>
            <label className="form-wide">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={10000} rows={3} /></label>
            <div className="form-wide"><button className="button button-primary" type="submit">{editingId ? "Save changes" : "Add product"}</button></div>
          </form>
        </section>
      )}

      {loading ? <p className="loading-state">Loading products...</p> : shownProducts.length ? (
        <div className="product-grid">
          {shownProducts.map((product) => (
            <article className={`product-card${product.is_active ? "" : " product-card-inactive"}`} key={product.id}>
              <div className="product-image">
                {product.image_url ? <img src={product.image_url} alt={product.name} /> : <span aria-hidden="true">✦</span>}
                {!product.is_active && <span className="product-badge">Hidden</span>}
              </div>
              <div className="product-card-body">
                <span className="product-category">{product.category}</span>
                <h3>{product.name}</h3>
                <p className="product-description">{product.description || "A great addition to your collection."}</p>
                <div className="product-card-meta">
                  <strong className="product-price">₹{Number(product.price).toFixed(2)}</strong>
                  <span>{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</span>
                </div>
                {isAdmin ? (
                  <div className="product-actions">
                    <button className="button button-outline" onClick={() => beginEdit(product)}>Edit</button>
                    <button className="button button-quiet" onClick={() => toggleProduct(product)}>{product.is_active ? "Hide" : "Publish"}</button>
                  </div>
                ) : (
                  <button className="button button-primary product-add" disabled={!product.stock} onClick={() => addToCart(product)}>
                    {product.stock ? "Add to cart" : "Sold out"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state"><span aria-hidden="true">⌕</span><h3>No products found</h3><p>Try a different search or check back later.</p></div>
      )}
    </div>
  );
}

export default Products;
