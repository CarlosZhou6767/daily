/**
 * 日历组合函数
 * 统一处理月度日历单元格生成逻辑
 * 消除 Dashboard.vue 和 CheckinRecords.vue 中的重复代码
 */
import { computed } from 'vue'

/**
 * @param {import('vue').Ref<number>} viewYear - 视图年份
 * @param {import('vue').Ref<number>} viewMonth - 视图月份（0-11）
 * @param {import('vue').Ref<Set<string>>} checkedDates - 已打卡日期集合
 * @returns {{ calendarCells: import('vue').ComputedRef<Array>, weekDays: string[] }}
 */
export function useCalendar(viewYear, viewMonth, checkedDates) {
  const weekDays = ['一', '二', '三', '四', '五', '六', '日']

  /**
   * 日历单元格计算
   * 根据年月和已打卡日期生成完整的月度日历网格
   * @returns {Array<{day: number, dateStr: string, checked: boolean, isToday: boolean}>}
   */
  const calendarCells = computed(() => {
    const year = viewYear.value
    const month = viewMonth.value
    const firstDay = new Date(year, month, 1)
    let startWeekday = firstDay.getDay() - 1
    if (startWeekday < 0) startWeekday = 6
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const now = new Date()
    const cells = []

    // 填充月初空白格（上月剩余天数）
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ day: 0, dateStr: '', checked: false, isToday: false })
    }

    // 填充本月日期格
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const isToday = year === now.getFullYear() && month === now.getMonth() && d === now.getDate()
      cells.push({
        day: d,
        dateStr,
        checked: checkedDates.value.has(dateStr),
        isToday,
      })
    }

    return cells
  })

  return { calendarCells, weekDays }
}
