'use client'

import { clearAllExpenses, createDemoExpenses, createExpense, deleteExpense, getExpenses } from '@/app/apis/expenses'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate, getDateRange, type TimePeriod } from '@/lib/utils/date'
import { ChevronLeft, ChevronRight, Download, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

type Category = {
  id: string
  name: string
}

type Expense = {
  id: string
  amount: number
  date: Date
  note: string | null
  category: { name: string; id: string }
}

export function ExpensesClient({
  initialCategories,
  initialExpenses,
}: {
  initialCategories: Category[]
  initialExpenses: Expense[]
}) {
  const [categories] = useState(initialCategories)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [period, setPeriod] = useState<TimePeriod>('last30')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalExpenses, setTotalExpenses] = useState(0)

  // Form state
  const [amount, setAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].id)
    }
  }, [categories, selectedCategory])

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true)
      const { startDate, endDate } = getDateRange(period)
      const result = await getExpenses(startDate, endDate, categoryFilter, sortBy, currentPage, pageSize)
      setExpenses(result.data)
      setTotalPages(result.pagination.totalPages)
      setTotalExpenses(result.pagination.total)
      setLoading(false)
    }
    fetchExpenses()
  }, [period, categoryFilter, sortBy, currentPage, pageSize])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      await createExpense({
        amount: parseFloat(amount),
        categoryId: selectedCategory,
        date,
        note: note || undefined,
      })

      setMessage({ type: 'success', text: 'Expense added successfully!' })
      setAmount('')
      setNote('')
      setDate(new Date().toISOString().split('T')[0])

      // Refresh expenses and reset to page 1
      setCurrentPage(1)
      const { startDate, endDate } = getDateRange(period)
      const result = await getExpenses(startDate, endDate, categoryFilter, sortBy, 1, pageSize)
      setExpenses(result.data)
      setTotalPages(result.pagination.totalPages)
      setTotalExpenses(result.pagination.total)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to add expense' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return

    try {
      await deleteExpense(id)
      setMessage({ type: 'success', text: 'Expense deleted successfully!' })
      
      // If we deleted the last item on a page, go to previous page
      const newPage = expenses.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage
      setCurrentPage(newPage)
      
      const { startDate, endDate } = getDateRange(period)
      const result = await getExpenses(startDate, endDate, categoryFilter, sortBy, newPage, pageSize)
      setExpenses(result.data)
      setTotalPages(result.pagination.totalPages)
      setTotalExpenses(result.pagination.total)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete expense' })
    }
  }

  const handleLoadDemo = async () => {
    if (!confirm('This will add demo expenses to your account. Continue?')) return

    try {
      setLoading(true)
      await createDemoExpenses()
      setMessage({ type: 'success', text: 'Demo data loaded successfully!' })
      setCurrentPage(1)
      const { startDate, endDate } = getDateRange(period)
      const result = await getExpenses(startDate, endDate, categoryFilter, sortBy, 1, pageSize)
      setExpenses(result.data)
      setTotalPages(result.pagination.totalPages)
      setTotalExpenses(result.pagination.total)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to load demo data' })
    } finally {
      setLoading(false)
    }
  }

  const handleClearAll = async () => {
    if (!confirm('⚠️ This will permanently delete ALL your expenses. This action cannot be undone. Are you sure?')) return

    try {
      setLoading(true)
      const count = await clearAllExpenses()
      setMessage({ type: 'success', text: `Successfully deleted ${count} expense(s)` })
      setCurrentPage(1)
      const { startDate, endDate } = getDateRange(period)
      const result = await getExpenses(startDate, endDate, categoryFilter, sortBy, 1, pageSize)
      setExpenses(result.data)
      setTotalPages(result.pagination.totalPages)
      setTotalExpenses(result.pagination.total)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to clear expenses' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Expenses</h1>
        <div className="flex gap-2">
          <Button onClick={handleLoadDemo} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Load Demo Data
          </Button>
          <Button onClick={handleClearAll} variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-md text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="h-5 w-5 mr-2" />
              Add Expense
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={submitting}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Date</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Note (Optional)</label>
                <Input
                  type="text"
                  placeholder="Add a note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Expense'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Expense List</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Select value={period} onValueChange={(value) => setPeriod(value as TimePeriod)}>
                <SelectTrigger className="sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last7">Last 7 Days</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="last30">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date (Newest)</SelectItem>
                  <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                  <SelectItem value="amount-desc">Amount (High)</SelectItem>
                  <SelectItem value="amount-asc">Amount (Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No expenses found</p>
                <p className="text-sm text-muted-foreground">
                  Add your first expense or load demo data to get started
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">
                          {formatDate(expense.date)}
                        </TableCell>
                        <TableCell>{expense.category.name}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {expense.note || '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(expense.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalExpenses)} of {totalExpenses} expenses
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || loading}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              disabled={loading}
                              className="w-9"
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || loading}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
