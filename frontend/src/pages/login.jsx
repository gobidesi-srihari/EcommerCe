import { useState } from "react";
import { apiRequest } from "../services/api.js";

function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const endpoint = isRegistering ? "/auth/register" : "/auth/login";
      const payload = isRegistering
        ? { full_name: fullName, username, password }
        : { username, password };
      const data = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      localStorage.setItem("access_token", data.access_token);
      const appBasePath = window.location.pathname.startsWith("/maam")
        ? "/maam"
        : window.location.pathname.startsWith("/ecommerce")
          ? "/ecommerce"
          : "";
      window.location.href = `${appBasePath}/dashboard`;
    } catch (error) {
      setMessage(error.message || "Unable to continue. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-aside">
        <div className="auth-brand">ECOMMERCE<span>Storefront</span></div>
        <div className="auth-pitch">
          <p className="eyebrow">A BETTER WAY TO SHOP</p>
          <h1>Find your next favorite thing.</h1>
          <p>Discover products, keep your picks in one place, and shop at your pace.</p>
          <div className="auth-decoration" aria-hidden="true">✦</div>
        </div>
        <p className="auth-footnote">Simple shopping starts here.</p>
      </div>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <p className="eyebrow">{isRegistering ? "JOIN THE STORE" : "WELCOME BACK"}</p>
          <h2>{isRegistering ? "Create your account" : "Sign in to your account"}</h2>
          <p className="auth-subtitle">
            {isRegistering ? "Create a customer account to start shopping." : "Enter your details to continue."}
          </p>
          <form onSubmit={handleSubmit}>
            {isRegistering && (
              <label>
                Full name
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  autoComplete="name"
                  maxLength={150}
                  required
                />
              </label>
            )}
            <label>
              Username
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                minLength={3}
                maxLength={50}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isRegistering ? "new-password" : "current-password"}
                minLength={isRegistering ? 8 : undefined}
                required
              />
            </label>
            {message && <p className="notice notice-error" role="alert">{message}</p>}
            <button className="button button-primary auth-submit" type="submit" disabled={loading}>
              {loading ? "Please wait..." : isRegistering ? "Create account" : "Sign in"}
            </button>
          </form>
          <p className="auth-switch">
            {isRegistering ? "Already have an account?" : "New to the store?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsRegistering((current) => !current);
                setMessage("");
              }}
            >
              {isRegistering ? "Sign in" : "Create a customer account"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;
