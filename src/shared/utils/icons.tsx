/**
 * Lucide Icon Utilities
 * Centralized icon exports and mapping for the app
 */
import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  // Navigation
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  X,
  
  // Actions
  Plus,
  Minus,
  Check,
  CheckCheck,
  Pencil,
  Trash2,
  Copy,
  Share,
  Download,
  Upload,
  Send,
  Search,
  Filter,
  Settings,
  MoreHorizontal,
  MoreVertical,
  RefreshCw,
  UserPlus,
  Save,
  
  // Objects
  Home,
  User,
  Users,
  Building2,
  Package,
  ShoppingCart,
  FileText,
  Image,
  Camera,
  Bell,
  Mail,
  MessageSquare,
  MessageCircle,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Star,
  Heart,
  Bookmark,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  
  // Transport
  Car,
  Truck,
  Bike,
  Bus,
  
  // Status
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  HelpCircle,
  
  // Business
  CreditCard,
  Receipt,
  ReceiptText,
  Wallet,
  DollarSign,
  BarChart2,
  PieChart,
  TrendingUp,
  TrendingDown,
  
  // Layout
  LayoutGrid,
  List,
  Grid,
  Menu,
  
  // Security
  ShieldCheck,
  Shield,
  Key,
  
  // Social
  Link,
  ExternalLink,
  Globe,
  
  // Files
  File,
  Folder,
  
  // Misc
  LogOut,
  LogIn,
  QrCode,
  Scan,
  Sparkles,
  Zap,
  Activity,
  ArrowRightLeft,
  Undo,
  Redo,
  Video,
  Mic,
  Moon,
  BellOff,
  Archive,
  Fingerprint,
  Barcode,
  Tag,
  Clipboard,
  CheckSquare,
  
  // Categories (for ExploreScreen)
  UtensilsCrossed,
  Store,
  Hammer,
  Briefcase,
  Cpu,
  
  LucideIcon,
} from 'lucide-react-native';

// Export all icons for direct import
export {
  // Navigation
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  X,
  
  // Actions
  Plus,
  Minus,
  Check,
  CheckCheck,
  Pencil,
  Trash2,
  Copy,
  Share,
  Download,
  Upload,
  Send,
  Search,
  Filter,
  Settings,
  MoreHorizontal,
  MoreVertical,
  RefreshCw,
  UserPlus,
  Save,
  
  // Objects
  Home,
  User,
  Users,
  Building2,
  Package,
  ShoppingCart,
  FileText,
  Image,
  Camera,
  Bell,
  Mail,
  MessageSquare,
  MessageCircle,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Star,
  Heart,
  Bookmark,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  
  // Transport
  Car,
  Truck,
  Bike,
  Bus,
  
  // Status
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  HelpCircle,
  
  // Business
  CreditCard,
  Receipt,
  ReceiptText,
  Wallet,
  DollarSign,
  BarChart2,
  PieChart,
  TrendingUp,
  TrendingDown,
  
  // Layout
  LayoutGrid,
  List,
  Grid,
  Menu,
  
  // Security
  ShieldCheck,
  Shield,
  Key,
  
  // Social
  Link,
  ExternalLink,
  Globe,
  
  // Files
  File,
  Folder,
  
  // Misc
  LogOut,
  LogIn,
  QrCode,
  Scan,
  Sparkles,
  Zap,
  Activity,
  ArrowRightLeft,
  Undo,
  Redo,
  Video,
  Mic,
  Moon,
  BellOff,
  Archive,
  Fingerprint,
  Barcode,
  Tag,
  Clipboard,
  CheckSquare,
  
  // Categories
  UtensilsCrossed,
  Store,
  Hammer,
  Briefcase,
  Cpu,
};

export type { LucideIcon };

/**
 * Map of Ionicons names to Lucide icons
 * Used for gradual migration from Ionicons
 */
