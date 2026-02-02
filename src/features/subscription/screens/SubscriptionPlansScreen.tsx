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
  BillingPeriod,
  PLAN_INFO,
  PLAN_PRICES_MONTHLY,
  PLAN_PRICES_YEARLY_MONTHLY,
  PLAN_LIMITS,
  PLAN_FEATURES,
  CURRENCY,
  FREE_TRIAL_DAYS,
  getYearlySavings,
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
  billingPeriod: BillingPeriod;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, isSelected, isCurrentPlan, onSelect, billingPeriod }) => {
  const { theme: appTheme } = useTheme();
  const planInfo = PLAN_INFO[plan];
  const planLimits = PLAN_LIMITS[plan];
  const planFeatures = PLAN_FEATURES[plan];
  const planColor = PLAN_COLORS[plan];
  const IconComponent = PLAN_ICONS[plan];
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Get pricing based on billing period
  const pricePerMonth = billingPeriod === 'yearly' 
    ? PLAN_PRICES_YEARLY_MONTHLY[plan] 
    : PLAN_PRICES_MONTHLY[plan];
  const savings = billingPeriod === 'yearly' ? getYearlySavings(plan) : 0;
  
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
    return value === 'unlimited' ? 'Unlimited' : value.toLocaleString();
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
        {/* Top Badges */}
        {plan === 'business' && (
          <View style={[styles.topBadge, styles.topBadgeLeft, { backgroundColor: planColor }]}>
            <Text style={styles.topBadgeText}>⭐ Most Popular</Text>
          </View>
        )}
        {billingPeriod === 'yearly' && plan !== 'free' && !isCurrentPlan && (
          <View style={[styles.topBadge, plan === 'business' ? styles.topBadgeRight : styles.topBadgeLeft, { backgroundColor: '#22C55E' }]}>
            <Text style={styles.topBadgeText}>Best value</Text>
          </View>
        )}
        {isCurrentPlan && (
          <View style={[styles.topBadge, (plan === 'business' || (billingPeriod === 'yearly' && plan !== 'free')) ? styles.topBadgeRight : styles.topBadgeLeft, { backgroundColor: appTheme.colors.success }]}>
            <Text style={styles.topBadgeText}>Current Plan</Text>
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
            {pricePerMonth.toLocaleString()}
          </Text>
          {plan !== 'free' && (
            <Text style={[styles.pricePeriod, { color: appTheme.colors.textSecondary }]}>
              {billingPeriod === 'yearly' ? '/month' : '/month'}
            </Text>
          )}
        </View>

        {/* Billing period note for yearly */}
        {billingPeriod === 'yearly' && plan !== 'free' && (
          <Text style={[styles.billedYearlyText, { color: appTheme.colors.textSecondary }]}>
            billed yearly
          </Text>
        )}

        {/* Savings badge for yearly billing */}
        {billingPeriod === 'yearly' && plan !== 'free' && savings > 0 && (
          <View style={[styles.savingsBadge, { backgroundColor: '#22C55E15' }]}>
            <Text style={[styles.savingsText, { color: '#22C55E' }]}>
              Save {CURRENCY.symbol}{savings.toLocaleString()}/year
            </Text>
          </View>
        )}

        {/* Free Trial Badge for paid plans */}
        {FREE_TRIAL_DAYS[plan] > 0 && (
          <View style={[styles.freeTrialBadge, { backgroundColor: planColor }]}>
            <Text style={styles.freeTrialBadgeText}>
              {FREE_TRIAL_DAYS[plan]} days free
            </Text>
          </View>
        )}

        {/* Limits */}
        <View style={styles.limitsContainer}>
          <View style={styles.limitItem}>
            <Users size={16} color={appTheme.colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.limitText, { color: appTheme.colors.textSecondary }]}>
              {formatLimit(planLimits.staff)} {planLimits.staff === 1 ? 'user' : 'staff'}
            </Text>
          </View>
          <View style={styles.limitItem}>
            <MapPin size={16} color={appTheme.colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.limitText, { color: appTheme.colors.textSecondary }]}>
              {formatLimit(planLimits.locations)} {planLimits.locations === 1 ? 'location' : 'locations'}
            </Text>
          </View>
          <View style={styles.limitItem}>
            <Building2 size={16} color={appTheme.colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.limitText, { color: appTheme.colors.textSecondary }]}>
              {formatLimit(planLimits.products)} {planLimits.products === 1 ? 'product' : 'products'}
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
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('business');
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('yearly'); // Default to yearly
  
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
    console.log(`Selected plan: ${selectedPlan}, billing: ${billingPeriod}`);
  };

  const isUpgrade = selectedPlan !== 'free' && selectedPlan !== currentPlan;
  
  // Get pricing for selected plan based on billing period
  const selectedPrice = billingPeriod === 'yearly' 
    ? PLAN_PRICES_YEARLY_MONTHLY[selectedPlan] 
    : PLAN_PRICES_MONTHLY[selectedPlan];
  
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

        {/* Billing Period Toggle */}
        <View style={styles.billingToggleContainer}>
          <TouchableOpacity
            style={[
              styles.billingToggleButton,
              billingPeriod === 'monthly' && styles.billingToggleButtonActive,
              { 
                backgroundColor: billingPeriod === 'monthly' ? '#0075FF' : appTheme.colors.surface,
                borderColor: appTheme.colors.borderColor,
              }
            ]}
            onPress={() => setBillingPeriod('monthly')}
          >
            <Text style={[
              styles.billingToggleText,
              { color: billingPeriod === 'monthly' ? '#FFFFFF' : appTheme.colors.text }
            ]}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.billingToggleButton,
              billingPeriod === 'yearly' && styles.billingToggleButtonActive,
              { 
                backgroundColor: billingPeriod === 'yearly' ? '#0075FF' : appTheme.colors.surface,
                borderColor: appTheme.colors.borderColor,
              }
            ]}
            onPress={() => setBillingPeriod('yearly')}
          >
            <Text style={[
              styles.billingToggleText,
              { color: billingPeriod === 'yearly' ? '#FFFFFF' : appTheme.colors.text }
            ]}>
              Yearly
            </Text>
            {billingPeriod === 'yearly' && (
              <View style={styles.bestValuePill}>
                <Text style={styles.bestValueText}>Save up to 11%</Text>
              </View>
            )}
          </TouchableOpacity>
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
              billingPeriod={billingPeriod}
            />
          ))}
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
            {CURRENCY.symbol}{selectedPrice.toLocaleString()}/month
            {billingPeriod === 'yearly' && ' (billed yearly)'}
          </Text>
        )}
        {selectedPlan !== 'free' && selectedPlan !== currentPlan && (
          <Text style={[styles.ctaNote, { color: appTheme.colors.textSecondary }]}>
            Cancel anytime • No hidden fees • Local support
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
  billingToggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  billingToggleButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
  },
  billingToggleButtonActive: {
    borderWidth: 2,
  },
  billingToggleText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semibold,
  },
  bestValuePill: {
    position: 'absolute',
    top: -10,
    right: 8,
    backgroundColor: '#22C55E',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bestValueText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: theme.fonts.primary.bold,
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
  topBadge: {
    position: 'absolute',
    top: -12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  topBadgeLeft: {
    left: 20,
  },
  topBadgeRight: {
    right: 20,
  },
  topBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: theme.fonts.primary.bold,
  },
  freeTrialBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  freeTrialBadgeText: {
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
  billedYearlyText: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
    marginTop: -8,
    marginBottom: 12,
  },
  savingsBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  savingsText: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.semiBold,
  },
  limitsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    flexWrap: 'wrap',
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
  ctaNote: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginTop: 4,
  },
});
