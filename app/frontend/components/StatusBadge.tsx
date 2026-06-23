const COLOR: Record<string, string> = {
  DRAFT:       'bg-gray-100 text-gray-700',
  CONFIRMED:   'bg-blue-100 text-blue-700',
  IN_TRANSIT:  'bg-yellow-100 text-yellow-700',
  DELIVERED:   'bg-green-100 text-green-700',
  CLOSED:      'bg-gray-200 text-gray-500',
  RECEIVED:    'bg-red-100 text-red-700',
  REVIEWING:   'bg-orange-100 text-orange-700',
  APPROVED:    'bg-blue-100 text-blue-700',
  RESOLVED:    'bg-green-100 text-green-700',
}

const LABEL: Record<string, string> = {
  DRAFT: '초안', CONFIRMED: '확정', IN_TRANSIT: '운송중',
  DELIVERED: '도착', CLOSED: '완료',
  RECEIVED: '접수', REVIEWING: '검토중', APPROVED: '승인', RESOLVED: '처리완료',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${COLOR[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {LABEL[status] ?? status}
    </span>
  )
}
