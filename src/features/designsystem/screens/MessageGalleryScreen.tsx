/**
 * MessageGalleryScreen — Chat message showcase (Design System).
 *
 * Renders a single scrollable "conversation" containing one of EVERY message
 * bubble type the chat supports, in both incoming and outgoing variants, using
 * the real `MessageBubble` component so the look is 1:1 with production chat.
 *
 * Purpose: a visual catalogue to see how each message type renders (text, image,
 * voice, pdf, invoice, estimate, location, profile, order cards, system events,
 * deleted, contact) plus delivery-status icons and group-chat styling.
 *
 * Reached from the Business sidebar → Design System → Message Gallery.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { MessageBubble } from '@/features/inbox/components/MessageBubble';
import ImageViewerModal from '@/shared/components/ui/ImageViewerModal';
import type {
  Message,
  Sender,
  OrderEventPayload,
  OrderEventStatus,
} from '@/shared/types/inbox';

// ============================================================================
// Sample participants
// ============================================================================

const ME: Sender = { id: 'me', name: 'You', avatar: '', role: 'owner' };
const THEM: Sender = {
  id: 'them',
  name: 'Pasta Bella Distrib.',
  avatar: 'https://i.pravatar.cc/120?img=12',
  role: 'distributor',
};
// Extra senders for the group-chat sample
const ALICE: Sender = { id: 'u1', name: 'Alice Moreau', avatar: 'https://i.pravatar.cc/120?img=5', role: 'buyer' };
const SAM: Sender = { id: 'u2', name: 'Sam Devine', avatar: 'https://i.pravatar.cc/120?img=8', role: 'sales' };

// ============================================================================
// Builders
// ============================================================================

let seq = 0;
const nextId = () => `demo-${seq++}`;

/**
 * Build a message with sensible defaults; `over` fills in the type-specific
 * fields. Loosely typed (it spans the whole Message discriminated union of
 * sample data) and cast to Message on the way out.
 */
function mk(over: Record<string, unknown> & { type: Message['type']; isOutgoing?: boolean }): Message {
  const isOutgoing = over.isOutgoing ?? false;
  return {
    id: nextId(),
    chatId: 'demo-chat',
    isOutgoing,
    sender: isOutgoing ? ME : THEM,
    timestamp: '09:24',
    status: isOutgoing ? 'seen' : undefined,
    ...over,
  } as Message;
}

function orderPayload(over: Partial<OrderEventPayload> & { status: OrderEventStatus }): OrderEventPayload {
  return {
    orderId: 'ord_' + over.status.toLowerCase(),
    orderRef: 'NP-1042',
    buyer: { id: 'b', name: 'Rossi Trattoria', location: 'Port Louis' },
    seller: { id: 's', name: 'Pasta Bella Distrib.', location: 'Curepipe' },
    paymentStatus: 'UNPAID',
    itemsPreview: [
      { id: 'i1', name: 'Penne Rigate 500g', quantity: 24, unitPrice: 45, unit: 'box' },
      { id: 'i2', name: 'San Marzano Tomatoes 2.5kg', quantity: 12, unitPrice: 120, unit: 'can' },
      { id: 'i3', name: 'Extra Virgin Olive Oil 1L', quantity: 6, unitPrice: 320, unit: 'bottle' },
    ],
    totalItemsCount: 3,
    subtotal: 3300,
    vatAmount: 495,
    vatPercent: 15,
    deliveryFee: 150,
    totalAmount: 3945,
    currency: 'Rs',
    delivery: { type: 'delivery', expectedDate: '2026-06-25', address: 'Royal Rd, Port Louis' },
    createdAt: '2026-06-22T09:00:00Z',
    schemaVersion: '1.0',
    ...over,
  };
}

// ============================================================================
// Row model — messages interleaved with section labels & date separators
// ============================================================================

