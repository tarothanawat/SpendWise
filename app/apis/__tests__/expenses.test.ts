/**
 * API Tests for Expense Management
 * 
 * These tests validate the structure and behavior of the expense API functions.
 * Note: Full integration tests require database and auth setup.
 */

import { Decimal } from '@prisma/client/runtime/library'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    category: {
      findMany: jest.fn(),
    },
    expense: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

describe('Expense API Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getUser', () => {
    it('should return user from Supabase auth', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' }
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
          }),
        },
      }
      
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

      const { getUser } = await import('../expenses')
      const user = await getUser()

      expect(user).toEqual(mockUser)
      expect(createClient).toHaveBeenCalled()
      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
    })
  })

  describe('getCategories', () => {
    it('should fetch all categories ordered by name', async () => {
      const mockCategories = [
        { id: '1', name: 'Food & Dining', createdAt: new Date() },
        { id: '2', name: 'Transportation', createdAt: new Date() },
      ]

      ;(prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories)

      const { getCategories } = await import('../expenses')
      const categories = await getCategories()

      expect(categories).toEqual(mockCategories)
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      })
    })
  })

  describe('createExpense', () => {
    it('should throw error when user is not authenticated', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
          }),
        },
      }
      
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

      const { createExpense } = await import('../expenses')

      await expect(
        createExpense({
          amount: 100,
          categoryId: 'cat-1',
          date: '2026-02-05',
          note: 'Test expense',
        })
      ).rejects.toThrow('Unauthorized')
    })

    it('should throw error when amount is zero or negative', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
          }),
        },
      }
      
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

      const { createExpense } = await import('../expenses')

      await expect(
        createExpense({
          amount: 0,
          categoryId: 'cat-1',
          date: '2026-02-05',
        })
      ).rejects.toThrow('Amount must be greater than 0')

      await expect(
        createExpense({
          amount: -50,
          categoryId: 'cat-1',
          date: '2026-02-05',
        })
      ).rejects.toThrow('Amount must be greater than 0')
    })

    it('should create expense with valid data', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
          }),
        },
      }
      
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

      const mockExpense = {
        id: 'expense-1',
        userId: 'test-user-id',
        amount: new Decimal(100),
        categoryId: 'cat-1',
        date: new Date('2026-02-05'),
        note: 'Test expense',
        createdAt: new Date(),
      }

      ;(prisma.expense.create as jest.Mock).mockResolvedValue(mockExpense)

      const { createExpense } = await import('../expenses')

      await createExpense({
        amount: 100,
        categoryId: 'cat-1',
        date: '2026-02-05',
        note: 'Test expense',
      })

      expect(prisma.expense.create).toHaveBeenCalledWith({
        data: {
          userId: 'test-user-id',
          amount: expect.any(Decimal),
          categoryId: 'cat-1',
          date: expect.any(Date),
          note: 'Test expense',
        },
      })

      expect(revalidatePath).toHaveBeenCalledWith('/')
      expect(revalidatePath).toHaveBeenCalledWith('/expenses')
    })
  })

  describe('deleteExpense', () => {
    it('should throw error when expense does not exist', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
          }),
        },
      }
      
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
      ;(prisma.expense.findUnique as jest.Mock).mockResolvedValue(null)

      const { deleteExpense } = await import('../expenses')

      await expect(deleteExpense('non-existent-id')).rejects.toThrow(
        'Expense not found or unauthorized'
      )
    })

    it('should throw error when user does not own the expense', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
          }),
        },
      }
      
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
      
      const mockExpense = {
        id: 'expense-1',
        userId: 'different-user-id',
        amount: new Decimal(100),
      }
      
      ;(prisma.expense.findUnique as jest.Mock).mockResolvedValue(mockExpense)

      const { deleteExpense } = await import('../expenses')

      await expect(deleteExpense('expense-1')).rejects.toThrow(
        'Expense not found or unauthorized'
      )
    })

    it('should delete expense when user owns it', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
          }),
        },
      }
      
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
      
      const mockExpense = {
        id: 'expense-1',
        userId: 'test-user-id',
        amount: new Decimal(100),
      }
      
      ;(prisma.expense.findUnique as jest.Mock).mockResolvedValue(mockExpense)
      ;(prisma.expense.delete as jest.Mock).mockResolvedValue(mockExpense)

      const { deleteExpense } = await import('../expenses')

      await deleteExpense('expense-1')

      expect(prisma.expense.delete).toHaveBeenCalledWith({
        where: { id: 'expense-1' },
      })
      expect(revalidatePath).toHaveBeenCalledWith('/')
      expect(revalidatePath).toHaveBeenCalledWith('/expenses')
    })
  })

  describe('clearAllExpenses', () => {
    it('should delete all expenses for authenticated user', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
          }),
        },
      }
      
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
      ;(prisma.expense.deleteMany as jest.Mock).mockResolvedValue({ count: 5 })

      const { clearAllExpenses } = await import('../expenses')

      const count = await clearAllExpenses()

      expect(count).toBe(5)
      expect(prisma.expense.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
      })
      expect(revalidatePath).toHaveBeenCalledWith('/')
      expect(revalidatePath).toHaveBeenCalledWith('/expenses')
    })
  })

  describe('getExpenses with pagination', () => {
    it('should return paginated expenses with correct metadata', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
          }),
        },
      }
      
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

      const mockExpenses = [
        {
          id: '1',
          userId: 'test-user-id',
          amount: new Decimal(100),
          date: new Date(),
          note: 'Test 1',
          category: { id: 'cat-1', name: 'Food' },
        },
        {
          id: '2',
          userId: 'test-user-id',
          amount: new Decimal(200),
          date: new Date(),
          note: 'Test 2',
          category: { id: 'cat-2', name: 'Transport' },
        },
      ]

      ;(prisma.expense.count as jest.Mock).mockResolvedValue(25)
      ;(prisma.expense.findMany as jest.Mock).mockResolvedValue(mockExpenses)

      const { getExpenses } = await import('../expenses')

      const result = await getExpenses(
        new Date('2026-01-01'),
        new Date('2026-02-05'),
        'all',
        'date-desc',
        1,
        10
      )

      expect(result.data).toHaveLength(2)
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 10,
        total: 25,
        totalPages: 3,
      })

      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        })
      )
    })
  })

  describe('getDashboardSummary', () => {
    it('should calculate summary statistics correctly', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
          }),
        },
      }
      
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

      const mockExpenses = [
        {
          id: '1',
          userId: 'test-user-id',
          amount: new Decimal(100),
          date: new Date(),
          category: { id: 'cat-1', name: 'Food' },
        },
        {
          id: '2',
          userId: 'test-user-id',
          amount: new Decimal(200),
          date: new Date(),
          category: { id: 'cat-1', name: 'Food' },
        },
        {
          id: '3',
          userId: 'test-user-id',
          amount: new Decimal(150),
          date: new Date(),
          category: { id: 'cat-2', name: 'Transport' },
        },
      ]

      ;(prisma.expense.findMany as jest.Mock).mockResolvedValue(mockExpenses)

      const { getDashboardSummary } = await import('../expenses')

      const summary = await getDashboardSummary(
        new Date('2026-01-01'),
        new Date('2026-02-05')
      )

      expect(summary.total).toBe(450)
      expect(summary.count).toBe(3)
      expect(summary.byCategory).toHaveLength(2)
      
      // Food should be first (higher total)
      expect(summary.byCategory[0].name).toBe('Food')
      expect(summary.byCategory[0].total).toBe(300)
      expect(summary.byCategory[0].count).toBe(2)
      
      expect(summary.byCategory[1].name).toBe('Transport')
      expect(summary.byCategory[1].total).toBe(150)
      expect(summary.byCategory[1].count).toBe(1)
    })
  })
})
