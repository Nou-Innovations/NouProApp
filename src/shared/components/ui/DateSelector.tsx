import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  ViewStyle,
} from 'react-native';
import theme from '@/shared/theme';

interface CalendarDay {
  day: number;
  date: Date;
  isCurrentMonth: boolean;
  isToday?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
}

export interface DateSelectorProps {
  /** The currently selected date */
  value: Date;
  /** Callback when a date is selected */
  onChange: (date: Date) => void;
  /** Minimum selectable date (dates before this are disabled) */
  minDate?: Date;
  /** Maximum selectable date (dates after this are disabled) */
  maxDate?: Date;
  /** Number of months to show before current month (default: 12) */
  monthsBefore?: number;
  /** Number of months to show after current month (default: 12) */
  monthsAfter?: number;
  /** Custom container style */
  style?: ViewStyle;
  /** Height of the calendar container (default: 340) */
  calendarHeight?: number;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Custom color for selected day background */
  selectedColor?: string;
  /** Custom color for today's background */
  todayColor?: string;
  /** First day of week: 0 = Sunday, 1 = Monday (default: 0) */
  firstDayOfWeek?: 0 | 1;
  /** Callback when the visible month changes */
  onMonthChange?: (date: Date) => void;
}

const WEEKDAY_LABELS_SUNDAY_START = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LABELS_MONDAY_START = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * DateSelector - A reusable horizontal-swipeable calendar component
 * 
 * Features:
 * - Horizontal month navigation via swipe
 * - Today highlighting
 * - Selected date highlighting
 * - Min/max date constraints
 * - Configurable month range
 * - Week starts on Sunday or Monday
 * 
 * @example
 * ```tsx
 * const [date, setDate] = useState(new Date());
 * 
 * <DateSelector
 *   value={date}
 *   onChange={setDate}
 *   minDate={new Date()} // Disable past dates
 * />
 * ```
 */
