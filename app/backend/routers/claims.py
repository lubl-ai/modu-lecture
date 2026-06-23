from fastapi import APIRouter, HTTPException
from database import supabase
from models import ClaimCreate, ClaimStatusUpdate

router = APIRouter()


@router.get("/")
async def list_claims():
    result = (
        supabase.table("claims")
        .select("*, shipments(order_id, carrier, tracking_number)")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/pending")
async def list_pending_claims():
    result = (
        supabase.table("claims")
        .select("*, shipments(order_id)")
        .not_.in_("status", ["RESOLVED", "CLOSED"])
        .order("deadline")
        .execute()
    )
    return result.data


@router.get("/{claim_id}")
async def get_claim(claim_id: str):
    result = (
        supabase.table("claims")
        .select("*, shipments(*)")
        .eq("id", claim_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Claim not found")
    return result.data


@router.post("/", status_code=201)
async def create_claim(claim: ClaimCreate):
    result = supabase.table("claims").insert(claim.model_dump()).execute()
    return result.data[0]


@router.put("/{claim_id}/status")
async def update_claim_status(claim_id: str, body: ClaimStatusUpdate):
    update_data = {"status": body.status}
    if body.resolution:
        update_data["resolution"] = body.resolution
    if body.status == "RESOLVED":
        from datetime import datetime, timezone
        update_data["resolved_at"] = datetime.now(timezone.utc).isoformat()

    result = (
        supabase.table("claims")
        .update(update_data)
        .eq("id", claim_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Claim not found")
    return result.data[0]
