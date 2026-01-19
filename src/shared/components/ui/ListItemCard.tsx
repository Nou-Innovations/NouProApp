/**
 * ListItemCard - Universal list item card component
 * 
 * Use for: Staff lists, notifications, activity feeds, message lists, 
 * selection modals, and any avatar + title + subtitle pattern.
 * 
 * NOT for: CartItemCard, ProductCard, DeliveryCard, InvoiceCard, BrandCard
 * (These have specialized layouts)
 * 
 * Layout:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ [Avatar]  Title              [StatusPill] Timestamp    [...]   │
 * │           Subtitle           [Right Row 2 content]             │
 * │           Extra info         [Right Row 3 content]             │
 * │           [Bottom Element spans from avatar end to options]    │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ divider (1px surface, marginHorizontal 8px)                    │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * Key behaviors:
 * - Content (title/subtitle/right) is vertically centered with avatar
 * - Bottom element spans full width from after avatar to options button
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { LIST_ITEM_CARD } from '@/shared/ui/tokens/cards';
import Avatar from './Avatar';

// ============================================================================
// TYPES
// ============================================================================

export interface ListItemCardAvatarProps {
  /** Type of avatar content */
  type: 'image' | 'initials' | 'icon';
  /** Image URI for profile picture */
  imageUri?: string | null;
  /** User ID for color generation */
  userId?: string;
  /** User/business name for initials + color generation */
  userName?: string;
  /** Icon name if type === 'icon' */
  icon?: string;
  /** Override icon color */
  iconColor?: string;
  /** Override background color */
  backgroundColor?: string;
  /** Override border radius (default is 8px) */
  borderRadius?: number;
}

export interface ListItemCardRightRow1Props {
  /** Status pill configuration */
  statusPill?: {
    text: string;
    color: string;
  };
  /** Timestamp text */
  timestamp?: string;
}

export interface ListItemCardProps {
  // === AVATAR (left) ===
  avatar?: ListItemCardAvatarProps;

  // === LEFT CONTENT ===
  /** Title text (Row 1) - 16px bold primary */
  title: string;
  /** Subtitle text (Row 2) - 14px semiBold textSecondary */
  subtitle?: string;
  /** Extra info text (Row 3) - 14px medium textMuted */
  extraInfo?: string;

  // === RIGHT CONTENT (row-aligned) ===
  /** Row 1 right: Status pill + Timestamp */
  rightRow1?: ListItemCardRightRow1Props;
  /** Row 2 right: Custom content (badges, extra text, etc.) */
  rightRow2?: React.ReactNode;
  /** Row 3 right: Custom content */
  rightRow3?: React.ReactNode;
  
  // === RIGHT COLUMN (stacked, alternative to row-aligned) ===
  /** Custom right column element that spans all rows (use instead of rightRow1/2/3) */
  rightColumn?: React.ReactNode;

  // === OPTIONS BUTTON (far right) ===
  /** Show 3-dots options button */
  showOptionsButton?: boolean;
  /** Callback when options button pressed */
  onOptionsPress?: () => void;

  // === CHECKMARK (far right, alternative to options) ===
  /** Show checkmark (for selection) */
  showCheckmark?: boolean;
  /** Whether item is selected (fills checkmark) */
  selected?: boolean;

  // === STATUS PILL (left of checkmark, for vehicle status etc.) ===
  /** Status pill configuration (appears left of checkmark) */
  statusPill?: {
    text: string;
    color: string;
  };

  // === CHEVRON (far right, for navigation) ===
  /** Show chevron arrow (for navigation indication) */
  showChevron?: boolean;

  // === BOTTOM ELEMENT ===
  /** Content below the main row (Accept/Decline buttons, etc.) */
  bottomElement?: React.ReactNode;

  // === BEHAVIOR ===
  /** Callback when card is pressed */
  onPress?: () => void;
  /** Disable interactions */
  disabled?: boolean;

  // === SELECTION VARIANT ===
  /** Selection style: 'highlight' changes bg, 'border' adds border, 'optionList' for checkbox list */
  selectionVariant?: 'highlight' | 'border' | 'optionList';

  // === DIVIDER ===
  /** Show bottom divider */
  showDivider?: boolean;

