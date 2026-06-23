import { getOrders, getClaims, getShipments } from '@/lib/api'
import StatusBadge from '@/components/StatusBadge'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [orders, claims, shipments] = await Promise.all([
    getOrders().catch(() => []),
    getClaims().catch(() => []),
    getShipments().catch(() => []),
  ])

  const slaCompliant = orders.filter(o => o.status === 'DELIVERED').length
  const totalDelivered = orders.filter(o => o.status === 'DELIVERED').length
  const pendingClaims = claims.filter(c => c.status === 'RECEIVED' || c.status === 'REVIEWING').length
  const inTransit = shipments.filter(s => s.status === 'IN_TRANSIT').length

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">운영 대시보드</h1>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="전체 발주" value={orders.length} />
        <KpiCard label="운송중" value={inTransit} color="yellow" />
        <KpiCard label="미처리 클레임" value={pendingClaims} color="red" />
        <KpiCard label="납기 준수 (도착 완료)" value={totalDelivered} color="green" />
      </div>

      {/* 최근 발주 */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-800">최근 발주</h2>
          <Link href="/orders" className="text-sm text-blue-600 hover:underline">전체 보기 →</Link>
        </div>
        <div className="bg-white rounded-lg border divide-y">
          {orders.length === 0 && (
            <p className="p-4 text-gray-400 text-sm">발주 없음</p>
          )}
          {orders.slice(0, 5).map(order => (
            <Link key={order.id} href={`/orders/${order.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">#{order.id.slice(0, 8)}</p>
                <p className="text-xs text-gray-500">약정 도착일: {order.promised_delivery_date}</p>
              </div>
              <StatusBadge status={order.status} />
            </Link>
          ))}
        </div>
      </section>

      {/* 미처리 클레임 */}
      {pendingClaims > 0 && (
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-gray-800">미처리 클레임</h2>
            <Link href="/claims" className="text-sm text-blue-600 hover:underline">전체 보기 →</Link>
          </div>
          <div className="bg-white rounded-lg border divide-y">
            {claims.filter(c => c.status === 'RECEIVED' || c.status === 'REVIEWING').slice(0, 3).map(claim => (
              <div key={claim.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{claim.reason}</p>
                  <p className="text-xs text-gray-500">기한: {new Date(claim.deadline).toLocaleString('ko-KR')}</p>
                </div>
                <StatusBadge status={claim.status} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function KpiCard({ label, value, color = 'gray' }: { label: string; value: number; color?: string }) {
  const colors: Record<string, string> = {
    gray: 'text-gray-900',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    green: 'text-green-600',
  }
  return (
    <div className="bg-white rounded-lg border p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colors[color]}`}>{value}</p>
    </div>
  )
}
