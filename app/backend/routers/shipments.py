from fastapi import APIRouter, HTTPException
from database import supabase
from models import ShipmentCreate, ShipmentDelivered

router = APIRouter()


@router.get("/")
async def list_shipments():
    result = (
        supabase.table("shipments")
        .select("*, orders(buyer_id, promised_delivery_date)")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/{shipment_id}")
async def get_shipment(shipment_id: str):
    result = (
        supabase.table("shipments")
        .select("*, orders(*), quality_reports(*), tracking_links(*)")
        .eq("id", shipment_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return result.data


@router.post("/", status_code=201)
async def create_shipment(shipment: ShipmentCreate):
    data = shipment.model_dump()
    if data.get("departure_date"):
        data["departure_date"] = str(data["departure_date"])
    result = supabase.table("shipments").insert(data).execute()
    return result.data[0]


@router.put("/{shipment_id}/deliver")
async def mark_delivered(shipment_id: str, body: ShipmentDelivered):
    result = (
        supabase.table("shipments")
        .update({
            "status": "DELIVERED",
            "actual_delivery_at": body.actual_delivery_at.isoformat(),
        })
        .eq("id", shipment_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return result.data[0]


@router.get("/{shipment_id}/tracking")
async def get_tracking(shipment_id: str):
    result = (
        supabase.table("tracking_links")
        .select("*")
        .eq("shipment_id", shipment_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Tracking link not found")
    return result.data[0]
