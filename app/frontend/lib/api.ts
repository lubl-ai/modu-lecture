const API_URL = process.env.NEXT_PUBLIC_API_URL

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

// Orders
export const getOrders = () => request<Order[]>('/api/orders/')
export const getOrder = (id: string) => request<Order>(`/api/orders/${id}`)
export const createOrder = (data: CreateOrderInput) =>
  request<Order>('/api/orders/', { method: 'POST', body: JSON.stringify(data) })

// Shipments
export const getShipments = () => request<Shipment[]>('/api/shipments/')

// Claims
export const getClaims = () => request<Claim[]>('/api/claims/')
export const updateClaimStatus = (id: string, status: string) =>
  request<Claim>(`/api/claims/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })

// Types
export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'IN_TRANSIT' | 'DELIVERED' | 'CLOSED'
export type ClaimStatus = 'RECEIVED' | 'REVIEWING' | 'APPROVED' | 'RESOLVED' | 'CLOSED'

export interface Order {
  id: string
  buyer_id: string
  promised_delivery_date: string
  status: OrderStatus
  created_at: string
  buyer?: { name: string }
}

export interface Shipment {
  id: string
  order_id: string
  carrier: string
  tracking_number: string
  status: string
  created_at: string
}

export interface Claim {
  id: string
  shipment_id: string
  reason: string
  status: ClaimStatus
  deadline: string
  created_at: string
}

export interface CreateOrderInput {
  buyer_id: string
  promised_delivery_date: string
}