export const iconMap: Record<string, LucideIcon> = {
  // Navigation (Ionicons names)
  'chevron-back': ChevronLeft,
  'chevron-back-outline': ChevronLeft,
  'chevron-forward': ChevronRight,
  'chevron-forward-outline': ChevronRight,
  'chevron-down': ChevronDown,
  'chevron-down-outline': ChevronDown,
  'chevron-up': ChevronUp,
  'chevron-up-outline': ChevronUp,
  'arrow-back': ArrowLeft,
  'arrow-back-outline': ArrowLeft,
  'arrow-forward': ArrowRight,
  'arrow-forward-outline': ArrowRight,
  'close': X,
  'close-outline': X,
  'close-circle': XCircle,
  'close-circle-outline': XCircle,
  // Navigation (Lucide names)
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  'x': X,
  'x-circle': XCircle,
  
  // Actions
  'add': Plus,
  'add-outline': Plus,
  'add-circle': Plus,
  'add-circle-outline': Plus,
  'remove': Minus,
  'remove-outline': Minus,
  'checkmark': Check,
  'checkmark-outline': Check,
  'checkmark-circle': CheckCircle,
  'checkmark-circle-outline': CheckCircle,
  'create': Pencil,
  'create-outline': Pencil,
  'pencil': Pencil,
  'pencil-outline': Pencil,
  'trash': Trash2,
  'trash-outline': Trash2,
  'copy': Copy,
  'copy-outline': Copy,
  'share': Share,
  'share-outline': Share,
  'share-social': Share,
  'share-social-outline': Share,
  'download': Download,
  'download-outline': Download,
  'cloud-download': Download,
  'cloud-download-outline': Download,
  'cloud-upload': Upload,
  'cloud-upload-outline': Upload,
  'send': Send,
  'send-outline': Send,
  'search': Search,
  'search-outline': Search,
  'filter': Filter,
  'filter-outline': Filter,
  'options': Filter,
  'options-outline': Filter,
  'settings': Settings,
  'settings-outline': Settings,
  'ellipsis-horizontal': MoreHorizontal,
  'ellipsis-horizontal-outline': MoreHorizontal,
  'ellipsis-vertical': MoreVertical,
  'ellipsis-vertical-outline': MoreVertical,
  'refresh': RefreshCw,
  'refresh-outline': RefreshCw,
  'reload': RefreshCw,
  'reload-outline': RefreshCw,
  // Actions (Lucide names) — keys already mapped in the Ionicons section above are omitted (were duplicate keys / TS1117)
  'plus': Plus,
  'minus': Minus,
  'check': Check,
  'trash-2': Trash2,
  'upload': Upload,
  'more-horizontal': MoreHorizontal,
  'more-vertical': MoreVertical,
  'refresh-cw': RefreshCw,
  'user-plus': UserPlus,
  'save': Save,
  
  // Objects (Ionicons names)
  'home': Home,
  'home-outline': Home,
  'person': User,
  'person-outline': User,
  'people': Users,
  'people-outline': Users,
  'business': Building2,
  'business-outline': Building2,
  'cube': Package,
  'cube-outline': Package,
  'cart': ShoppingCart,
  'cart-outline': ShoppingCart,
  'document': FileText,
  'document-outline': FileText,
  'document-text': FileText,
  'document-text-outline': FileText,
  'image': Image,
  'image-outline': Image,
  'images': Image,
  'images-outline': Image,
  'camera': Camera,
  'camera-outline': Camera,
  'notifications': Bell,
  'notifications-outline': Bell,
  'mail': Mail,
  'mail-outline': Mail,
  'chatbubble': MessageSquare,
  'chatbubble-outline': MessageSquare,
  'chatbubbles': MessageSquare,
  'chatbubbles-outline': MessageSquare,
  'call': Phone,
  'call-outline': Phone,
  'location': MapPin,
  'location-outline': MapPin,
  'calendar': Calendar,
  'calendar-outline': Calendar,
  'time': Clock,
  'time-outline': Clock,
  'star': Star,
  'star-outline': Star,
  'heart': Heart,
  'heart-outline': Heart,
  'bookmark': Bookmark,
  'bookmark-outline': Bookmark,
  'lock-closed': Lock,
  'lock-closed-outline': Lock,
  'lock-open': Unlock,
  'lock-open-outline': Unlock,
  'eye': Eye,
  'eye-outline': Eye,
  'eye-off': EyeOff,
  'eye-off-outline': EyeOff,
  // Objects (Lucide names) — keys already mapped in the Ionicons section above are omitted (were duplicate keys / TS1117)
  'user': User,
  'users': Users,
  'building-2': Building2,
  'package': Package,
  'shopping-cart': ShoppingCart,
  'file-text': FileText,
  'bell': Bell,
  'message-square': MessageSquare,
  'message-circle': MessageCircle,
  'phone': Phone,
  'map-pin': MapPin,
  'clock': Clock,
  'lock': Lock,
  'unlock': Unlock,
  
  // Transport
  'car': Car,
  'car-outline': Car,
  'truck': Truck,
  'truck-outline': Truck,
  'bike': Bike,
  'bike-outline': Bike,
  'bicycle': Bike,
  'bicycle-outline': Bike,
  'bus': Bus,
  'bus-outline': Bus,
  'van': Bus,
  'van-outline': Bus,
  
  // Status
  'alert-circle': AlertCircle,
  'alert-circle-outline': AlertCircle,
  'warning': AlertTriangle,
  'warning-outline': AlertTriangle,
  'information-circle': Info,
  'information-circle-outline': Info,
  'help-circle': HelpCircle,
  'help-circle-outline': HelpCircle,
  
  // Business
  'card': CreditCard,
  'card-outline': CreditCard,
  'receipt': Receipt,
  'receipt-outline': Receipt,
  'receipt-text': ReceiptText,
  'receipt-text-outline': ReceiptText,
  'wallet': Wallet,
  'wallet-outline': Wallet,
  'cash': DollarSign,
  'cash-outline': DollarSign,
  'bar-chart': BarChart2,
  'bar-chart-outline': BarChart2,
  'pie-chart': PieChart,
  'pie-chart-outline': PieChart,
  'trending-up': TrendingUp,
  'trending-up-outline': TrendingUp,
  'trending-down': TrendingDown,
  'trending-down-outline': TrendingDown,
  
  // Layout
  'grid': LayoutGrid,
  'grid-outline': LayoutGrid,
  'list': List,
  'list-outline': List,
  'menu': Menu,
  'menu-outline': Menu,
  
  // Security
  'shield': Shield,
  'shield-outline': Shield,
  'shield-checkmark': ShieldCheck,
  'shield-checkmark-outline': ShieldCheck,
  'key': Key,
  'key-outline': Key,
  
  // Social
  'link': Link,
  'link-outline': Link,
  'open': ExternalLink,
  'open-outline': ExternalLink,
  'globe': Globe,
  'globe-outline': Globe,
  
  // Files
  'folder': Folder,
  'folder-outline': Folder,
  
  // Misc
  'log-out': LogOut,
  'log-out-outline': LogOut,
  'exit': LogOut,
  'exit-outline': LogOut,
  'log-in': LogIn,
  'log-in-outline': LogIn,
  'qr-code': QrCode,
  'qr-code-outline': QrCode,
  'scan': Scan,
  'scan-outline': Scan,
  'sparkles': Sparkles,
  'sparkles-outline': Sparkles,
  'flash': Zap,
  'flash-outline': Zap,
  'person-add': UserPlus,
  'person-add-outline': UserPlus,
  'swap-horizontal': ArrowRightLeft,
  'swap-horizontal-outline': ArrowRightLeft,
  'analytics': BarChart2,
  'analytics-outline': BarChart2,
  'arrow-redo': Redo,
  'arrow-redo-outline': Redo,
  'arrow-undo': Undo,
  'arrow-undo-outline': Undo,
  'videocam': Video,
  'videocam-outline': Video,
  'mic': Mic,
  'mic-outline': Mic,
  'moon': Moon,
  'moon-outline': Moon,
  'notifications-off': BellOff,
  'notifications-off-outline': BellOff,
  'archive': Archive,
  'archive-outline': Archive,
  'finger-print': Fingerprint,
  'finger-print-outline': Fingerprint,
  'barcode': Barcode,
  'barcode-outline': Barcode,
  'pricetag': Tag,
  'pricetag-outline': Tag,
  'clipboard': Clipboard,
  'clipboard-outline': Clipboard,
  'checkbox': CheckSquare,
  'checkbox-outline': CheckSquare,
  'checkmark-done': CheckCheck,
  'checkmark-done-outline': CheckCheck,
  'ban': XCircle,
  'ban-outline': XCircle,
  'paper-plane': Send,
  'paper-plane-outline': Send,
  
  // Category icons (for ExploreScreen)
  'apps': LayoutGrid,
  'apps-outline': LayoutGrid,
  'restaurant': UtensilsCrossed,
  'restaurant-outline': UtensilsCrossed,
  'storefront': Store,
  'storefront-outline': Store,
  'construct': Hammer,
  'construct-outline': Hammer,
  'briefcase': Briefcase,
  'briefcase-outline': Briefcase,
  'hardware-chip': Cpu,
  'hardware-chip-outline': Cpu,
};

/**
 * Get a Lucide icon by Ionicons name
 * Falls back to HelpCircle if not found
 */
export function getIcon(name: string): LucideIcon {
  return iconMap[name] || HelpCircle;
}

/**
 * Render a Lucide icon by Ionicons name (for gradual migration)
 */
interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

export function Icon({ name, size = 24, color = '#000', strokeWidth = 2.5, style }: IconProps) {
  const IconComponent = getIcon(name);
  return <IconComponent size={size} color={color} strokeWidth={strokeWidth} style={style} />;
}

export default Icon;