const DateSelector: React.FC<DateSelectorProps> = ({
  value,
  onChange,
  minDate,
  maxDate,
  monthsBefore = 12,
  monthsAfter = 12,
  style,
  calendarHeight = 340,
  disabled = false,
  selectedColor = theme.colors.primary,
  todayColor = '#F3F4F6',
  firstDayOfWeek = 0,
  onMonthChange,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const monthScrollRef = useRef<FlatList>(null);
  const [visibleMonths, setVisibleMonths] = useState<Date[]>([]);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(monthsBefore);

  const weekdayLabels = firstDayOfWeek === 0 
    ? WEEKDAY_LABELS_SUNDAY_START 
    : WEEKDAY_LABELS_MONDAY_START;

  /**
   * Initialize visible months array
   */
  useEffect(() => {
    const today = new Date();
    const months: Date[] = [];
    
    for (let i = -monthsBefore; i <= monthsAfter; i++) {
      const month = new Date(today);
      month.setMonth(today.getMonth() + i);
      month.setDate(1);
      months.push(month);
    }
    
    setVisibleMonths(months);
    
    // Scroll to current month after a brief delay
    setTimeout(() => {
      monthScrollRef.current?.scrollToIndex({
        index: monthsBefore,
        animated: false,
        viewPosition: 0.5,
      });
    }, 100);
  }, [monthsBefore, monthsAfter]);

  /**
   * Check if two dates are the same day
   */
  const isSameDay = useCallback((date1: Date, date2: Date): boolean => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }, []);

  /**
   * Check if a date is today
   */
  const isDateToday = useCallback((date: Date): boolean => {
    const today = new Date();
    return isSameDay(date, today);
  }, [isSameDay]);

  /**
   * Check if a date is disabled based on min/max constraints
   */
  const isDateDisabled = useCallback((date: Date): boolean => {
    if (minDate) {
      const min = new Date(minDate);
      min.setHours(0, 0, 0, 0);
      if (date < min) return true;
    }
    if (maxDate) {
      const max = new Date(maxDate);
      max.setHours(23, 59, 59, 999);
      if (date > max) return true;
    }
    return false;
  }, [minDate, maxDate]);

  /**
   * Generate calendar days for a specific month
   */
  const generateCalendarDays = useCallback((monthDate: Date): CalendarDay[] => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Adjust for first day of week setting
    let firstDayWeekday = firstDayOfMonth.getDay();
    if (firstDayOfWeek === 1) {
      firstDayWeekday = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1;
    }
    
    const days: CalendarDay[] = [];
    
    // Add days from previous month
    if (firstDayWeekday > 0) {
      const prevMonth = new Date(year, month, 0);
      const prevMonthDays = prevMonth.getDate();
      
      for (let i = firstDayWeekday - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        const date = new Date(year, month - 1, day);
        days.push({
          day,
          date,
          isCurrentMonth: false,
          isDisabled: isDateDisabled(date),
        });
      }
    }
    
    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateDisabled = isDateDisabled(date);
      
      days.push({
        day,
        date,
        isCurrentMonth: true,
        isToday: isDateToday(date),
        isSelected: isSameDay(date, value),
        isDisabled: dateDisabled,
      });
    }
    
    // Fill remaining cells to complete the grid
    const totalCells = Math.ceil((firstDayWeekday + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - (firstDayWeekday + daysInMonth);
    
    for (let i = 1; i <= remainingCells; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        day: i,
        date,
        isCurrentMonth: false,
        isDisabled: isDateDisabled(date),
      });
    }
    
    return days;
  }, [value, isDateToday, isSameDay, isDateDisabled, firstDayOfWeek]);

  /**
   * Handle date selection
   */
  const selectDate = useCallback((date: Date) => {
    if (disabled) return;
    
    // Keep existing time, only change the date
    const newDate = new Date(value);
    newDate.setFullYear(date.getFullYear());
    newDate.setMonth(date.getMonth());
    newDate.setDate(date.getDate());
    
    onChange(newDate);
  }, [value, onChange, disabled]);

  /**
   * Handle scroll end to track current month
   */
  const handleScrollEnd = useCallback((e: any) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / screenWidth);
    
    if (index >= 0 && index < visibleMonths.length) {
      setCurrentMonthIndex(index);
      onMonthChange?.(visibleMonths[index]);
    }
  }, [screenWidth, visibleMonths, onMonthChange]);

  /**
   * Key extractor for FlatList
   */
  const keyExtractor = useCallback((item: Date, index: number) => 
    `month-${item.getMonth()}-${item.getFullYear()}-${index}`, []);

  /**
   * Get item layout for FlatList optimization
   */
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: screenWidth,
    offset: screenWidth * index,
    index,
  }), [screenWidth]);

  /**
   * Render a single month calendar
   */
  const renderMonthCalendar = useCallback(({ item }: { item: Date }) => {
    const monthName = item.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
    const days = generateCalendarDays(item);
    
    // Group days into weeks
    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    
    return (
      <View style={[styles.monthContainer, { width: screenWidth }]}>
        <Text style={styles.monthTitle}>{monthName}</Text>
        
        {/* Weekday Headers */}
        <View style={styles.weekdayRow}>
          {weekdayLabels.map((day, index) => (
            <Text key={index} style={styles.weekdayText}>
              {day}
            </Text>
          ))}
        </View>
        
        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {weeks.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.weekRow}>
              {week.map((dayItem, dayIndex) => {
                const isSelectable = dayItem.isCurrentMonth && !dayItem.isDisabled;
                
                return (
                  <TouchableOpacity
                    key={`day-${weekIndex}-${dayIndex}`}
                    style={[
                      styles.dayCell,
                      dayItem.isToday && [styles.dayToday, { backgroundColor: todayColor }],
                      dayItem.isSelected && [styles.daySelected, { backgroundColor: selectedColor }],
                      !dayItem.isCurrentMonth && styles.dayOtherMonth,
                      dayItem.isDisabled && styles.dayDisabled,
                    ]}
                    disabled={!isSelectable || disabled}
                    onPress={() => isSelectable && selectDate(dayItem.date)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        dayItem.isToday && styles.dayTodayText,
                        dayItem.isSelected && styles.daySelectedText,
                        !dayItem.isCurrentMonth && styles.dayOtherMonthText,
                        dayItem.isDisabled && styles.dayDisabledText,
                      ]}
                    >
                      {dayItem.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  }, [
    screenWidth, 
    generateCalendarDays, 
    weekdayLabels, 
    selectDate, 
    disabled, 
    selectedColor, 
    todayColor
  ]);

  const opacityStyle = disabled ? { opacity: 0.5 } : {};

  return (
    <View style={[styles.container, { height: calendarHeight }, style, opacityStyle]}>
      <FlatList
        ref={monthScrollRef}
        data={visibleMonths}
        renderItem={renderMonthCalendar}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        getItemLayout={getItemLayout}
        snapToInterval={screenWidth}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={styles.flatListContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'flex-start',
    overflow: 'visible',
    backgroundColor: 'transparent',
  },
  flatListContent: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  monthContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: 'Inter-SemiBold',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
    width: '100%',
  },
  weekdayText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    width: 40,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  calendarGrid: {
    flexDirection: 'column',
    width: '100%',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
    width: '100%',
  },
  dayCell: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  dayText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  dayToday: {
    backgroundColor: '#F3F4F6',
  },
  dayTodayText: {
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  daySelected: {
    backgroundColor: theme.colors.primary,
  },
  daySelectedText: {
    color: 'white',
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  dayOtherMonth: {
    opacity: 0.3,
    backgroundColor: '#F3F4F6',
  },
  dayOtherMonthText: {
    color: '#9CA3AF',
  },
  dayDisabled: {
    opacity: 0.3,
  },
  dayDisabledText: {
    color: '#9CA3AF',
  },
});

export default DateSelector;