type Row =
  | { kind: 'section'; id: string; label: string }
  | { kind: 'date'; id: string; label: string }
  | {
      kind: 'msg';
      message: Message;
      isGrouped?: boolean;
      isFirstInGroup?: boolean;
      isLastInGroup?: boolean;
      showSenderName?: boolean;
      isGroupChat?: boolean;
    };

const section = (label: string): Row => ({ kind: 'section', id: nextId(), label });
const dateRow = (label: string): Row => ({ kind: 'date', id: nextId(), label });
const msg = (message: Message, opts: Omit<Extract<Row, { kind: 'msg' }>, 'kind' | 'message'> = {}): Row => ({
  kind: 'msg',
  message,
  ...opts,
});

const IMG = (seed: string) => `https://picsum.photos/seed/${seed}/600/400`;

const DOC_ITEMS = [
  { name: 'Penne Rigate 500g', quantity: 24, unitPrice: 45 },
  { name: 'San Marzano Tomatoes 2.5kg', quantity: 12, unitPrice: 120 },
  { name: 'Extra Virgin Olive Oil 1L', quantity: 6, unitPrice: 320 },
  { name: 'Parmigiano Reggiano 1kg', quantity: 4, unitPrice: 540 },
];
const docDetails = (number: string, status: string) => ({
  number,
  currency: 'Rs',
  status,
  itemCount: DOC_ITEMS.length,
  items: DOC_ITEMS,
  subtotal: 6600,
  total: 7740,
});

