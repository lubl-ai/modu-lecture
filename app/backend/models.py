from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


# ── Buyers ──────────────────────────────────────────────────────────────────
class BuyerCreate(BaseModel):
    name: str
    line_user_id: Optional[str] = None
    contract_rate: Optional[float] = None
    language: str = "ja"


# ── Orders ───────────────────────────────────────────────────────────────────
class OrderCreate(BaseModel):
    buyer_id: str
    promised_delivery_date: date
    notes: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: str


# ── Shipments ────────────────────────────────────────────────────────────────
class ShipmentCreate(BaseModel):
    order_id: str
    departure_date: Optional[date] = None
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None


class ShipmentDelivered(BaseModel):
    actual_delivery_at: datetime


# ── Claims ───────────────────────────────────────────────────────────────────
class ClaimCreate(BaseModel):
    shipment_id: str
    reason: str


class ClaimStatusUpdate(BaseModel):
    status: str
    resolution: Optional[str] = None


# ── Quality Reports ──────────────────────────────────────────────────────────
class QualityReportCreate(BaseModel):
    shipment_id: str
    weight_kg: float
    expected_kg: Optional[float] = None
    freshness_grade: str
    haccp_lot_number: str
    water_temp: Optional[float] = None
