
import Sidebar from "../components/Sidebar.jsx";
import Header from "../components/Header.jsx";
import { Outlet } from "react-router-dom";

function MainLayout() {
  return (
    <div className="app-layout">

      <Sidebar />

      <div className="main-content">

        <Header />

        <main className="page-content">
          <Outlet />
        </main>

        <footer className="copyright-footer">
          <p>
            © 2026 Ecommerce. All rights reserved.
          </p>
          <span>Shopping made simple</span>
        </footer>

      </div>

    </div>
  );
}

export default MainLayout;
