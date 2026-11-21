# Ecommerce Application Architecture

The project is a small full-stack store built with React/Vite, FastAPI,
SQLAlchemy, and PostgreSQL.

## Structure

```text
ecommerce/
├── backend/
│   ├── models/       # SQLAlchemy entities: users, products, carts, orders, addresses, complaints
│   ├── routers/      # Authentication, users, products, cart, orders
│   ├── schemas/      # Request and response models
│   ├── main.py       # FastAPI app and active API registration
│   ├── database.py   # PostgreSQL connection from backend/.env
│   └── create_tables.py
├── database/
│   ├── create_database.sql
│   └── schema.sql
├── docs/
└── frontend/
    └── src/
        ├── components/ # Shared navigation and header
        ├── layouts/    # Authenticated page shell
        ├── pages/      # Login, dashboard, products, cart, orders, users
        ├── services/   # Authenticated API client
        ├── styles/
        ├── app.jsx
        └── main.jsx
```

## Roles and routes

- **Admin:** dashboard, product catalog management, and user management.
- **Customer:** dashboard, active product catalog, and their own cart.
- **Delivery agent:** dashboard and only orders assigned to that agent.
- Admins create and deactivate delivery-agent accounts through user
  management. Active orders must be reassigned before an agent account is
  deactivated or changed to another role.
- Customer self-registration always assigns the `customer` role.
- Backend authorization protects product writes, user administration, and
  customer-specific cart and order operations; hiding a page in the UI is
  not the authorization boundary.

## Active API

- `POST /auth/login`, `POST /auth/register`, `GET /auth/me`
- `/users/` for admin user creation and management
- `GET /products/` for the catalog; admin-only `POST`, `PATCH`, and `DELETE`
- `GET /cart/`, `POST /cart/items`, `PATCH /cart/items/{id}`, and
  `DELETE /cart/items/{id}` for the authenticated customer's cart
- `POST /orders/` creates a COD order from the customer's cart, checks and
  reserves stock, stores delivery details and price snapshots, and clears
  the cart in one transaction.
- `GET /orders/` returns only the current customer's orders, all orders to
  admins, or orders assigned to the current delivery agent.
- `PATCH /orders/{id}/assignment` assigns an active delivery agent (admin).
- `PATCH /orders/{id}/status` advances an order through placed, confirmed,
  packed, and shipped by admins; the assigned delivery agent then marks it
  out-for-delivery and delivered. Admins can cancel before dispatch.
- `GET /orders/delivery-agents` lists active agents for admin assignment.
- `GET /customers/me/address` returns the signed-in customer's saved checkout
  address; successful checkout creates or updates it in the order transaction.
- `POST /orders/{id}/complaints` lets a customer report an issue on their own
  order. `PATCH /orders/{id}/complaints/{complaint_id}` lets an admin update
  its status and response.

Products are deactivated rather than physically deleted so past cart
references are retained. Orders retain product-name and unit-price
snapshots. Stock is restored if an admin cancels before dispatch. Cash is
marked collected when an assigned agent marks an order delivered. This
version does not integrate a payment gateway, live GPS, or delivery
notifications. Customer addresses are reusable defaults, while each order
keeps its own address snapshot. The table setup initializes new address and
complaint tables and copies each customer's most recent order address when
no saved address exists.

The former substation/location, asset-scheduling, transformer-report, and
inspection endpoints are no longer registered by the FastAPI application.