function buildRows(): Row[] {
  return [
    dateRow('Today'),

    // ---- Text ---- (first two are same-sender consecutive → grouped 4px gap)
    section('Text messages'),
    msg(mk({ type: 'text', text: 'Hi! Are the new pasta cases back in stock yet?', isOutgoing: false }), { isGrouped: true }),
    msg(mk({ type: 'text', text: 'We need a few boxes for the weekend rush 👀', isOutgoing: false })),
    msg(mk({ type: 'text', text: 'Yes — restocked this morning. Want me to reserve a few for you?', isOutgoing: true })),
    msg(
      mk({
        type: 'text',
        text: 'Please do. Also can you confirm pricing here: www.pastabella.mu/catalog',
        isOutgoing: false,
      })
    ),

    section('Reply + mention'),
    msg(
      mk({
        type: 'text',
        text: 'Reserved 24 boxes for you @Alice — they ship tomorrow.',
        isOutgoing: true,
        replyingTo: { senderName: 'You', messageSnippet: 'Please do. Also can you confirm pricing…', messageId: 'x' },
      })
    ),

    // ---- Image ----
    section('Image / photo'),
    msg(mk({ type: 'image', imageUrl: IMG('warehouse'), width: 600, height: 400, isOutgoing: false })),
    msg(mk({ type: 'image', imageUrl: IMG('pallet'), width: 600, height: 400, isOutgoing: true })),

    // ---- Voice ----
    section('Voice note'),
    msg(mk({ type: 'voice', durationSeconds: 14, isOutgoing: false })),
    msg(mk({ type: 'voice', durationSeconds: 8, isOutgoing: true })),

    // ---- PDF ----
    section('Document (PDF)'),
    msg(mk({ type: 'pdf', fileName: 'Delivery-Note-NP1042.pdf', fileSize: 248000, isOutgoing: false })),
    msg(mk({ type: 'pdf', fileName: 'Price-List-June.pdf', fileSize: 512000, isOutgoing: true })),

    // ---- Invoice ----
    section('Invoice'),
    msg(mk({ type: 'invoice', invoiceId: 'INV-2048', details: docDetails('INV-2048', 'UNPAID'), isOutgoing: true })),
    msg(mk({ type: 'invoice', invoiceId: 'INV-2049', details: docDetails('INV-2049', 'PAID'), isOutgoing: false })),

    // ---- Estimate ----
    section('Estimate (with action)'),
    msg(mk({ type: 'estimate', estimateId: 'EST-330', details: docDetails('EST-330', 'PENDING'), isOutgoing: false })),
    msg(mk({ type: 'estimate', estimateId: 'EST-331', details: docDetails('EST-331', 'PENDING'), isOutgoing: true })),

    // ---- Location ----
    section('Location'),
    msg(
      mk({
        type: 'location',
        locationName: 'Pasta Bella Warehouse',
        address: 'Royal Road, Curepipe, Mauritius',
        latitude: -20.314,
        longitude: 57.52,
        isOutgoing: false,
      })
    ),

    // ---- Profile ----
    section('Shared profile'),
    msg(
      mk({
        type: 'profile',
        profileId: 'biz_1',
        profileName: 'Rossi Trattoria',
        profileAvatar: 'https://i.pravatar.cc/120?img=15',
        profileType: 'business',
        isOutgoing: false,
      })
    ),
    msg(
      mk({
        type: 'profile',
        profileId: 'usr_1',
        profileName: 'Marco Rossi',
        profileAvatar: 'https://i.pravatar.cc/120?img=33',
        profileType: 'user',
        isOutgoing: true,
      })
    ),

    // ---- Order cards ----
    section('Order card — new (incoming, actionable)'),
    msg(mk({ type: 'order_event', isSystem: false, payload: orderPayload({ status: 'NEW' }), isOutgoing: false })),

    section('Order card — ongoing (outgoing)'),
    msg(
      mk({
        type: 'order_event',
        isSystem: false,
        payload: orderPayload({ status: 'ONGOING', paymentStatus: 'PENDING_CONFIRMATION' }),
        isOutgoing: true,
      })
    ),

    section('Order card — done & paid'),
    msg(
      mk({
        type: 'order_event',
        isSystem: false,
        payload: orderPayload({ status: 'DONE', paymentStatus: 'PAID' }),
        isOutgoing: false,
      })
    ),

    section('Order card — canceled'),
    msg(
      mk({
        type: 'order_event',
        isSystem: false,
        payload: orderPayload({ status: 'CANCELED' }),
        isOutgoing: true,
      })
    ),

    // ---- System / event ----
    section('System event'),
    msg(mk({ type: 'event', event: 'Order NP-1042 status changed: New → Confirmed' })),
    msg(mk({ type: 'event', event: 'Estimate confirmed and converted to invoice' })),

    // ---- Deleted ----
    section('Deleted message'),
    msg(mk({ type: 'deleted', isOutgoing: false })),
    msg(mk({ type: 'deleted', isOutgoing: true })),

    // ---- Contact (placeholder) ----
    section('Contact (placeholder in this version)'),
    msg(mk({ type: 'contact', contactName: 'Jean Dupont', contactPhone: '+230 5 123 4567', isOutgoing: false })),

    // ---- Delivery status icons ---- (consecutive same-sender → grouped 4px gap)
    dateRow('Delivery status (outgoing)'),
    section('sending · sent · delivered · seen · failed'),
    msg(mk({ type: 'text', text: 'Sending…', isOutgoing: true, status: 'sending' }), { isGrouped: true }),
    msg(mk({ type: 'text', text: 'Sent (single check)', isOutgoing: true, status: 'sent' }), { isGrouped: true }),
    msg(mk({ type: 'text', text: 'Delivered (double check)', isOutgoing: true, status: 'delivered' }), { isGrouped: true }),
    msg(mk({ type: 'text', text: 'Seen (accent double check)', isOutgoing: true, status: 'seen' }), { isGrouped: true }),
    msg(mk({ type: 'text', text: 'Failed to send', isOutgoing: true, status: 'failed' })),

    // ---- Group chat styling ----
    dateRow('Group chat styling'),
    section('Sender names + avatars + grouping'),
    msg(mk({ type: 'text', text: 'Morning team — order NP-1042 is in.', sender: ALICE, isOutgoing: false }), {
      isGroupChat: true,
      showSenderName: true,
      isFirstInGroup: true,
      isLastInGroup: true,
    }),
    msg(mk({ type: 'text', text: "I'll prep the picking list now.", sender: SAM, isOutgoing: false }), {
      isGroupChat: true,
      showSenderName: true,
      isFirstInGroup: true,
      isGrouped: true, // same sender (Sam) below → 4px gap
    }),
    msg(mk({ type: 'text', text: 'Should be ready before noon.', sender: SAM, isOutgoing: false }), {
      isGroupChat: true,
      isLastInGroup: true, // different sender below → default 12px gap
    }),
    msg(mk({ type: 'text', text: 'Perfect, thanks both 🙌', isOutgoing: true }), { isGroupChat: true }),
  ];
}

