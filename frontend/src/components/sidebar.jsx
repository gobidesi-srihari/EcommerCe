
import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api.js";

function Sidebar() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);

  // Get logged-in user's role from FastAPI
  useEffect(() => {
    let active = true;

    const fetchUser = async () => {
      try {
        const user = await apiRequest("/auth/me");

        if (active) {
          setUserRole(user.role);
        }
      } catch (error) {
        console.error("Unable to retrieve user role:", error);

        if (active) {
          setUserRole(null);
        }
      }
    };

    fetchUser();

    return () => {
      active = false;
    };
  }, []);

  // Storefront is shared; cart is restricted to customer accounts.
  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: "⌂"
    },
    {
      name: userRole === "admin" ? "Products" : "Shop Products",
      path: "/products",
      icon: "▦"
    }
  ];

  if (userRole === "admin") {
    menuItems.push({
      name: "User Management",
      path: "/users",
      icon: "♙"
    });
    menuItems.push({
      name: "Orders",
      path: "/orders",
      icon: "▤"
    });
  } else if (userRole === "customer") {
    menuItems.push({
      name: "Shopping Cart",
      path: "/cart",
      icon: "🛒"
    });
    menuItems.push({
      name: "My Orders",
      path: "/orders",
      icon: "▤"
    });
  } else if (userRole === "delivery_agent") {
    menuItems.push({
      name: "My Deliveries",
      path: "/orders",
      icon: "▤"
    });
  }

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("isLoggedIn");

    navigate("/", { replace: true });
    window.location.reload();
  };

  return (
    <aside className="sidebar">

      <div className="sidebar-brand">
        <h2>ECOMMERCE</h2>
        <p>Simple store management</p>
        <span>
          {userRole === "admin"
            ? "Administrator"
            : userRole === "delivery_agent"
              ? "Delivery team"
              : "Customer store"}
        </span>
      </div>

      <nav className="sidebar-menu">
        <p className="menu-heading">MAIN MENU</p>

        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive
                ? "sidebar-link active"
                : "sidebar-link"
            }
          >
            <span>{item.icon}</span>
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="sidebar-logout"
          onClick={handleLogout}
        >
          <span>🚪</span>
          Logout
        </button>
      </div>

    </aside>
  );
}

export default Sidebar;
