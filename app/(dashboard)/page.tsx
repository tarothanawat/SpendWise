import { getDashboardSummary, getExpenses } from '@/app/apis/expenses'
import { Navbar } from '@/components/navbar'
import { getDateRange } from '@/lib/utils/date'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const { startDate, endDate } = getDateRange('last30')
  const summary = await getDashboardSummary(startDate, endDate)
  const expensesResult = await getExpenses(startDate, endDate, undefined, 'date-desc', 1, 5)

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <DashboardClient initialSummary={summary} initialExpenses={expensesResult.data} />
    </div>
  )
}
