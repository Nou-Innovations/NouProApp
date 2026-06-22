import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  StyleSheet,
  Linking,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/shared/types/navigation';
import { format, parseISO } from 'date-fns';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppBottomSheet, { AppBottomSheetItem } from '@/shared/components/ui/AppBottomSheet';
import { useFocusEffect } from '@react-navigation/native';
import { useNotifications } from '@/shared/context/NotificationContext';
import { AppModal, SectionTitle } from '@/shared/components/ui';
import AppButton from '@/shared/components/ui/AppButton';
import invoicesService, { Invoice, convertEstimateToInvoice, deleteInvoice } from '../invoices.service';
import { formatInvoiceCurrency, InvoiceStatus } from '@/shared/types/invoice';
import { useProfileStore } from '@/shared/store/profileStore';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { generateInvoicePdf, InvoicePdfData } from '../invoicePdf';
import PaywallModal from '@/shared/components/ui/PaywallModal';
import { checkPaywall, PaywallCheck, shouldShowNouProBranding } from '@/shared/utils/permissions';
import { createInvoiceCheckout } from '@/features/payments/payments.service';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'InvoiceDetails'>;

// Build activity log from invoice data (replaces mock data)
function buildActivityLog(inv: Invoice | null): { id: string; description: string; timestamp: string }[] {
  if (!inv) return [];

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const log: { id: string; description: string; timestamp: string }[] = [];

  // Created
  if (inv.createdAt) {
    const docType = inv.type === 'estimate' ? 'Estimate' : 'Invoice';
    log.push({ id: 'act-created', description: `${docType} created`, timestamp: formatDate(inv.createdAt) });
  }

  // Sent
  const sentStatuses = ['sent', 'partially_paid', 'paid', 'overdue'];
  if (sentStatuses.includes(inv.status)) {
    log.push({ id: 'act-sent', description: 'Sent to client', timestamp: formatDate(inv.updatedAt || inv.createdAt) });
  }

  // Partially paid
  if (inv.status === 'partially_paid') {
    log.push({ id: 'act-partial', description: 'Partial payment recorded', timestamp: formatDate(inv.updatedAt) });
  }

  // Paid
  if (inv.status === 'paid') {
    log.push({ id: 'act-paid', description: 'Payment recorded — fully paid', timestamp: formatDate(inv.updatedAt) });
  }

  // Canceled / Void / Refunded
  if (inv.status === 'canceled' || inv.status === 'cancelled') {
    log.push({ id: 'act-canceled', description: 'Invoice canceled', timestamp: formatDate(inv.updatedAt) });
  }
  if (inv.status === 'void') {
    log.push({ id: 'act-void', description: 'Invoice voided', timestamp: formatDate(inv.updatedAt) });
  }
  if (inv.status === 'refunded') {
    log.push({ id: 'act-refund', description: 'Refund issued', timestamp: formatDate(inv.updatedAt) });
  }

  return log;
}

// Normalize API response (backend returns UPPERCASE enums)
function normalizeInvoice(inv: Invoice): Invoice {
  return {
    ...inv,
    status: ((inv.status || 'draft') as string).toLowerCase() as InvoiceStatus,
    type: ((inv.type || 'invoice') as string).toLowerCase() as 'invoice' | 'estimate',
  };
}

