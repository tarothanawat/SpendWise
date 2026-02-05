'use client'

import { getDashboardSummary, getExpenses } from '@/app/apis/expenses'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate, getDateRange, type TimePeriod } from '@/lib/utils/date'
import { Calendar, DollarSign, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'

type Summary = {
  total: number
  count: number
  byCategory: Array<{ name: string; total: number; count: number }>
}

type Expense = {
  id: string
  amount: number
  date: Date
  note: string | null
  category: { name: string }
}

export function DashboardClient({
  initialSummary,
  initialExpenses,
}: {
  initialSummary: Summary
  initialExpenses: Expense[]
}) {
  const [period, setPeriod] = useState<TimePeriod>('last30')
  const [summary, setSummary] = useState(initialSummary)
  const [recentExpenses, setRecentExpenses] = useState(initialExpenses)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { startDate, endDate } = getDateRange(period)
      const [newSummary, expensesResult] = await Promise.all([
        getDashboardSummary(startDate, endDate),
        getExpenses(startDate, endDate, undefined, 'date-desc', 1, 5),
      ])
      setSummary(newSummary)
      setRecentExpenses(expensesResult.data)
      setLoading(false)
    }
    fetchData()
  }, [period])

  const maxCategoryTotal = Math.max(...summary.byCategory.map(c => c.total), 1)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="w-48">
          <Select value={period} onValueChange={(value) => setPeriod(value as TimePeriod)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="last7">Last 7 Days</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="last30">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && (
        <div className="mb-4 text-center text-muted-foreground">Loading...</div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Spent
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{formatCurrency(summary.total)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Transactions
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.count}</div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average per Transaction
            </CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(summary.count > 0 ? summary.total / summary.count : 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.byCategory.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No expenses yet</p>
            ) : (
              <div className="space-y-4">
                {summary.byCategory.map((category) => (
                  <div key={category.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{category.name}</span>
                      <span className="text-sm font-bold">{formatCurrency(category.total)}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${(category.total / maxCategoryTotal) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{category.count} transactions</span>
                      <span>{((category.total / summary.total) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {recentExpenses.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No expenses yet</p>
            ) : (
              <div className="space-y-3">
                {recentExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{expense.category.name}</div>
                      {expense.note && (
                        <div className="text-sm text-muted-foreground">{expense.note}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDate(expense.date)}
                      </div>
                    </div>
                    <div className="text-lg font-bold text-primary">
                      {formatCurrency(expense.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