  // === STYLING ===
  /** Custom container style */
  style?: ViewStyle;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Status Pill - small colored badge */
const StatusPill: React.FC<{ text: string; color: string }> = ({ text, color }) => {
  return (
    <View style={[styles.statusPill, { backgroundColor: `${color}20` }]}>
      <Text style={[styles.statusPillText, { color }]}>{text}</Text>
    </View>
  );
};

/** Checkmark circle for selections */
const Checkmark: React.FC<{ 
  selected: boolean; 
  color: string;
  isOptionList?: boolean;
}> = ({ selected, color, isOptionList }) => {
  const { theme: appTheme } = useTheme();
  
  if (selected) {
    // Option list variant: white bg, no border, primary icon
    if (isOptionList) {
      return (
        <View style={[styles.checkmark, styles.checkmarkOptionList]}>
          <Icon name="checkmark" size={LIST_ITEM_CARD.checkmark.iconSize} color={color} />
        </View>
      );
    }
    // Default: colored bg with white icon
    return (
      <View style={[styles.checkmark, { backgroundColor: color }]}>
        <Icon name="checkmark" size={LIST_ITEM_CARD.checkmark.iconSize} color="#FFFFFF" />
      </View>
    );
  }
  
  return (
    <View style={[styles.checkmarkEmpty, { borderColor: appTheme.colors.borderColor }]} />
  );
};

/** Options Button (3 dots) */
const OptionsButton: React.FC<{ onPress?: () => void; color: string }> = ({ onPress, color }) => {
  return (
    <TouchableOpacity
      style={styles.optionsButton}
      onPress={onPress}
      hitSlop={{ 
        top: LIST_ITEM_CARD.optionsButton.hitSlop, 
        bottom: LIST_ITEM_CARD.optionsButton.hitSlop, 
        left: LIST_ITEM_CARD.optionsButton.hitSlop, 
        right: LIST_ITEM_CARD.optionsButton.hitSlop 
      }}
      activeOpacity={0.7}
    >
      <Icon name="ellipsis-vertical" size={LIST_ITEM_CARD.optionsButton.iconSize} color={color} />
    </TouchableOpacity>
  );
};

/** Icon Avatar - when avatar type is 'icon' or just a colored circle */
const IconAvatar: React.FC<{
  icon?: string;
  iconColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
}> = ({ icon, iconColor, backgroundColor, borderRadius }) => {
  const { theme: appTheme } = useTheme();
  const bgColor = backgroundColor || `${appTheme.colors.primary}15`;
  const color = iconColor || appTheme.colors.primary;
  const radius = borderRadius ?? LIST_ITEM_CARD.avatar.borderRadius;
  
  return (
    <View style={[styles.iconAvatar, { backgroundColor: bgColor, borderRadius: radius }]}>
      {icon ? <Icon name={icon as any} size={LIST_ITEM_CARD.avatar.iconSize} color={color} /> : null}
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ListItemCard({
  avatar,
  title,
  subtitle,
  extraInfo,
  rightRow1,
  rightRow2,
  rightRow3,
  rightColumn,
  showOptionsButton = false,
  onOptionsPress,
  showCheckmark = false,
  selected = false,
  statusPill,
  showChevron = false,
  bottomElement,
  onPress,
  disabled = false,
  selectionVariant,
  showDivider = true,
  style,
}: ListItemCardProps) {
  const { theme: appTheme } = useTheme();

  // Check if options button is shown (only this gets 4px right padding)
  const hasOptionsButton = showOptionsButton;

  // Determine container styles based on selection variant
  const getContainerStyle = (): ViewStyle[] => {
    const baseStyles: ViewStyle[] = [
      styles.container,
      { backgroundColor: appTheme.colors.cardBackground },
    ];

    // Reduce right padding ONLY when options button is shown (4px)
    if (hasOptionsButton) {
      baseStyles.push(styles.containerWithOptionsButton);
    }

    if (selectionVariant === 'highlight' && selected) {
      baseStyles.push({ backgroundColor: `${appTheme.colors.primary}08` });
    }

    if (selectionVariant === 'border') {
      baseStyles.push(styles.borderVariant);
      baseStyles.push({
        borderColor: selected ? appTheme.colors.primary : appTheme.colors.borderColor,
        backgroundColor: selected ? `${appTheme.colors.primary}08` : appTheme.colors.cardBackground,
      });
    }

    // Option list variant: when selected, card bg becomes primary, 8px radius, no top/bottom border
    if (selectionVariant === 'optionList') {
      baseStyles.push(styles.optionListVariant);
      if (selected) {
        baseStyles.push({ backgroundColor: appTheme.colors.primary });
      }
    }

    if (style) {
      baseStyles.push(style);
    }

    return baseStyles;
  };

  // Render avatar based on type
  const renderAvatar = () => {
    if (!avatar) return null;

    if (avatar.type === 'icon') {
      return (
        <IconAvatar
          icon={avatar.icon}
          iconColor={avatar.iconColor}
          backgroundColor={avatar.backgroundColor}
          borderRadius={avatar.borderRadius}
        />
      );
    }

    // For 'image' or 'initials' type, use Avatar component
    return (
      <Avatar
        userId={avatar.userId || 'default'}
        userName={avatar.userName || title}
        imageUri={avatar.imageUri}
        size={LIST_ITEM_CARD.avatar.size}
        borderRadius={avatar.borderRadius ?? LIST_ITEM_CARD.avatar.borderRadius}
      />
    );
  };

  // Check if we have right content for each row
  const hasRightRow1Content = rightRow1?.statusPill || rightRow1?.timestamp;
  
  // Check if there are any right elements (far right buttons or right row content)
  const hasRightElements = showCheckmark || showOptionsButton || showChevron || rightRow1 || rightRow2 || rightRow3;
  
  // Determine gap size: 4px when right elements present or only title+subtitle, 2px when extraInfo without right elements
  const hasOnlyTwoLines = subtitle && !extraInfo;
  const lineGap = hasRightElements || hasOnlyTwoLines ? 4 : 2;

  // Determine if this is optionList variant
  const isOptionList = selectionVariant === 'optionList';

  // Render far right element (options button, checkmark, or chevron)
  const renderFarRight = () => {
    if (showCheckmark) {
      return (
        <View style={styles.farRightContainer}>
          {statusPill && (
            <View style={[styles.statusPillFarRight, { backgroundColor: `${statusPill.color}20` }]}>
              <Text style={[styles.statusPillText, { color: statusPill.color }]}>{statusPill.text}</Text>
            </View>
          )}
          <Checkmark 
            selected={selected} 
            color={appTheme.colors.primary} 
            isOptionList={isOptionList && selected}
          />
        </View>
      );
    }

    if (showOptionsButton) {
      return <OptionsButton onPress={onOptionsPress} color={appTheme.colors.text} />;
    }

    if (showChevron) {
      return (
        <View style={styles.chevronContainer}>
          <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
        </View>
      );
    }

    return null;
  };

  const CardWrapper = onPress ? TouchableOpacity : View;
  const cardProps = onPress
    ? { onPress, disabled, activeOpacity: 0.7 }
    : {};

  // Determine if we have bottom element - affects layout structure
  const hasBottomElement = !!bottomElement;
  const hasFarRight = showCheckmark || showOptionsButton || showChevron;

  return (
    <>
      <CardWrapper style={getContainerStyle()} {...cardProps}>
        {/* Top Row: Avatar + Content + FarRight */}
        <View style={styles.topRow}>
          {/* Avatar */}
          {avatar && <View style={styles.avatarContainer}>{renderAvatar()}</View>}

          {/* Main Content - vertically centered with avatar */}
          <View style={styles.mainContent}>
            {rightColumn ? (
              /* When rightColumn is provided, render left content + right column side by side */
              <View style={styles.contentWithRightColumn}>
                <View style={styles.leftContent}>
                  <Text
                    style={[
                      styles.title, 
                      { color: isOptionList && selected ? '#FFFFFF' : appTheme.colors.text }
                    ]}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  {subtitle && (
                    <Text
                      style={[
                        styles.subtitle, 
                        { color: isOptionList && selected ? appTheme.colors.textMuted : appTheme.colors.textSecondary },
                        { marginTop: lineGap }
                      ]}
                      numberOfLines={2}
                    >
                      {subtitle}
                    </Text>
                  )}
                  {extraInfo && (
                    <Text
                      style={[styles.extraInfo, { color: appTheme.colors.textMuted }, { marginTop: lineGap }]}
                      numberOfLines={1}
                    >
                      {extraInfo}
                    </Text>
                  )}
                </View>
                <View style={styles.rightColumnContainer}>
                  {rightColumn}
                </View>
              </View>
            ) : (
              /* Default row-based layout */
              <>
                {/* Row 1: Title + Right Row 1 (status pill, timestamp) */}
                <View style={styles.contentRow}>
                  <Text
                    style={[
                      styles.title, 
                      { color: isOptionList && selected ? '#FFFFFF' : appTheme.colors.text }
                    ]}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  {hasRightRow1Content && (
                    <View style={styles.rightRowContent}>
                      {rightRow1?.statusPill && (
                        <StatusPill text={rightRow1.statusPill.text} color={rightRow1.statusPill.color} />
                      )}
                      {rightRow1?.timestamp && (
                        <Text style={[
                          styles.timestamp, 
                          { color: appTheme.colors.textMuted },
                          // Add margin only when status pill is present
                          rightRow1?.statusPill && { marginLeft: 8 }
                        ]}>
                          {rightRow1.timestamp}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Row 2: Subtitle + Right Row 2 */}
                {(subtitle || rightRow2) && (
                  <View style={[styles.contentRow, { marginTop: lineGap }]}>
                    {subtitle && (
                      <Text
                        style={[
                          styles.subtitle, 
                          { color: isOptionList && selected ? appTheme.colors.textMuted : appTheme.colors.textSecondary }
                        ]}
                        numberOfLines={1}
                      >
                        {subtitle}
                      </Text>
                    )}
                    {rightRow2 && <View style={styles.rightRowContent}>{rightRow2}</View>}
                  </View>
                )}

                {/* Row 3: Extra Info + Right Row 3 */}
                {(extraInfo || rightRow3) && (
                  <View style={[styles.contentRow, { marginTop: lineGap }]}>
                    {extraInfo && (
                      <Text
                        style={[styles.extraInfo, { color: appTheme.colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {extraInfo}
                      </Text>
                    )}
                    {rightRow3 && <View style={styles.rightRowContent}>{rightRow3}</View>}
                  </View>
                )}
              </>
            )}
          </View>

          {/* Far Right (Options/Checkmark/Chevron) */}
          {renderFarRight()}
        </View>

        {/* Bottom Element - spans from avatar end to far right (or edge) */}
        {hasBottomElement && (
          <View style={[
            styles.bottomElement,
            { marginRight: hasFarRight ? LIST_ITEM_CARD.optionsButton.size : 0 }
          ]}>
            {bottomElement}
          </View>
        )}
      </CardWrapper>

      {/* Divider */}
      {showDivider && selectionVariant !== 'border' && selectionVariant !== 'optionList' && (
        <View style={[styles.divider, { backgroundColor: appTheme.colors.surface }]} />
      )}
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    paddingLeft: LIST_ITEM_CARD.paddingHorizontal,
    paddingRight: LIST_ITEM_CARD.paddingHorizontal,
    paddingVertical: LIST_ITEM_CARD.paddingVertical,
  },
  containerWithOptionsButton: {
    paddingRight: 4, // Only 4px when options button (3-dots) is shown
  },
  borderVariant: {
    borderWidth: LIST_ITEM_CARD.selectionBorder.borderWidth,
    borderRadius: LIST_ITEM_CARD.selectionBorder.borderRadius,
    padding: LIST_ITEM_CARD.selectionBorder.padding,
    marginBottom: LIST_ITEM_CARD.selectionBorder.marginBottom,
    marginHorizontal: LIST_ITEM_CARD.paddingHorizontal,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center', // Vertically center all elements with avatar
  },
  avatarContainer: {
    marginRight: LIST_ITEM_CARD.avatar.marginRight,
  },
  iconAvatar: {
    width: LIST_ITEM_CARD.avatar.size,
    height: LIST_ITEM_CARD.avatar.size,
    borderRadius: LIST_ITEM_CARD.avatar.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  contentWithRightColumn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  leftContent: {
    flex: 1,
  },
  rightColumnContainer: {
    marginLeft: 8,
    alignItems: 'flex-end',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: LIST_ITEM_CARD.title.fontSize,
    fontFamily: LIST_ITEM_CARD.title.fontFamily,
    flex: 1,
  },
  subtitle: {
    fontSize: LIST_ITEM_CARD.subtitle.fontSize,
    fontFamily: LIST_ITEM_CARD.subtitle.fontFamily,
    flex: 1,
  },
  extraInfo: {
    fontSize: LIST_ITEM_CARD.extraInfo.fontSize,
    fontFamily: LIST_ITEM_CARD.extraInfo.fontFamily,
    flex: 1,
  },
  rightRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  timestamp: {
    fontSize: LIST_ITEM_CARD.timestamp.fontSize,
    fontFamily: LIST_ITEM_CARD.timestamp.fontFamily,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  optionsButton: {
    width: LIST_ITEM_CARD.optionsButton.size,
    height: LIST_ITEM_CARD.optionsButton.size,
    justifyContent: 'center',
    alignItems: 'flex-end', // Align icon to right edge
  },
  checkmark: {
    width: LIST_ITEM_CARD.checkmark.size,
    height: LIST_ITEM_CARD.checkmark.size,
    borderRadius: LIST_ITEM_CARD.checkmark.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkEmpty: {
    width: LIST_ITEM_CARD.checkmark.size,
    height: LIST_ITEM_CARD.checkmark.size,
    borderRadius: LIST_ITEM_CARD.checkmark.borderRadius,
    borderWidth: 2,
  },
  checkmarkOptionList: {
    backgroundColor: '#FFFFFF',
  },
  farRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPillFarRight: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  chevronContainer: {
    width: LIST_ITEM_CARD.optionsButton.size,
    height: LIST_ITEM_CARD.optionsButton.size,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionListVariant: {
    borderRadius: 8,
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  bottomElement: {
    marginTop: 8,
    marginLeft: LIST_ITEM_CARD.avatar.size + LIST_ITEM_CARD.avatar.marginRight, // Start from after avatar
  },
  divider: {
    height: LIST_ITEM_CARD.divider.height,
    marginHorizontal: LIST_ITEM_CARD.divider.marginHorizontal,
  },
});

export default ListItemCard;