export default function InvoiceDetailsScreen({ route, navigation }: Props) {
  const { invoiceId } = route.params;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [generatedPdfUri, setGeneratedPdfUri] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  
  // Pay Now state
  const [isPayingNow, setIsPayingNow] = useState(false);

  // Paywall state
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallCheckResult, setPaywallCheckResult] = useState<PaywallCheck | null>(null);
  
  const { theme } = useTheme();
  const { markItemAsViewed } = useNotifications();
  
  // Get business ID from profile store
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const businessId = activeBusiness?.id;

  // Fetch invoice from API
  const fetchInvoice = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      setError('No business selected');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await invoicesService.getInvoice(businessId, invoiceId);
      setInvoice(normalizeInvoice(data));
    } catch {
      setError('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [businessId, invoiceId]);

  // Fetch on mount
  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);
  const isAdmin = useProfileStore((state) => state.isAdmin);
  
  // Derived values from invoice data
  const clientName = invoice?.clientName || 'Unknown Client';
  const documentNumber = invoice?.invoiceNumber || invoice?.id || 'N/A';
  const status = invoice?.status || 'sent';
  const issueDate = invoice?.issueDate || new Date().toISOString();
  const dueDate = invoice?.dueDate || new Date().toISOString();
  const purchaseOrder = invoice?.referenceNumber || '';
  const isEstimate = invoice?.type === 'estimate';
  
  // Line items with safe property access
  const lineItems = invoice?.items?.map(item => ({
    id: item.productId,
    description: item.description,
    quantity: item.quantity || 0,
    unitPrice: item.unitPrice || 0,
    total: item.totalPrice || 0,
  })) || [];

  // Totals with safe defaults
  const subtotal = Number(invoice?.amount) || 0;
  const globalDiscount = Number(invoice?.discount) || 0;
  const totalTax = Number(invoice?.taxAmount) || 0;
  const shippingCost = Number(invoice?.shipping) || 0;
  const grandTotal = Number(invoice?.totalAmount) || 0;

  // Notes & Terms
  const notes = invoice?.notes || '';
  const terms = invoice?.terms || '';

  // Activity log (generated from invoice data)
  const activityLog = buildActivityLog(invoice);

  const formatDate = (dateString: string) => {
    try {
      const date = dateString.includes('T') ? parseISO(dateString) : new Date(dateString);
      return format(date, 'dd MMM yyyy');
    } catch (e) {
      return dateString;
    }
  };

  const invoiceCurrency = invoice?.currency;
  const fmtCurrency = (amount: number | undefined) => {
    return formatInvoiceCurrency(amount || 0, invoiceCurrency);
  };

  const callClient = () => {
    const phone = invoice?.clientPhone;
    if (!phone) {
      Alert.alert('No Phone Number', 'No phone number available for this client.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const emailClient = () => {
    const email = invoice?.clientEmail;
    if (!email) {
      Alert.alert('No Email', 'No email address available for this client.');
      return;
    }
    Linking.openURL(`mailto:${email}`);
  };

  const recordPayment = () => {
    setRecordingPayment(true);
  };

  // Pay invoice via Peach Payments (for invoice recipients)
  const handlePayNow = async () => {
    if (!businessId || !invoice) return;

    setIsPayingNow(true);
    try {
      const { checkoutId, checkoutUrl } = await createInvoiceCheckout({
        businessId,
        invoiceId: invoice.id,
      });

      (navigation as NativeStackNavigationProp<RootStackParamList>).navigate('CheckoutScreen', {
        checkoutUrl,
        paymentType: 'INVOICE_PAYMENT',
        checkoutId,
      });
    } catch (err) {
      console.error('Failed to create invoice checkout:', err);
      Alert.alert('Error', 'Failed to start payment. Please try again.');
    } finally {
      setIsPayingNow(false);
    }
  };

  const sendDocument = async () => {
    // Check paywall for sending invoice (Pro+ only)
    const sendCheck = checkPaywall('send_invoice', activeBusiness?.plan || null);
    if (!sendCheck.allowed) {
      setPaywallCheckResult(sendCheck);
      setShowPaywall(true);
      return;
    }

    try {
      const updated = await invoicesService.updateInvoiceStatus(invoiceId, 'SENT');
      // Refresh local state with updated invoice
      setInvoice(normalizeInvoice(updated));
      setSuccessMessage(`${isEstimate ? 'Estimate' : 'Invoice'} sent successfully!`);
      setShowSuccessDialog(true);
    } catch (err) {
      console.error('Failed to send document:', err);
      Alert.alert('Error', `Failed to send the ${isEstimate ? 'estimate' : 'invoice'}. Please try again.`);
    }
  };

  const downloadPDF = async () => {
    if (!businessId) {
      Alert.alert('Error', 'No active business selected');
      return;
    }

    // Check paywall for exporting invoice PDF (Pro+ only)
    const exportCheck = checkPaywall('export_invoice_pdf', activeBusiness?.plan || null);
    if (!exportCheck.allowed) {
      setPaywallCheckResult(exportCheck);
      setShowPaywall(true);
      return;
    }

    // For Pro users who can export but still show branding, offer upgrade to remove it
    const hasBranding = shouldShowNouProBranding(activeBusiness?.plan || null);
    if (hasBranding) {
      // Show confirmation that PDF will include branding, with option to upgrade
      Alert.alert(
        'Download PDF',
        'This PDF will include NouPro branding. Upgrade to Pro to remove branding from your documents.',
        [
          {
            text: 'Upgrade',
            onPress: () => {
              const check = checkPaywall('remove_branding', activeBusiness?.plan || null);
              setPaywallCheckResult(check);
              setShowPaywall(true);
            },
          },
          {
            text: 'Download Anyway',
            onPress: () => proceedWithDownload(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
      return;
    }

    proceedWithDownload();
  };

  const proceedWithDownload = async () => {
    if (!invoice) return;

    setShowDownloadModal(true);
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadComplete(false);
    setGeneratedPdfUri(null);

    try {
      const pdfData: InvoicePdfData = {
        documentTitle: isEstimate ? 'Estimate' : 'Invoice',
        documentNumber,
        status,
        issueDate: formatDate(issueDate),
        dueDate: formatDate(dueDate),
        businessName: activeBusiness?.name,
        businessAddress: (activeBusiness as any)?.address,
        businessPhone: (activeBusiness as any)?.phone,
        businessEmail: (activeBusiness as any)?.email,
        clientName,
        clientAddress: (invoice as any)?.clientAddress,
        clientPhone: invoice?.clientPhone,
        clientEmail: invoice?.clientEmail,
        items: lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: fmtCurrency(li.unitPrice),
          total: fmtCurrency(li.total),
        })),
        subtotal: fmtCurrency(subtotal),
        discount: globalDiscount ? fmtCurrency(globalDiscount) : undefined,
        tax: totalTax ? fmtCurrency(totalTax) : undefined,
        shipping: shippingCost ? fmtCurrency(shippingCost) : undefined,
        grandTotal: fmtCurrency(grandTotal),
        notes,
        terms,
        showBranding: shouldShowNouProBranding(activeBusiness?.plan || null),
      };

      // Generate the PDF on-device, then copy it to a friendly filename.
      const tempUri = await generateInvoicePdf(pdfData);
      const fileName = `${documentNumber}.pdf`.replace(/[^\w.\-]/g, '_');
      const destUri = `${FileSystem.documentDirectory ?? ''}${fileName}`;
      let finalUri = tempUri;
      try {
        await FileSystem.copyAsync({ from: tempUri, to: destUri });
        finalUri = destUri;
      } catch {
        // Fall back to the cache URI if copy fails.
      }

      setGeneratedPdfUri(finalUri);
      setDownloadProgress(100);
      setIsDownloading(false);
      setDownloadComplete(true);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setIsDownloading(false);
      setShowDownloadModal(false);
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    }
  };

  const handleShareGeneratedPdf = async () => {
    if (!generatedPdfUri) return;
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(generatedPdfUri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: `${isEstimate ? 'Estimate' : 'Invoice'} ${documentNumber}`,
        });
      } else {
        Alert.alert('Saved', `PDF saved to your device as ${documentNumber}.pdf`);
      }
    } catch (err) {
      console.error('Error sharing PDF:', err);
      Alert.alert('Error', 'Failed to share the PDF. Please try again.');
    }
  };

  const handleDownloadComplete = () => {
    setShowDownloadModal(false);
    setDownloadProgress(0);
    setDownloadComplete(false);
    setSuccessMessage(`${isEstimate ? 'Estimate' : 'Invoice'} PDF ready!`);
    setShowSuccessDialog(true);
  };

  const shareDocument = async () => {
    try {
      const documentType = isEstimate ? 'Estimate' : 'Invoice';
      const result = await Share.share({
        title: `${documentType} ${documentNumber}`,
        message: `${documentType} ${documentNumber}\n\nClient: ${clientName}\nTotal: ${fmtCurrency(grandTotal)}\nDue Date: ${formatDate(dueDate)}\n\nView details in NouPro app.`,
        // url: invoice?.pdfUrl, // Uncomment when PDF URL is available
      });
      
      // Share completed
    } catch (error) {
      Alert.alert('Error', 'Failed to share document. Please try again.');
    }
  };

  const goBack = () => {
    navigation.goBack();
  };

  const navigateToClientProfile = () => {
    // Navigate to client profile - will implement based on available navigation
    Alert.alert('Client Profile', 'Navigate to client profile functionality would be implemented here');
  };

  // Check if current user is the invoice creator (can modify payment status)
  const isInvoiceOwner = invoice?.businessId === businessId;

  const handlePaymentButtonPress = () => {
    if (!isInvoiceOwner) {
      Alert.alert('Permission Denied', 'Only the business that created this invoice can change the payment status.');
      return;
    }
    // Only show options if invoice is unpaid
    if (paymentStatus === 'unpaid') {
      setShowPaymentOptions(true);
    }
  };

  const handleMarkFullyPaid = async () => {
    try {
      const updated = await invoicesService.updateInvoice(invoiceId, {
        paidAmount: grandTotal,
        status: 'PAID',
      });
      setInvoice(normalizeInvoice(updated));
      setPaymentStatus('paid');
      setShowPaymentOptions(false);
      setSuccessMessage('Invoice marked as fully paid!');
      setShowSuccessDialog(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to mark as paid. Please try again.');
    }
  };

  const handleAddPartialPayment = () => {
    setShowPaymentOptions(false);
    // Navigate to ReceivedPayments screen
    (navigation as any).navigate('ReceivedPayments', { 
      invoiceId,
      totalAmount: grandTotal,
      paidAmount: invoice?.paidAmount ?? 0,
      currency: invoice?.currency,
    });
  };

  const handleConvertToInvoice = () => {
    if (!isInvoiceOwner) {
      Alert.alert('Permission Denied', 'Only the business that created this estimate can convert it to an invoice.');
      return;
    }
    Alert.alert(
      'Convert to Invoice',
      'Are you sure you want to convert this estimate to an invoice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert',
          onPress: async () => {
            if (!businessId) {
              Alert.alert('Error', 'No active business selected');
              return;
            }
            try {
              const updatedInvoice = await convertEstimateToInvoice(invoiceId);
              setInvoice(normalizeInvoice(updatedInvoice));
              setSuccessMessage('Estimate converted to invoice successfully!');
              setShowSuccessDialog(true);
            } catch (error) {
              console.error('Error converting estimate:', error);
              Alert.alert('Error', 'Failed to convert estimate. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Initialize payment status from invoice data
  useEffect(() => {
    if (invoice?.status) {
      setPaymentStatus(invoice.status === 'paid' ? 'paid' : 'unpaid');
    }
  }, [invoice?.status]);

  // Mark this invoice as viewed when screen loads
  useFocusEffect(
    React.useCallback(() => {
      markItemAsViewed(invoiceId);
      // setInvoicesUnreadCount(Math.max(0, invoicesUnreadCount - 1));
    }, [invoiceId, markItemAsViewed])
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Invoice" leftAction={{ icon: 'chevron-left', onPress: goBack }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Invoice" leftAction={{ icon: 'chevron-left', onPress: goBack }} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          <AppButton title="Retry" onPress={fetchInvoice} size="small" />
        </View>
      </SafeAreaView>
    );
  }

  if (!invoice) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Invoice" leftAction={{ icon: 'chevron-left', onPress: goBack }} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>Invoice not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // More options menu items - dynamically built based on document type and ownership
  const moreOptionsItems: AppBottomSheetItem[] = [
    // Send option - only for owner and for estimates or draft invoices
    ...(isInvoiceOwner && (isEstimate || status === 'draft') ? [{
      id: 'send',
      title: isEstimate ? 'Send Estimate' : 'Send Invoice',
    }] : []),
    // Download PDF - always available
    { id: 'download', title: 'Download PDF' },
    { id: 'share', title: 'Share' },
    // Delete - only for owner and only for draft/canceled statuses
    ...(isInvoiceOwner && (!status || status === 'draft' || status === 'canceled' || status === 'cancelled') ? [{
      id: 'delete',
      title: 'Delete',
      variant: 'destructive' as const,
    }] : []),
  ];

  const handleMoreOptionSelect = (item: { id: string }) => {
    if (item.id === 'send') {
      sendDocument();
    } else if (item.id === 'download') {
      downloadPDF();
    } else if (item.id === 'share') {
      shareDocument();
    } else if (item.id === 'delete') {
      // Handle delete action with confirmation
      Alert.alert(
        `Delete ${isEstimate ? 'Estimate' : 'Invoice'}`,
        `Are you sure you want to delete ${isEstimate ? 'estimate' : 'invoice'} ${documentNumber}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteInvoice(invoiceId);
                Alert.alert('Deleted', `${isEstimate ? 'Estimate' : 'Invoice'} has been deleted`);
                navigation.goBack();
              } catch (err) {
                console.error('Failed to delete invoice:', err);
                Alert.alert('Error', 'Failed to delete the document. Please try again.');
              }
            },
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* 1. Sticky Header */}
      <SecondaryHeader
        title={documentNumber}
        leftAction={{ icon: 'chevron-left', onPress: goBack }}
        rightActions={[{ icon: 'ellipsis-vertical', onPress: () => setShowMoreOptions(true) }]}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Client & Metadata Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
          <View style={styles.clientHeader}>
            <TouchableOpacity onPress={navigateToClientProfile} style={styles.clientInfo}>
              <Text style={[styles.clientName, { color: theme.colors.primary }]}>
                {clientName}
              </Text>
            </TouchableOpacity>
            <View style={styles.clientActions}>
              <TouchableOpacity onPress={callClient} style={styles.actionIcon}>
                <Icon name="call-outline" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={emailClient} style={styles.actionIcon}>
                <Icon name="mail-outline" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: theme.colors.secondary }]}>
                Issue Date
              </Text>
              <Text style={[styles.metaValue, { color: theme.colors.primary }]}>
                {formatDate(issueDate)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: theme.colors.secondary }]}>
                {isEstimate ? 'Expiry Date' : 'Due Date'}
              </Text>
              <Text style={[styles.metaValue, { color: theme.colors.primary }]}>
                {formatDate(dueDate)}
              </Text>
            </View>
            {purchaseOrder && (
              <View style={styles.metaItemFull}>
                <Text style={[styles.metaLabel, { color: theme.colors.secondary }]}>
                  Purchase Order Number
                </Text>
                <Text style={[styles.metaValue, { color: theme.colors.primary }]}>
                  {purchaseOrder}
                </Text>
              </View>
            )}
          </View>
          
          {/* Payment Status Button - Only for invoices, not estimates */}
          {!isEstimate && (
            <AppButton
              title={paymentStatus === 'paid' ? 'PAID' : 'UNPAID'}
              onPress={handlePaymentButtonPress}
              variant={paymentStatus === 'paid' ? 'confirm' : 'alert'}
              fullWidth
              style={[styles.paymentToggleButton, !isInvoiceOwner && { opacity: 0.7 }]}
            />
          )}
        </View>

        {/* 3. Line Items Table */}
        <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
          {lineItems.map((item, idx) => (
            <View key={idx} style={styles.lineItem}>
              <View style={styles.lineItemContent}>
                <Text style={[styles.lineItemDescription, { color: theme.colors.primary }]}>
                  {item.description}
                </Text>
                <Text style={[styles.lineItemDetails, { color: theme.colors.secondary }]}>
                  {item.quantity} × {fmtCurrency(item.unitPrice)}
                </Text>
              </View>
              <Text style={[styles.lineItemTotal, { color: theme.colors.primary }]}>
                {fmtCurrency(item.total)}
              </Text>
            </View>
          ))}
        </View>

        {/* 4. Totals Summary Block */}
        <View style={[styles.section, styles.totalsSection, { backgroundColor: theme.colors.cardBackground }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: theme.colors.secondary }]}>
              Subtotal
            </Text>
            <Text style={[styles.totalValue, { color: theme.colors.primary }]}>
              {fmtCurrency(subtotal)}
            </Text>
          </View>
          {globalDiscount > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.colors.secondary }]}>
                Discount
              </Text>
              <Text style={[styles.totalValue, { color: theme.colors.primary }]}>
                – {fmtCurrency(globalDiscount)}
              </Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: theme.colors.secondary }]}>
              Tax
            </Text>
            <Text style={[styles.totalValue, { color: theme.colors.primary }]}>
              {fmtCurrency(totalTax)}
            </Text>
          </View>
          {shippingCost > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.colors.secondary }]}>
                Shipping
              </Text>
              <Text style={[styles.totalValue, { color: theme.colors.primary }]}>
                {fmtCurrency(shippingCost)}
              </Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={[styles.grandTotalLabel, { color: theme.colors.primary }]}>
              Grand Total
            </Text>
            <Text style={[styles.grandTotalValue, { color: theme.colors.primary }]}>
              {fmtCurrency(grandTotal)}
            </Text>
          </View>
        </View>

        {/* 5. Notes & Terms */}
        {(notes || terms) && (
          <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
            {notes && (
              <View style={styles.notesSection}>
                <SectionTitle style={{ marginBottom: 8 }}>
                  Notes
                </SectionTitle>
                <Text style={[styles.sectionContent, { color: theme.colors.secondary }]}>
                  {notes}
                </Text>
              </View>
            )}
            {terms && (
              <View style={styles.termsSection}>
                <SectionTitle style={{ marginBottom: 8 }}>
                  Terms & Conditions
                </SectionTitle>
                <Text style={[styles.sectionContent, { color: theme.colors.secondary }]}>
                  {terms}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 6. Activity Log */}
        {activityLog.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
            <SectionTitle style={{ marginBottom: 8 }}>
              Activity
            </SectionTitle>
            {activityLog.map((entry, i) => (
              <View key={i} style={styles.activityEntry}>
                <Text style={[styles.activityTimestamp, { color: theme.colors.secondary }]}>
                  {entry.timestamp}
                </Text>
                <Text style={[styles.activityDescription, { color: theme.colors.primary }]}>
                  {entry.description}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* 7. Sticky Bottom Action Bar */}
      <View style={[styles.actionBar, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.borderColor }]}>
        {isEstimate ? (
          // Estimate: Only show "Convert to Invoice" for owner
          isInvoiceOwner && (
            <AppButton
              title="Convert to Invoice"
              onPress={handleConvertToInvoice}
              variant="primary"
              style={styles.flexButton}
            />
          )
        ) : (
          // Invoice: Show Record Payment, Pay Now, and Download PDF
          <>
            {isAdmin && isInvoiceOwner && status !== 'paid' && (
              <AppButton
                title="Record Payment"
                onPress={recordPayment}
                variant="confirm"
                style={styles.flexButton}
              />
            )}
            {!isInvoiceOwner && (status === 'sent' || status === 'partially_paid' || status === 'overdue') && (
              <AppButton
                title={`Pay Now ${fmtCurrency(grandTotal - (Number(invoice?.paidAmount) || 0))}`}
                onPress={handlePayNow}
                variant="primary"
                loading={isPayingNow}
                disabled={isPayingNow}
                style={styles.flexButton}
              />
            )}
            {isAdmin && isInvoiceOwner && status === 'draft' && (
              <AppButton
                title="Edit Draft"
                onPress={() => (navigation as any).navigate('CreateInvoice', { invoiceId, type: invoice?.type || 'invoice' })}
                variant="secondary"
                style={styles.flexButton}
              />
            )}
            {isAdmin && isInvoiceOwner && status === 'draft' && (
              <AppButton
                title="Send Invoice"
                onPress={sendDocument}
                variant="alert"
                style={styles.flexButton}
              />
            )}
            <AppButton
              title="Download PDF"
              onPress={downloadPDF}
              variant="secondary"
              style={styles.flexButton}
            />
          </>
        )}
      </View>

      {/* Payment Recording Modal */}
      {recordingPayment && (
        <Modal
          visible={recordingPayment}
          transparent
          animationType="slide"
          onRequestClose={() => setRecordingPayment(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Record Payment
                </Text>
                <TouchableOpacity onPress={() => setRecordingPayment(false)}>
                  <Icon name="close" size={24} color={theme.colors.textLight} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textLight }]}>
                    Amount Paid
                  </Text>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: theme.colors.surface, 
                      color: theme.colors.text,
                      borderColor: theme.colors.borderColor 
                    }]}
                    keyboardType="numeric"
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    placeholder={fmtCurrency(grandTotal)}
                    placeholderTextColor={theme.colors.textLight}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textLight }]}>
                    Payment Method
                  </Text>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: theme.colors.surface, 
                      color: theme.colors.text,
                      borderColor: theme.colors.borderColor 
                    }]}
                    value={paymentMethod}
                    onChangeText={setPaymentMethod}
                    placeholder="Bank Transfer"
                    placeholderTextColor={theme.colors.textLight}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textLight }]}>
                    Reference
                  </Text>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: theme.colors.surface, 
                      color: theme.colors.text,
                      borderColor: theme.colors.borderColor 
                    }]}
                    value={paymentReference}
                    onChangeText={setPaymentReference}
                    placeholder="Payment reference"
                    placeholderTextColor={theme.colors.textLight}
                  />
                </View>
                
                <AppButton
                  title="Record Payment"
                  variant="confirm"
                  fullWidth
                  style={{ marginTop: 20 }}
                  onPress={async () => {
                    try {
                      const amount = parseFloat(paymentAmount);
                      if (isNaN(amount) || amount <= 0) {
                        Alert.alert('Error', 'Please enter a valid payment amount.');
                        return;
                      }
                      const newPaidAmount = (invoice?.paidAmount || 0) + amount;
                      if (newPaidAmount > grandTotal) {
                        Alert.alert('Error', `Payment of ${fmtCurrency(amount)} would exceed the remaining balance of ${fmtCurrency(grandTotal - (invoice?.paidAmount || 0))}.`);
                        return;
                      }
                      const isFullyPaid = newPaidAmount >= grandTotal;
                      const newStatus = isFullyPaid ? 'PAID' : 'PARTIALLY_PAID';
                      const updated = await invoicesService.updateInvoice(invoiceId, {
                        paidAmount: newPaidAmount,
                        status: newStatus,
                      });
                      setInvoice(normalizeInvoice(updated));
                      setRecordingPayment(false);
                      setPaymentAmount('');
                      setSuccessMessage('Payment recorded successfully!');
                      setShowSuccessDialog(true);
                    } catch (err) {
                      Alert.alert('Error', 'Failed to record payment. Please try again.');
                    }
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Success Dialog */}
      <AppModal
        visible={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        variant="success"
        title="Success"
        message={successMessage}
        primaryButtonText="OK"
        onPrimaryAction={() => setShowSuccessDialog(false)}
      />

      {/* Download PDF Modal */}
      <Modal
        visible={showDownloadModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isDownloading && setShowDownloadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.downloadModalContent, { backgroundColor: theme.colors.cardBackground }]}>
            {!downloadComplete ? (
              <>
                <View style={[styles.downloadIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Icon name="document-text-outline" size={32} color={theme.colors.primary} />
                </View>
                <Text style={[styles.downloadTitle, { color: theme.colors.text }]}>
                  Generating PDF
                </Text>
                <Text style={[styles.downloadSubtitle, { color: theme.colors.textSecondary }]}>
                  {isEstimate ? 'Estimate' : 'Invoice'} {documentNumber}
                </Text>

                <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 16 }} />
              </>
            ) : (
              <>
                <View style={[styles.downloadIconContainer, { backgroundColor: theme.colors.success + '20' }]}>
                  <Icon name="checkmark-circle" size={32} color={theme.colors.success} />
                </View>
                <Text style={[styles.downloadTitle, { color: theme.colors.text }]}>
                  PDF Ready
                </Text>
                <Text style={[styles.downloadSubtitle, { color: theme.colors.textSecondary }]}>
                  {isEstimate ? 'Estimate' : 'Invoice'} {documentNumber}.pdf
                </Text>

                <AppButton
                  title="Share / Save"
                  onPress={handleShareGeneratedPdf}
                  variant="primary"
                  size="default"
                  style={{ width: '100%' }}
                />
                <View style={{ height: 10 }} />
                <AppButton
                  title="Done"
                  onPress={handleDownloadComplete}
                  variant="outline"
                  size="default"
                  style={{ width: '100%' }}
                />
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* More Options Bottom Sheet */}
      <AppBottomSheet
        visible={showMoreOptions}
        onClose={() => setShowMoreOptions(false)}
        title="Options"
        items={moreOptionsItems}
        mode="buttons"
        onSelectItem={handleMoreOptionSelect}
      />

      {/* Payment Options Bottom Sheet */}
      <AppBottomSheet
        visible={showPaymentOptions}
        onClose={() => setShowPaymentOptions(false)}
        title="Payment Options"
        items={[
          { id: 'partial', title: 'Add Partial Payment' },
          { id: 'full', title: 'Mark as Fully Paid' },
        ]}
        mode="buttons"
        onSelectItem={(item) => {
          if (item.id === 'partial') handleAddPartialPayment();
          else if (item.id === 'full') handleMarkFullyPaid();
        }}
      />

      {/* Paywall Modal for Remove Branding */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => {
          setShowPaywall(false);
          navigation.navigate('SubscriptionPlans' as never);
        }}
        requiredPlan={paywallCheckResult?.requiredPlan || 'pro'}
        modalType={paywallCheckResult?.modalType}
        title={paywallCheckResult?.title}
        description={paywallCheckResult?.description}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE6DF',
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  documentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  documentBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  documentNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Space for sticky action bar
  },
  
  // Section Styles
  section: {
    marginTop: 16,
    padding: 16,
    marginHorizontal: 0,
  },
  
      // Client & Meta Section
    clientHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    clientInfo: {
      flex: 1,
    },
    clientName: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 4,
    },
    clientActions: {
      flexDirection: 'row',
      gap: 16,
    },
    actionIcon: {
      padding: 4,
    },
    documentInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
    },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    width: '45%',
  },
  metaItemFull: {
    width: '100%',
  },
  metaLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Payment Toggle Button
  paymentToggleButton: {
    marginTop: 16,
  },

  // Line Items
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  lineItemContent: {
    flex: 1,
  },
  lineItemDescription: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  lineItemDetails: {
    fontSize: 12,
  },
  lineItemTotal: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Totals Section
  totalsSection: {
    borderTopWidth: 1,
    borderTopColor: '#ECE6DF',
    marginTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
  },
  totalValue: {
    fontSize: 14,
  },
  grandTotalRow: {
    paddingTop: 8,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Notes & Terms
  notesSection: {
    marginBottom: 16,
  },
  termsSection: {
    marginBottom: 16,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  
  // Activity Log
  activityEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activityTimestamp: {
    fontSize: 12,
  },
  activityDescription: {
    fontSize: 12,
  },
  
  // Action Bar
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 8,
    borderTopWidth: 1,
  },
  flexButton: {
    flex: 1,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 12,
    padding: 0,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE6DF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  
  // Download Modal Styles
  downloadModalContent: {
    width: '85%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  downloadIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  downloadTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  downloadSubtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 