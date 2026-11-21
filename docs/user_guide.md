# Local Setup and User Guide

## 1. Configure PostgreSQL

Install PostgreSQL and create the configured database. To use the default
project database, run `database/create_database.sql` once while connected
to the PostgreSQL `postgres` database. If it already exists, skip creation.

Set `DB_HOST`, `DB_PORT`, `DB_NAME=ecommerce_db`, `DB_USER`, `DB_PASSWORD`,
and `JWT_SECRET_KEY` in `backend/.env`. Do not commit this file.

From `backend`, install dependencies and create/update the ecommerce
tables:

```powershell
python -m pip install -r requirements.txt
python create_tables.py
```

The table setup converts prior non-admin application roles to `customer`.
Create the first administrator interactively:

```powershell
python create_admin.py
```

## 2. Run the application

In one terminal:

```powershell
cd backend
python -m uvicorn main:app --reload
```

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal. The API documentation is
available at `http://127.0.0.1:8000/docs` when using the default backend
port.

## 3. Shop and manage the store

- Sign in with an administrator account to add, edit, publish, and hide
  products, create customers and delivery agents, and manage orders.
- Customers can create their own account from the sign-in page. Customer
  accounts can browse active products and add available quantities to
  their personal cart. At checkout, enter a delivery phone number and
  address, then place the **Cash on delivery** order. The delivery details
  are saved to the customer account and prefilled at the next checkout. The
  order number and status timeline appear under **My Orders**.
- Customers can submit one or more complaints against each order from
  **My Orders** and see the admin's response and complaint status. Admins
  review and respond to complaints in **Order management**.
- Admins review all orders, move them through confirmation and packing,
  assign an active delivery agent, and mark them shipped. Admins can cancel
  orders before dispatch; reserved stock is returned.
- Delivery agents see only orders assigned to them. They mark a shipped
  order **Out for delivery**, then mark it delivered; doing so records COD
  cash as collected.
- Orders retain the purchased item names and prices. This version does not
  integrate a payment gateway, live GPS, shipping rates, or notifications.
