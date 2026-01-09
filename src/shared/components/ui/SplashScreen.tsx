import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Platform, Animated } from 'react-native';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';

interface SplashScreenProps {
  animationComplete?: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = (props) => {
  const { animationComplete = () => {} } = props || {};
  const { theme: appTheme } = useTheme();
  
  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Start animations in sequence
    Animated.sequence([
      // Logo animation
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      
      // Tagline animation
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      
      // Progress bar animation
      Animated.timing(progressWidth, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: false,
      }),
    ]).start(() => {
      // Notify when animations are complete
      setTimeout(() => {
        animationComplete();
      }, 300);
    });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      <View style={styles.logoContainer}>
        <Animated.View style={styles.letterContainer}>
          <Animated.Text 
            style={[
              styles.logoText,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
                color: '#FFFFFF'
              }
            ]}
          >
            NOUPRO
          </Animated.Text>
        </Animated.View>
      </View>
      
      {/* Tagline */}
      <Animated.View style={[styles.taglineContainer, { opacity: taglineOpacity }]}>
        <Text style={styles.tagline}>Take the control</Text>
      </Animated.View>
      
      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <Animated.View 
          style={[
            styles.progressBar,
            {
              width: progressWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%']
              }),
              backgroundColor: appTheme.colors.accent
            }
          ]} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: theme.fontSize.xxxl, // Using theme size (56px)
    fontFamily: theme.fonts.primary.extraBold, // Using theme font
    letterSpacing: 2,
    marginBottom: 16, // 16px as requested
  },
  letterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taglineContainer: {
    marginTop: 8,
  },
  tagline: {
    fontSize: 20, // 20px as requested
    fontFamily: theme.fonts.primary.medium, // Using theme font
    color: '#AAAAAA',
    textAlign: 'center', 
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 60,
    left: 40,
    right: 40,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
});

export default SplashScreen; 