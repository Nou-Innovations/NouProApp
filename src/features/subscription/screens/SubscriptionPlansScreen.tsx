/**
 * SubscriptionPlansScreen
 * Displays all subscription plans for businesses to choose from
 * Based on app-logic.json subscriptionPlans and design.json
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Check, Crown, Zap, Building2, Rocket, Users, MapPin, X } from 'lucide-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppButton from '@/shared/components/ui/AppButton';
import theme from '@/shared/theme';
import {
  SubscriptionPlan,
  PLAN_INFO,
  PLAN_PRICES,
  PLAN_LIMITS,
  PLAN_FEATURES,
  CURRENCY,
} from '@/shared/types/subscription';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Plan colors based on design system
const PLAN_COLORS: Record<SubscriptionPlan, string> = {
  free: '#6B7280',    // Gray for free
  pro: '#0075FF',     // Blue for pro
  business: '#A76AF0', // Purple for business
  enterprise: '#FFB600', // Gold for enterprise
};

// Plan icons
const PLAN_ICONS: Record<SubscriptionPlan, React.ComponentType<any>> = {
  free: Zap,
  pro: Rocket,
  business: Building2,
  enterprise: Crown,
};

interface PlanCardProps {
  plan: SubscriptionPlan;
  isSelected: boolean;
  isCurrentPlan?: boolean;
  onSelect: () => void;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, isSelected, isCurrentPlan, onSelect }) => {
  const { theme: appTheme } = useTheme();
  const planInfo = PLAN_INFO[plan];
  const planLimits = PLAN_LIMITS[plan];
  const planFeatures = PLAN_FEATURES[plan];
  const planColor = PLAN_COLORS[plan];
  const IconComponent = PLAN_ICONS[plan];
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  // Format limit display
  const formatLimit = (value: number | 'unlimited') => {
    return value === 'unlimited' ? 'Unlimited' : value.toString();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.planCard,
          { 
            backgroundColor: appTheme.colors.background,
            borderColor: isSelected ? planColor : appTheme.colors.borderColor,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
        onPress={onSelect}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Popular Badge for Pro */}
        {plan === 'pro' && (
          <View style={[styles.popularBadge, { backgroundColor: planColor }]}>
            <Text style={styles.popularBadgeText}>Most Popular</Text>
          </View>
        )}
        
        {/* Current Plan Badge */}
        {isCurrentPlan && (
          <View style={[styles.currentBadge, { backgroundColor: appTheme.colors.success }]}>
            <Text style={styles.currentBadgeText}>Current Plan</Text>
          </View>
        )}

        {/* Plan Header */}
        <View style={styles.planHeader}>
          <View style={[styles.planIconContainer, { backgroundColor: `${planColor}15` }]}>
            <IconComponent size={24} color={planColor} strokeWidth={2} />
          </View>
          <View style={styles.planTitleContainer}>
            <Text style={[styles.planName, { color: appTheme.colors.text }]}>
              {planInfo.name}
            </Text>
            <Text style={[styles.planTarget, { color: appTheme.colors.textSecondary }]}>
              {planInfo.targetUser}
            </Text>
          </View>
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={[styles.currencySymbol, { color: appTheme.colors.text }]}>
            {CURRENCY.symbol}
          </Text>
          <Text style={[styles.priceAmount, { color: appTheme.colors.text }]}>
            {PLAN_PRICES[plan].toLocaleString()}
          </Text>
          {planInfo.period && (
            <Text style={[styles.pricePeriod, { color: appTheme.colors.textSecondary }]}>
              {planInfo.period}
            </Text>
          )}
        </View>

        {/* Limits */}
        <View style={styles.limitsContainer}>
          <View style={styles.limitItem}>
            <Users size={16} color={appTheme.colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.limitText, { color: appTheme.colors.textSecondary }]}>
              {formatLimit(planLimits.staff)} staff
            </Text>
          </View>
          <View style={styles.limitItem}>
            <MapPin size={16} color={appTheme.colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.limitText, { color: appTheme.colors.textSecondary }]}>
              {formatLimit(planLimits.locations)} locations
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: appTheme.colors.borderColor }]} />

        {/* Features List */}
        <View style={styles.featuresContainer}>
          {planInfo.highlights.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Check size={18} color={planColor} strokeWidth={2.5} />
              <Text style={[styles.featureText, { color: appTheme.colors.text }]}>
                {feature}
              </Text>
            </View>
          ))}
        </View>

        {/* Selection Indicator */}
        <View style={[
          styles.selectionIndicator,
          { 
            borderColor: isSelected ? planColor : appTheme.colors.borderColor,
            backgroundColor: isSelected ? planColor : 'transparent',
          }
        ]}>
          {isSelected && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function SubscriptionPlansScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('pro');
  
  // Mock current plan - in real app, get from business store
  const currentPlan: SubscriptionPlan = 'free';
  
  const plans: SubscriptionPlan[] = ['free', 'pro', 'business', 'enterprise'];
  
  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
  };
  
  const handleContinue = () => {
    if (selectedPlan === currentPlan) {
      return;
    }
    // Navigate to payment or confirmation
    // For now, show success feedback
    console.log(`Selected plan: ${selectedPlan}`);
  };

  const isUpgrade = selectedPlan !== 'free' && selectedPlan !== currentPlan;
  const buttonText = selectedPlan === currentPlan 
    ? 'Current Plan' 
    : selectedPlan === 'free' 
      ? 'Downgrade to Free' 
      : `Upgrade to ${PLAN_INFO[selectedPlan].name}`;

  return (
    <SafeAreaView 
      style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} 
      edges={['top']}
    >
      <SecondaryHeader
        title="Subscription"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={[styles.mainTitle, { color: appTheme.colors.text }]}>
            Choose the best plan{'\n'}for your company
          </Text>
          <Text style={[styles.subtitle, { color: appTheme.colors.textSecondary }]}>
            Unlock powerful features to grow your business
          </Text>
        </View>

        {/* Plans Grid */}
        <View style={styles.plansContainer}>
          {plans.map((plan) => (
            <PlanCard
              key={plan}
              plan={plan}
              isSelected={selectedPlan === plan}
              isCurrentPlan={currentPlan === plan}
              onSelect={() => handleSelectPlan(plan)}
            />
          ))}
        </View>

        {/* Info Text */}
        <View style={styles.infoSection}>
          <Text style={[styles.infoText, { color: appTheme.colors.textSecondary }]}>
            All plans include a 7-day free trial. Cancel anytime.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomCTA, { backgroundColor: appTheme.colors.background }]}>
        <AppButton
          title={buttonText}
          onPress={handleContinue}
          variant={selectedPlan === currentPlan ? 'disabled' : isUpgrade ? 'primary' : 'outline'}
          disabled={selectedPlan === currentPlan}
        />
        {selectedPlan !== 'free' && selectedPlan !== currentPlan && (
          <Text style={[styles.ctaSubtext, { color: appTheme.colors.textSecondary }]}>
            {CURRENCY.symbol} {PLAN_PRICES[selectedPlan].toLocaleString()}{PLAN_INFO[selectedPlan].period}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  titleSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  mainTitle: {
    fontSize: 28,
    fontFamily: theme.fonts.primary.bold,
    lineHeight: 36,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginTop: 8,
  },
  plansContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: theme.fonts.primary.bold,
  },
  currentBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: theme.fonts.primary.bold,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planTitleContainer: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontFamily: theme.fonts.primary.bold,
  },
  planTarget: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.semiBold,
    marginRight: 2,
  },
  priceAmount: {
    fontSize: 36,
    fontFamily: theme.fonts.primary.bold,
  },
  pricePeriod: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
    marginLeft: 4,
  },
  limitsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  limitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  limitText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  featuresContainer: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    flex: 1,
    lineHeight: 20,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  infoText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
  },
  bottomCTA: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E1E4EA',
  },
  ctaSubtext: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    textAlign: 'center',
    marginTop: 8,
  },
});
