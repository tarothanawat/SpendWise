export type TimePeriod = 'today' | 'last7' | 'thisMonth' | 'last30'

export function getDateRange(preset: TimePeriod): { startDate: Date; endDate: Date } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const endDate = new Date()
  endDate.setHours(23, 59, 59, 999)

  let startDate = new Date()

  switch (preset) {
    case 'today':
      startDate = new Date(today)
      break
    case 'last7':
      startDate = new Date(today)
      startDate.setDate(today.getDate() - 6)
      break
    case 'thisMonth':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      break
    case 'last30':
      startDate = new Date(today)
      startDate.setDate(today.getDate() - 29)
      break
  }

  return { startDate, endDate }
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}
