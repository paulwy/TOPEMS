'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addDays,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export type CalendarProps = {
  mode?: 'single' | 'range' | 'multiple'
  selected?: Date | Date[]
  onSelect?: (date: Date | Date[] | undefined) => void
  defaultMonth?: Date
  disabled?: (date: Date) => boolean
  className?: string
  classNames?: any
}

function Calendar({
  mode = 'single',
  selected,
  onSelect,
  defaultMonth,
  disabled,
  className,
  classNames,
}: CalendarProps) {
  const [month, setMonth] = React.useState(defaultMonth || new Date())

  const daysInMonth = React.useMemo(() => {
    const monthStart = startOfMonth(month)
    const monthEnd = endOfMonth(monthStart)
    const start = startOfWeek(monthStart, { weekStartsOn: 1 })
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const days = []
    let day = start
    while (day <= end) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }, [month])

  const nextMonth = () => setMonth(addMonths(month, 1))
  const prevMonth = () => setMonth(subMonths(month, 1))

  const isSelected = (date: Date) => {
    if (!selected) return false
    if (mode === 'single') {
      return isSameDay(date, selected as Date)
    }
    if (mode === 'multiple' || mode === 'range') {
      return (selected as Date[]).some((d) => isSameDay(d, date))
    }
    return false
  }

  const isDisabled = (date: Date) => {
    if (!disabled) return false
    return disabled(date)
  }

  const handleDayClick = (date: Date) => {
    if (isDisabled(date)) return
    
    let newSelected
    if (mode === 'single') {
      newSelected = isSelected(date) ? undefined : date
    } else if (mode === 'multiple') {
      const array = Array.isArray(selected) ? [...selected] : []
      const index = array.findIndex((d) => isSameDay(d, date))
      if (index > -1) {
        array.splice(index, 1)
      } else {
        array.push(date)
      }
      newSelected = array
    } else {
      // range mode - for simplicity we only handle single here
      newSelected = date
    }
    
    onSelect?.(newSelected)
  }

  return (
    <div className={cn('p-3', className)}>
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          className="h-7 w-7 bg-transparent p-0"
          onClick={prevMonth}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">上月</span>
        </Button>
        
        <div className="text-sm font-medium">
          {format(month, 'yyyy年 MMMM', { locale: zhCN })}
        </div>
        
        <Button
          variant="outline"
          className="h-7 w-7 bg-transparent p-0"
          onClick={nextMonth}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">下月</span>
        </Button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['一', '二', '三', '四', '五', '六', '日'].map((day, i) => (
          <div
            key={i}
            className="text-center text-xs text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {daysInMonth.map((date, dateIndex) => {
          const isOutsideMonth = !isSameMonth(date, month)
          const selected = isSelected(date)
          const disabled = isDisabled(date)
          
          return (
            <Button
              key={dateIndex}
              variant="ghost"
              className={cn(
                'h-9 w-9 p-0 font-normal',
                isOutsideMonth && 'text-muted-foreground opacity-50',
                selected && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                disabled && 'text-muted-foreground opacity-50 pointer-events-none'
              )}
              disabled={disabled}
              onClick={() => handleDayClick(date)}
            >
              {format(date, 'd')}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

Calendar.displayName = 'Calendar'

export { Calendar }
