'use client'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Wallet } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2 font-bold text-xl text-primary">
              <Wallet className="h-6 w-6" />
              <span>SpendWise</span>
            </Link>
            <div className="hidden md:flex space-x-4">
              <Link href="/">
                <Button variant={pathname === '/' ? 'default' : 'ghost'}>
                  Dashboard
                </Button>
              </Link>
              <Link href="/expenses">
                <Button variant={pathname === '/expenses' ? 'default' : 'ghost'}>
                  Expenses
                </Button>
              </Link>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  )
}
