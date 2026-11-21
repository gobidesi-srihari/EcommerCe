import { useEffect, useState } from "react";
import { apiRequest } from "../services/api.js";

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [form, setForm] = useState({ full_name: "", username: "", password: "", role: "customer" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      const [current, listed] = await Promise.all([
        apiRequest("/auth/me"),
        apiRequest("/users/"),
      ]);
      setCurrentUser(current);
      setUsers(listed);
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const createUser = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const created = await apiRequest("/users/", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage(`Account for ${created.username} created.`);
      setForm({ full_name: "", username: "", password: "", role: "customer" });
      await loadUsers();
    } catch (createError) {
      setError(createError.message);
    }
  };

  const updateUser = async (user, payload, successMessage) => {
    setError("");
    setMessage("");
    try {
      await apiRequest(`/users/${user.id}/${payload.role ? "role" : "status"}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setMessage(successMessage);
      await loadUsers();
    } catch (updateError) {
      setError(updateError.message);
    }
  };

  return (
    <div className="store-page user-management-page">
      <section className="page-intro">
        <div><p className="eyebrow">ADMINISTRATION</p><h1>User management</h1><p>Create customers and delivery agents, and manage store access.</p></div>
      </section>
      {message && <p className="notice notice-success" role="status">{message}</p>}
      {error && <p className="notice notice-error" role="alert">{error}</p>}

      <section className="admin-product-form">
        <div className="form-section-title"><div><p className="eyebrow">NEW ACCOUNT</p><h2>Create a user</h2></div></div>
        <form className="product-form" onSubmit={createUser}>
          <label>Full name<input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} maxLength={150} required /></label>
          <label>Username<input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} minLength={3} maxLength={50} required /></label>
          <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={8} required /></label>
          <label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="customer">Customer</option><option value="delivery_agent">Delivery agent</option><option value="admin">Admin</option></select></label>
          <div className="form-wide"><button className="button button-primary" type="submit">Create account</button></div>
        </form>
      </section>

      <section className="user-list-card">
        <div className="form-section-title"><div><p className="eyebrow">ACCESS</p><h2>All users <span className="user-count">{users.length}</span></h2></div></div>
        {loading ? <p className="loading-state">Loading users...</p> : (
          <div className="user-table-wrap">
            <table className="user-table">
              <thead><tr><th>User</th><th>Username</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td><strong>{user.full_name}</strong></td>
                    <td>{user.username}</td>
                    <td>
                      <select
                        aria-label={`Role for ${user.username}`}
                        value={user.role}
                        disabled={user.id === currentUser?.id}
                        onChange={(event) => updateUser(user, { role: event.target.value }, `${user.username}'s role updated.`)}
                      >
                        <option value="customer">Customer</option><option value="delivery_agent">Delivery agent</option><option value="admin">Admin</option>
                      </select>
                    </td>
                    <td><span className={`user-status ${user.is_active ? "status-active" : "status-inactive"}`}>{user.is_active ? "Active" : "Inactive"}</span></td>
                    <td>
                      <button
                        className="button button-quiet"
                        disabled={user.id === currentUser?.id}
                        onClick={() => updateUser(user, { is_active: !user.is_active }, `${user.username} ${user.is_active ? "deactivated" : "activated"}.`)}
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!users.length && <tr><td colSpan="5">No users yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default UserManagement;
