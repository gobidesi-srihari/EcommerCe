
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.auth import login as login_endpoint
from routers.auth import router as auth_router
from routers.users import router as users_router
from routers.products import router as products_router
from routers.cart import router as cart_router
from routers.orders import router as orders_router
from routers.customers import router as customers_router
from schemas.auth import TokenResponse

app = FastAPI(
    title="Ecommerce API",
    description="Product catalog and customer cart API",
    version="1.0.0"
)

# Frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "Content-Disposition",
        "X-Equipment-Export-Token",
    ],
)

# Register API routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(products_router)
app.include_router(cart_router)
app.include_router(orders_router)
app.include_router(customers_router)
app.add_api_route(
    "/login",
    login_endpoint,
    methods=["POST"],
    response_model=TokenResponse,
    include_in_schema=False,
)


@app.get("/")
def home():
    return {
        "message": "Ecommerce API is running successfully"
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "service": "Ecommerce API"
    }
