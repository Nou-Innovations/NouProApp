import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';

interface AccordionSectionProps {
  title: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  children,
  isExpanded,
  onToggle,
}) => {
  const { theme: appTheme } = useTheme();
  const rotation = new Animated.Value(isExpanded ? 1 : 0);

  React.useEffect(() => {
    Animated.timing(rotation, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [isExpanded, rotation]);

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  const animatedStyle = {
    transform: [{ rotate: rotateInterpolate }],
  };

  return (
    <View style={[styles.container, { borderBottomColor: appTheme.colors.borderColor }]}>
      <TouchableOpacity 
        style={styles.headerContainer} 
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={[styles.title, { color: appTheme.colors.textDark }]}>{title}</Text>
        <Animated.View style={animatedStyle}>
          <Icon name="chevron-forward" size={theme.iconSizes.md} color={appTheme.colors.text} />
        </Animated.View>
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={styles.contentContainer}>
          {children}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: 12,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: theme.fontSize.md,
    fontFamily: theme.fonts.primary.medium,
  },
  contentContainer: {
    marginTop: theme.spacing.md,
  },
});

export default AccordionSection; 