import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="bg-gray-900 text-white px-6 py-3 flex items-center gap-6">
      <span className="font-bold text-lg tracking-tight">GEUMTAE Export</span>
      <Link href="/" className="text-gray-300 hover:text-white text-sm">대시보드</Link>
      <Link href="/orders" className="text-gray-300 hover:text-white text-sm">발주</Link>
      <Link href="/claims" className="text-gray-300 hover:text-white text-sm">클레임</Link>
    </nav>
  )
}
