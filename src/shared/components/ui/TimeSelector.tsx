import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';

export interface TimeSelectorProps {
  /** The currently selected time */
  value: Date;
  /** Callback when the time changes */
  onChange: (date: Date) => void;
  /** Minute increment step (default: 5) */
  minuteStep?: number;
  /** Whether to use 24-hour format (default: false for 12-hour) */
  use24Hour?: boolean;
  /** Custom container style */
  style?: ViewStyle;
  /** Color for the chevron icons (default: theme.colors.primary) */
  iconColor?: string;
  /** Size of the chevron icons (default: 24) */
  iconSize?: number;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

/**
 * TimeSelector - A reusable time picker component
 * 
 * Features:
 * - 12-hour or 24-hour format
 * - Configurable minute steps (default 5 minutes)
 * - Up/down buttons for hours, minutes, and AM/PM
 * - Automatic overflow handling (e.g., 59 mins + 5 = 0 mins, hour + 1)
 * 
 * @example
 * ```tsx
 * const [time, setTime] = useState(new Date());
 * 
 * <TimeSelector
 *   value={time}
 *   onChange={setTime}
 *   minuteStep={5}
 * />
 * ```
 */
const TimeSelector: React.FC<TimeSelectorProps> = ({
  value,
  onChange,
  minuteStep = 5,
  use24Hour = false,
  style,
  iconColor = theme.colors.primary,
  iconSize = 24,
  disabled = false,
}) => {
  /**
   * Adjust hours by a given amount
   */
  const adjustHours = useCallback((hours: number) => {
    if (disabled) return;
    const newDate = new Date(value);
    newDate.setHours(newDate.getHours() + hours);
    onChange(newDate);
  }, [value, onChange, disabled]);

  /**
   * Adjust minutes by a given amount, rounding to the nearest step
   * Handles overflow/underflow to adjacent hours
   */
  const adjustMinutes = useCallback((minutes: number) => {
    if (disabled) return;
    const newDate = new Date(value);
    const currentMinutes = newDate.getMinutes();
    
    // Calculate new minutes value
    let newMinutes = currentMinutes + minutes;
    
    // Round to nearest step interval
    newMinutes = Math.round(newMinutes / minuteStep) * minuteStep;
    
    // Handle overflow to next hour
    if (newMinutes >= 60) {
      newMinutes = 0;
      newDate.setHours(newDate.getHours() + 1);
    } else if (newMinutes < 0) {
      newMinutes = 60 - minuteStep;
      newDate.setHours(newDate.getHours() - 1);
    }
    
    newDate.setMinutes(newMinutes);
    onChange(newDate);
  }, [value, onChange, minuteStep, disabled]);

  /**
   * Toggle between AM and PM
   */
  const toggleAmPm = useCallback(() => {
    if (disabled) return;
    const newDate = new Date(value);
    if (newDate.getHours() < 12) {
      newDate.setHours(newDate.getHours() + 12);
    } else {
      newDate.setHours(newDate.getHours() - 12);
    }
    onChange(newDate);
  }, [value, onChange, disabled]);

  /**
   * Get display value for hours
   */
  const getHoursDisplay = (): string => {
    const hours = value.getHours();
    if (use24Hour) {
      return hours.toString().padStart(2, '0');
    }
    // 12-hour format
    if (hours === 0) return '12';
    if (hours > 12) return (hours - 12).toString();
    return hours.toString();
  };

  /**
   * Get display value for minutes (zero-padded)
   */
  const getMinutesDisplay = (): string => {
    return value.getMinutes().toString().padStart(2, '0');
  };

  /**
   * Get AM/PM indicator
   */
  const getAmPm = (): string => {
    return value.getHours() >= 12 ? 'PM' : 'AM';
  };

  const opacityStyle = disabled ? { opacity: 0.5 } : {};

  return (
    <View style={[styles.container, style, opacityStyle]}>
      {/* Hours Column */}
      <View style={styles.column}>
        <TouchableOpacity
          style={styles.adjustButton}
          onPress={() => adjustHours(1)}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Icon name="chevron-up" size={iconSize} color={iconColor} />
        </TouchableOpacity>
        
        <Text style={styles.timeValue}>{getHoursDisplay()}</Text>
        
        <TouchableOpacity
          style={styles.adjustButton}
          onPress={() => adjustHours(-1)}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Icon name="chevron-down" size={iconSize} color={iconColor} />
        </TouchableOpacity>
      </View>

      {/* Separator */}
      <Text style={styles.separator}>:</Text>

      {/* Minutes Column */}
      <View style={styles.column}>
        <TouchableOpacity
          style={styles.adjustButton}
          onPress={() => adjustMinutes(minuteStep)}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Icon name="chevron-up" size={iconSize} color={iconColor} />
        </TouchableOpacity>
        
        <Text style={styles.timeValue}>{getMinutesDisplay()}</Text>
        
        <TouchableOpacity
          style={styles.adjustButton}
          onPress={() => adjustMinutes(-minuteStep)}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Icon name="chevron-down" size={iconSize} color={iconColor} />
        </TouchableOpacity>
      </View>

      {/* AM/PM Column (only for 12-hour format) */}
      {!use24Hour && (
        <View style={styles.column}>
          <TouchableOpacity
            style={styles.adjustButton}
            onPress={toggleAmPm}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Icon name="chevron-up" size={iconSize} color={iconColor} />
          </TouchableOpacity>
          
          <Text style={styles.timeValue}>{getAmPm()}</Text>
          
          <TouchableOpacity
            style={styles.adjustButton}
            onPress={toggleAmPm}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Icon name="chevron-down" size={iconSize} color={iconColor} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  column: {
    alignItems: 'center',
    marginHorizontal: 12,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: '500',
    color: '#111827',
    marginVertical: 8,
    fontFamily: 'Inter-Medium',
    minWidth: 36,
    textAlign: 'center',
  },
  separator: {
    fontSize: 24,
    fontWeight: '500',
    color: '#111827',
  },
  adjustButton: {
    padding: 8,
    borderRadius: 8,
  },
});

export default TimeSelector;
