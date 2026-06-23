from fastapi import APIRouter, HTTPException
from database import supabase
from models import OrderCreate, OrderStatusUpdate

router = APIRouter()


@router.get("/")
async def list_orders():
    result = supabase.table("orders").select("*, buyers(name)").order("created_at", desc=True).execute()
    return result.data


@router.get("/{order_id}")
async def get_order(order_id: str):
    result = (
        supabase.table("orders")
        .select("*, buyers(name), order_items(*)")
        .eq("id", order_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Order not found")
    return result.data


@router.post("/", status_code=201)
async def create_order(order: OrderCreate):
    result = supabase.table("orders").insert(order.model_dump()).execute()
    return result.data[0]


@router.put("/{order_id}/confirm")
async def confirm_order(order_id: str):
    from datetime import datetime, timezone
    result = (
        supabase.table("orders")
        .update({"status": "CONFIRMED", "confirmed_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", order_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Order not found")
    return result.data[0]


@router.put("/{order_id}/status")
async def update_order_status(order_id: str, body: OrderStatusUpdate):
    result = (
        supabase.table("orders")
        .update({"status": body.status})
        .eq("id", order_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Order not found")
    return result.data[0]
