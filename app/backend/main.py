from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import orders, shipments, claims

app = FastAPI(title="GEUMTAE Export API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(orders.router, prefix="/api/orders", tags=["orders"])
app.include_router(shipments.router, prefix="/api/shipments", tags=["shipments"])
app.include_router(claims.router, prefix="/api/claims", tags=["claims"])


@app.get("/health")
async def health():
    return {"status": "ok"}
