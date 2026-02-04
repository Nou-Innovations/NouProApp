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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Check, Crown, Zap, Building2, Rocket, Users, MapPin, X } from 'lucide-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppButton from '@/shared/components/ui/AppButton';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { API_BASE_URL } from '@/config/env';
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
  const pricePerMonth = billingPeriod === 'YEARLY' 
    ? PLAN_PRICES_YEARLY_MONTHLY[plan] 
    : PLAN_PRICES_MONTHLY[plan];
  const savings = billingPeriod === 'YEARLY' ? getYearlySavings(plan) : 0;
  
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
            borderColor: isCurrentPlan ? '#22C55E' : (isSelected ? planColor : appTheme.colors.borderColor),
            borderWidth: isCurrentPlan ? 2 : (isSelected ? 2 : 1),
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
        {isCurrentPlan && (
          <View style={[styles.topBadge, plan === 'business' ? styles.topBadgeRight : styles.topBadgeLeft, { backgroundColor: '#22C55E' }]}>
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
              {billingPeriod === 'YEARLY' ? '/month' : '/month'}
            </Text>
          )}
        </View>

        {/* Billing period note for yearly */}
        {billingPeriod === 'YEARLY' && plan !== 'free' && (
          <Text style={[styles.billedYearlyText, { color: appTheme.colors.textSecondary }]}>
            billed yearly
          </Text>
        )}

        {/* Badges Row - Savings and Free Trial */}
        {(billingPeriod === 'YEARLY' && plan !== 'free' && savings > 0) || FREE_TRIAL_DAYS[plan] > 0 ? (
          <View style={styles.badgesRow}>
            {billingPeriod === 'YEARLY' && plan !== 'free' && savings > 0 && (
              <View style={[styles.savingsBadge, { backgroundColor: '#22C55E' }]}>
                <Text style={[styles.savingsText, { color: '#ffffff' }]}>
                  Save {CURRENCY.symbol}{savings.toLocaleString()}/year
                </Text>
              </View>
            )}
            {FREE_TRIAL_DAYS[plan] > 0 && (
              <View style={[styles.freeTrialBadge, { backgroundColor: planColor }]}>
                <Text style={styles.freeTrialBadgeText}>
                  {FREE_TRIAL_DAYS[plan]} days free
                </Text>
              </View>
            )}
          </View>
        ) : null}

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
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('YEARLY'); // Default to yearly
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Get active business from store
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const currentPlan: SubscriptionPlan = activeBusiness?.plan || 'free';
  
  const plans: SubscriptionPlan[] = ['free', 'pro', 'business', 'enterprise'];
  
  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
  };
  
  const handleContinue = async () => {
    if (selectedPlan === currentPlan || !activeBusiness?.id) {
      return;
    }
    
    // Get access token for authentication
    const accessToken = useProfileStore.getState().accessToken;
    if (!accessToken) {
      Alert.alert('Error', 'Please log in again to update your subscription.');
      return;
    }
    
    setIsUpdating(true);
    
    try {
      // Call API to update subscription
      const response = await fetch(
        `${API_BASE_URL}/businesses/${activeBusiness.id}/subscription`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            subscriptionTier: selectedPlan.toUpperCase(),
            billingPeriod: billingPeriod, // Already UPPERCASE
          }),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update subscription');
      }
      
      const result = await response.json();
      
      // Update the store with the new subscription data
      useProfileStore.getState().updateUserBusiness(activeBusiness.id, {
        plan: selectedPlan,
      });
      
      // Show success message
      Alert.alert(
        'Success',
        `Subscription updated to ${PLAN_INFO[selectedPlan].name}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Subscription update error:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to update subscription. Please try again.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const isUpgrade = selectedPlan !== 'free' && selectedPlan !== currentPlan;
  
  // Get pricing for selected plan based on billing period
  const selectedPrice = billingPeriod === 'YEARLY' 
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
          <View style={styles.buttonWrapper}>
            <AppButton
              title="Monthly"
              onPress={() => setBillingPeriod('MONTHLY')}
              variant={billingPeriod === 'MONTHLY' ? 'primary' : 'outline'}
              style={styles.billingToggleButton}
            />
          </View>
          <View style={styles.buttonWrapper}>
            <TouchableOpacity
              style={[
                styles.customYearlyButton,
                billingPeriod === 'YEARLY' 
                  ? { backgroundColor: appTheme.colors.primary }
                  : styles.yearlyButtonOutline,
                { borderColor: appTheme.colors.primary }
              ]}
              onPress={() => setBillingPeriod('YEARLY')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.yearlyMainText,
                { color: billingPeriod === 'YEARLY' ? appTheme.colors.background : appTheme.colors.primary }
              ]}>
                Yearly
              </Text>
              {billingPeriod === 'YEARLY' && (
                <Text style={styles.yearlySaveText}>
                  Save up to 11%
                </Text>
              )}
            </TouchableOpacity>
          </View>
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
          disabled={selectedPlan === currentPlan || isUpdating}
          loading={isUpdating}
        />
        {selectedPlan !== 'free' && selectedPlan !== currentPlan && (
          <>
            {billingPeriod === 'YEARLY' ? (
              <Text style={[styles.ctaSubtext, { color: '#22C55E' }]}>
                Save {CURRENCY.symbol}{getYearlySavings(selectedPlan).toLocaleString()}/year
              </Text>
            ) : (
              <Text style={[styles.ctaSubtext, { color: appTheme.colors.textSecondary }]}>
                {CURRENCY.symbol}{selectedPrice.toLocaleString()}/month
              </Text>
            )}
          </>
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
    gap: 8,
  },
  buttonWrapper: {
    flex: 1,
  },
  billingToggleButton: {
    width: '100%',
  },
  customYearlyButton: {
    height: 56,
    borderRadius: 8,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  yearlyButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  yearlyMainText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  yearlySaveText: {
    fontSize: 11,
    fontFamily: theme.fonts.primary.semiBold,
    color: '#22C55E',
    marginTop: 2,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  freeTrialBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
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
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginTop: -8,
    marginBottom: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  savingsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  savingsText: {
    fontSize: 14,
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
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
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
