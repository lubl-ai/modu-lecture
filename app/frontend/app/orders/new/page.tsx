'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOrder } from '@/lib/api'

export default function NewOrderPage() {
  const router = useRouter()
  const [buyerId, setBuyerId] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await createOrder({ buyer_id: buyerId, promised_delivery_date: deliveryDate })
      router.push('/orders')
    } catch (err) {
      setError('발주 생성 실패. Backend 연결 확인.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">새 발주 등록</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">바이어 ID</label>
          <input
            type="text"
            value={buyerId}
            onChange={e => setBuyerId(e.target.value)}
            placeholder="UUID 입력"
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">약정 도착일</label>
          <input
            type="date"
            value={deliveryDate}
            onChange={e => setDeliveryDate(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {loading ? '저장 중...' : '발주 등록'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="border px-5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            취소
          </button>
        </div>
      </form>
    </div>
  )
}
