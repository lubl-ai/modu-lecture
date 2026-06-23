'use client'

import { useEffect, useState } from 'react'
import { getClaims, updateClaimStatus, Claim } from '@/lib/api'
import StatusBadge from '@/components/StatusBadge'

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const data = await getClaims().catch(() => [])
    setClaims(data)
    setLoading(false)
  }

  async function handleResolve(id: string) {
    await updateClaimStatus(id, 'RESOLVED').catch(() => null)
    load()
  }

  useEffect(() => { load() }, [])

  const pending = claims.filter(c => c.status === 'RECEIVED' || c.status === 'REVIEWING')
  const resolved = claims.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED')

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">클레임 관리</h1>

      {loading && <p className="text-gray-400 text-sm">불러오는 중...</p>}

      {/* 미처리 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          미처리 <span className="text-red-500">({pending.length})</span>
        </h2>
        <div className="bg-white rounded-lg border divide-y">
          {pending.length === 0 && (
            <p className="p-4 text-gray-400 text-sm text-center">미처리 클레임 없음</p>
          )}
          {pending.map(claim => (
            <div key={claim.id} className="flex items-center justify-between px-4 py-4">
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium text-gray-900">{claim.reason}</p>
                <p className="text-xs text-gray-500 font-mono">납품 ID: {claim.shipment_id.slice(0, 8)}</p>
                <p className="text-xs text-red-500">처리 기한: {new Date(claim.deadline).toLocaleString('ko-KR')}</p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <StatusBadge status={claim.status} />
                <button
                  onClick={() => handleResolve(claim.id)}
                  className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700">
                  처리 완료
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 처리 완료 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">처리 완료 ({resolved.length})</h2>
        <div className="bg-white rounded-lg border divide-y">
          {resolved.length === 0 && (
            <p className="p-4 text-gray-400 text-sm text-center">없음</p>
          )}
          {resolved.map(claim => (
            <div key={claim.id} className="flex items-center justify-between px-4 py-3 opacity-60">
              <div>
                <p className="text-sm text-gray-700">{claim.reason}</p>
                <p className="text-xs text-gray-400">{new Date(claim.created_at).toLocaleDateString('ko-KR')}</p>
              </div>
              <StatusBadge status={claim.status} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