// ============================================================================
// Screen
// ============================================================================

export default function MessageGalleryScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const rows = useMemo(() => buildRows(), []);

  // Full-screen image viewer (reuses the same component as the real chat).
  const [imageViewer, setImageViewer] = useState<
    { url: string; sender: string; timestamp: string; messageId: string } | null
  >(null);

  // Demo handlers — taps just confirm the interaction fired.
  const notify = (m: string) => AppAlert.alert('Demo', m);
  const handlers = {
    onOrderPress: (id: string) => notify(`Open order ${id}`),
    onConfirmOrder: (id: string) => notify(`Confirm order ${id}`),
    onDeclineOrder: (id: string) => notify(`Decline order ${id}`),
    onInvoicePress: (id: string) => notify(`Open invoice ${id}`),
    onEstimatePress: (id: string) => notify(`Open estimate ${id}`),
    onEstimateConfirm: (id: string) => notify(`Confirm estimate ${id}`),
    onOpenDocument: (name: string) => notify(`Open ${name}`),
    onProfilePress: (id: string, type: 'user' | 'business') => notify(`Open ${type} ${id}`),
    onImagePress: (url: string, sender: string, timestamp: string, messageId: string) =>
      setImageViewer({ url, sender, timestamp, messageId }),
    onLongPress: (id: string) => notify(`Long-press actions for ${id}`),
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Message Gallery"
        leftAction={{
          icon: 'menu',
          onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()),
          accessibilityLabel: 'Open menu',
        }}
      />

      <ScrollView
        style={{ backgroundColor: theme.colors.surface }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((row) => {
          if (row.kind === 'date') {
            return (
              <View key={row.id} style={styles.dateSeparatorContainer}>
                <View style={[styles.dateSeparatorBubble, { backgroundColor: theme.colors.borderColor }]}>
                  <Text style={[styles.dateSeparatorText, { color: theme.colors.textMuted }]}>{row.label}</Text>
                </View>
              </View>
            );
          }
          if (row.kind === 'section') {
            return (
              <View key={row.id} style={styles.sectionContainer}>
                <View style={[styles.sectionChip, { backgroundColor: theme.colors.background, borderColor: theme.colors.borderColor }]}>
                  <Text style={[styles.sectionText, { color: theme.colors.accent }]}>{row.label.toUpperCase()}</Text>
                </View>
              </View>
            );
          }
          return (
            <MessageBubble
              key={row.message.id}
              message={row.message}
              isGrouped={row.isGrouped}
              isFirstInGroup={row.isFirstInGroup}
              isLastInGroup={row.isLastInGroup}
              showSenderName={row.showSenderName}
              isGroupChat={row.isGroupChat}
              {...handlers}
            />
          );
        })}
        <View style={{ height: 32 }} />
      </ScrollView>

      <ImageViewerModal
        isVisible={!!imageViewer}
        imageUrl={imageViewer?.url || null}
        senderName={imageViewer?.sender || null}
        timestamp={imageViewer?.timestamp || null}
        messageId={imageViewer?.messageId || null}
        onClose={() => setImageViewer(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 12, paddingBottom: 24 },
  dateSeparatorContainer: { alignItems: 'center', marginVertical: 16 },
  dateSeparatorBubble: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  dateSeparatorText: { fontSize: 12, fontWeight: '600' },
  sectionContainer: { alignItems: 'center', marginTop: 18, marginBottom: 8 },
  sectionChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  sectionText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
});
