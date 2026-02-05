import { getCategories, getExpenses } from '@/app/apis/expenses'
import { Navbar } from '@/components/navbar'
import { getDateRange } from '@/lib/utils/date'
import { ExpensesClient } from './expenses-client'

export default async function ExpensesPage() {
  const categories = await getCategories()
  const { startDate, endDate } = getDateRange('last30')
  const expensesResult = await getExpenses(startDate, endDate, undefined, 'date-desc', 1, 10)

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <ExpensesClient initialCategories={categories} initialExpenses={expensesResult.data} />
    </div>
  )
}
