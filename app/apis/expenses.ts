'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { Decimal } from '@prisma/client/runtime/library'
import { revalidatePath } from 'next/cache'

function formatDateForLog(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getMonth()]
  const day = date.getDate()
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${month} ${day}, ${year} ${hours}:${minutes}`
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCategories() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  })
  return categories
}

export async function getExpenses(
  startDate: Date,
  endDate: Date,
  categoryId?: string,
  sortBy: 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' = 'date-desc',
  page: number = 1,
  pageSize: number = 10
) {
  const user = await getUser()
  if (!user) throw new Error('Unauthorized')
  
  console.log('[READ] Fetching expenses for user:', user.id, 'from', formatDateForLog(startDate), 'to', formatDateForLog(endDate))

  const orderBy = sortBy === 'date-desc' ? { date: 'desc' as const }
    : sortBy === 'date-asc' ? { date: 'asc' as const }
    : sortBy === 'amount-desc' ? { amount: 'desc' as const }
    : { amount: 'asc' as const }

  const where = {
    userId: user.id,
    date: {
      gte: startDate,
      lte: endDate,
    },
    ...(categoryId && categoryId !== 'all' ? { categoryId } : {}),
  }

  // Get total count for pagination
  const total = await prisma.expense.count({ where })

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      category: true,
    },
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return {
    data: expenses.map(expense => ({
      ...expense,
      amount: expense.amount.toNumber(),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

export async function getDashboardSummary(startDate: Date, endDate: Date) {
  const user = await getUser()
  if (!user) throw new Error('Unauthorized')

  const expenses = await prisma.expense.findMany({
    where: {
      userId: user.id,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      category: true,
    },
  })

  const total = expenses.reduce((sum, exp) => sum + exp.amount.toNumber(), 0)
  const count = expenses.length

  const byCategory = expenses.reduce((acc, exp) => {
    const categoryName = exp.category.name
    if (!acc[categoryName]) {
      acc[categoryName] = {
        name: categoryName,
        total: 0,
        count: 0,
      }
    }
    acc[categoryName].total += exp.amount.toNumber()
    acc[categoryName].count += 1
    return acc
  }, {} as Record<string, { name: string; total: number; count: number }>)

  return {
    total,
    count,
    byCategory: Object.values(byCategory).sort((a, b) => b.total - a.total),
  }
}

export async function createExpense(data: {
  amount: number
  categoryId: string
  date: string
  note?: string
}) {
  const user = await getUser()
  if (!user) throw new Error('Unauthorized')

  if (data.amount <= 0) {
    throw new Error('Amount must be greater than 0')
  }

  console.log('[CREATE] Creating expense for user:', user.id, 'amount:', data.amount, 'category:', data.categoryId)

  const expense = await prisma.expense.create({
    data: {
      userId: user.id,
      amount: new Decimal(data.amount),
      categoryId: data.categoryId,
      date: new Date(data.date),
      note: data.note || null,
    },
  })

  console.log('[CREATE] ✓ Expense created successfully:', expense.id)

  revalidatePath('/')
  revalidatePath('/expenses')
}

export async function deleteExpense(id: string) {
  const user = await getUser()
  if (!user) throw new Error('Unauthorized')

  console.log('[DELETE] Attempting to delete expense:', id, 'for user:', user.id)

  const expense = await prisma.expense.findUnique({
    where: { id },
  })

  if (!expense || expense.userId !== user.id) {
    console.log('[DELETE] ✗ Expense not found or unauthorized')
    throw new Error('Expense not found or unauthorized')
  }

  await prisma.expense.delete({
    where: { id },
  })

  console.log('[DELETE] ✓ Expense deleted successfully:', id)

  revalidatePath('/')
  revalidatePath('/expenses')
}

export async function clearAllExpenses() {
  const user = await getUser()
  if (!user) throw new Error('Unauthorized')

  console.log('[DELETE ALL] Attempting to delete all expenses for user:', user.id)

  const result = await prisma.expense.deleteMany({
    where: {
      userId: user.id,
    },
  })

  console.log('[DELETE ALL] ✓ Successfully deleted', result.count, 'expenses')

  revalidatePath('/')
  revalidatePath('/expenses')
  
  return result.count
}

export async function createDemoExpenses() {
  const user = await getUser()
  if (!user) throw new Error('Unauthorized')

  console.log('[DEMO] Creating demo expenses for user:', user.id)

  const categories = await prisma.category.findMany()
  
  // More diverse demo data across different categories
  const demoExpenses = [
    // Food & Dining
    { amount: 45.50, categoryId: categories[0].id, date: new Date(), note: 'Lunch at Italian restaurant' },
    { amount: 85.30, categoryId: categories[0].id, date: new Date(Date.now() - 86400000 * 3), note: 'Grocery shopping at Whole Foods' },
    { amount: 12.75, categoryId: categories[0].id, date: new Date(Date.now() - 86400000 * 5), note: 'Morning coffee and pastry' },
    { amount: 67.20, categoryId: categories[0].id, date: new Date(Date.now() - 86400000 * 8), note: 'Dinner with friends' },
    { amount: 28.90, categoryId: categories[0].id, date: new Date(Date.now() - 86400000 * 12), note: 'Takeout pizza' },
    
    // Transportation
    { amount: 12.99, categoryId: categories[1].id, date: new Date(Date.now() - 86400000), note: 'Subway monthly pass' },
    { amount: 55.00, categoryId: categories[1].id, date: new Date(Date.now() - 86400000 * 6), note: 'Gas station fill-up' },
    { amount: 8.50, categoryId: categories[1].id, date: new Date(Date.now() - 86400000 * 14), note: 'Uber ride home' },
    { amount: 125.00, categoryId: categories[1].id, date: new Date(Date.now() - 86400000 * 20), note: 'Car maintenance and oil change' },
    
    // Shopping
    { amount: 89.00, categoryId: categories[2].id, date: new Date(Date.now() - 86400000 * 2), note: 'New running shoes' },
    { amount: 156.45, categoryId: categories[2].id, date: new Date(Date.now() - 86400000 * 9), note: 'Winter jacket' },
    { amount: 34.99, categoryId: categories[2].id, date: new Date(Date.now() - 86400000 * 16), note: 'Phone case and accessories' },
    { amount: 42.00, categoryId: categories[2].id, date: new Date(Date.now() - 86400000 * 22), note: 'Books from bookstore' },
    
    // Entertainment
    { amount: 15.00, categoryId: categories[3].id, date: new Date(Date.now() - 86400000 * 4), note: 'Movie tickets for two' },
    { amount: 45.00, categoryId: categories[3].id, date: new Date(Date.now() - 86400000 * 11), note: 'Concert tickets' },
    { amount: 19.99, categoryId: categories[3].id, date: new Date(Date.now() - 86400000 * 18), note: 'Netflix subscription' },
    { amount: 32.50, categoryId: categories[3].id, date: new Date(Date.now() - 86400000 * 24), note: 'Bowling night' },
    
    // Bills & Utilities
    { amount: 120.00, categoryId: categories[4].id, date: new Date(Date.now() - 86400000 * 7), note: 'Monthly electric bill' },
    { amount: 65.00, categoryId: categories[4].id, date: new Date(Date.now() - 86400000 * 7), note: 'Internet bill' },
    { amount: 89.99, categoryId: categories[4].id, date: new Date(Date.now() - 86400000 * 15), note: 'Phone bill' },
    
    // Healthcare
    { amount: 200.00, categoryId: categories[5].id, date: new Date(Date.now() - 86400000 * 10), note: 'Doctor checkup copay' },
    { amount: 35.50, categoryId: categories[5].id, date: new Date(Date.now() - 86400000 * 17), note: 'Pharmacy prescription' },
    { amount: 75.00, categoryId: categories[5].id, date: new Date(Date.now() - 86400000 * 25), note: 'Dental cleaning' },
    
    // Travel (if exists)
    ...(categories[6] ? [
      { amount: 450.00, categoryId: categories[6].id, date: new Date(Date.now() - 86400000 * 13), note: 'Weekend hotel stay' },
      { amount: 180.00, categoryId: categories[6].id, date: new Date(Date.now() - 86400000 * 19), note: 'Flight tickets' },
    ] : []),
    
    // Education (if exists)
    ...(categories[7] ? [
      { amount: 299.00, categoryId: categories[7].id, date: new Date(Date.now() - 86400000 * 21), note: 'Online course subscription' },
      { amount: 48.50, categoryId: categories[7].id, date: new Date(Date.now() - 86400000 * 27), note: 'Study materials' },
    ] : []),
    
    // Other
    ...(categories[8] ? [
      { amount: 25.00, categoryId: categories[8].id, date: new Date(Date.now() - 86400000 * 23), note: 'Gift for friend' },
      { amount: 15.99, categoryId: categories[8].id, date: new Date(Date.now() - 86400000 * 28), note: 'Miscellaneous supplies' },
    ] : []),
  ]

  for (const expense of demoExpenses) {
    await prisma.expense.create({
      data: {
        userId: user.id,
        amount: new Decimal(expense.amount),
        categoryId: expense.categoryId,
        date: expense.date,
        note: expense.note,
      },
    })
  }

  console.log('[DEMO] ✓ Created', demoExpenses.length, 'demo expenses successfully')

  revalidatePath('/')
  revalidatePath('/expenses')
}
