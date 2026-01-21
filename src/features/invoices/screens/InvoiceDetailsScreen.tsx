import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  Animated,
  Easing,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/shared/types/navigation';
import { format, parseISO } from 'date-fns';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppBottomSheet from '@/shared/components/ui/AppBottomSheet';
import ListItemCard from '@/shared/components/ui/ListItemCard';
import { useFocusEffect } from '@react-navigation/native';
import { useNotifications } from '@/shared/context/NotificationContext';
import { AppModal } from '@/shared/components/ui';
import AppButton from '@/shared/components/ui/AppButton';
import invoicesService, { Invoice, convertEstimateToInvoice, getInvoicePdfUrl } from '../invoices.service';
import { useProfileStore } from '@/shared/store/profileStore';
import mockInvoicesData from '@/shared/data/mockInvoices';
import * as FileSystem from 'expo-file-system';

type Props = NativeStackScreenProps<RootStackParamList, 'InvoiceDetails'>;

// Mock activity log data
const mockActivityLog = [
  {
    id: 'act1',
    description: 'Invoice created',
    timestamp: '28 Jul 2024, 2:30 PM',
  },
  {
    id: 'act2',
    description: 'Invoice sent to client',
    timestamp: '28 Jul 2024, 2:35 PM',
  },
  {
    id: 'act3',
    description: 'Invoice viewed by client',
    timestamp: '29 Jul 2024, 6:22 PM',
  },
  {
    id: 'act4',
    description: 'Payment recorded',
    timestamp: '02 Aug 2024, 3:45 PM',
  },
];

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
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  
  const { theme, isDarkMode } = useTheme();
  const { setInvoicesUnreadCount, markItemAsViewed } = useNotifications();
  
  // Get company ID from profile store
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const companyId = activeBusiness?.id;

  // Fetch invoice from API
  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (companyId) {
        // Try to fetch from API first
        const data = await invoicesService.getInvoice(companyId, invoiceId);
        setInvoice(data);
      } else {
        // No company - fall back to mock data
        const mockInvoice = mockInvoicesData.find((inv) => inv.id === invoiceId);
        if (mockInvoice) {
          // Transform mock invoice to match API shape
          setInvoice({
            id: mockInvoice.id,
            companyId: 'biz-001',
            locationId: mockInvoice.locationId || 'loc-001',
            clientName: mockInvoice.clientName,
            clientEmail: mockInvoice.clientContact.email,
            amount: mockInvoice.subtotal,
            taxAmount: mockInvoice.taxTotal,
            totalAmount: mockInvoice.total,
            status: mockInvoice.status,
            type: mockInvoice.type.toLowerCase() as 'invoice' | 'estimate',
            issueDate: mockInvoice.date,
            dueDate: mockInvoice.dueDate,
            items: mockInvoice.items.map((item) => ({
              productId: item.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.total,
            })),
            notes: mockInvoice.notes,
            createdAt: mockInvoice.date,
            updatedAt: mockInvoice.date,
          });
        }
      }
    } catch (err) {
      console.warn('[InvoiceDetails] API failed, trying mock data:', err);
      // Fallback to mock data
      const mockInvoice = mockInvoicesData.find((inv) => inv.id === invoiceId);
      if (mockInvoice) {
        setInvoice({
          id: mockInvoice.id,
          companyId: 'biz-001',
          locationId: mockInvoice.locationId || 'loc-001',
          clientName: mockInvoice.clientName,
          clientEmail: mockInvoice.clientContact.email,
          amount: mockInvoice.subtotal,
          taxAmount: mockInvoice.taxTotal,
          totalAmount: mockInvoice.total,
          status: mockInvoice.status,
          type: mockInvoice.type.toLowerCase() as 'invoice' | 'estimate',
          issueDate: mockInvoice.date,
          dueDate: mockInvoice.dueDate,
          items: mockInvoice.items.map((item) => ({
            productId: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.total,
          })),
          notes: mockInvoice.notes,
          createdAt: mockInvoice.date,
          updatedAt: mockInvoice.date,
        });
      } else {
        setError('Invoice not found');
      }
    } finally {
      setLoading(false);
    }
  }, [companyId, invoiceId]);

  // Fetch on mount
  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);
  const isAdmin = true; // This would come from user context
  
  // Derived values from invoice data
  const clientName = invoice?.clientName || 'ABC Corporation';
  const documentNumber = invoice?.id || '#INV-2025-001';
  const status = invoice?.status || 'sent';
  const issueDate = invoice?.issueDate || '2025-01-15';
  const dueDate = invoice?.dueDate || '2025-02-14';
  const purchaseOrder = ''; // Not available in API type
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
  const globalDiscount = 0; // Not available in API type
  const totalTax = Number(invoice?.taxAmount) || 0;
  const shippingCost = 0; // Not available in API type
  const grandTotal = Number(invoice?.totalAmount) || 0;

  // Notes & Terms
  const notes = invoice?.notes || 'Thank you for your business. Please ensure timely payment to avoid any service interruptions.';
  const terms = 'Payment due within 30 days. Late payments subject to 1.5% monthly interest rate.';

  // Activity log
  const activityLog = mockActivityLog;

  const formatDate = (dateString: string) => {
    try {
      const date = dateString.includes('T') ? parseISO(dateString) : new Date(dateString);
      return format(date, 'dd MMM yyyy');
    } catch (e) {
      return dateString;
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    return `Rs ${(amount || 0).toFixed(2)}`;
  };

  const callClient = () => {
    // Mock phone number
    const phoneNumber = 'tel:+1234567890';
    Linking.openURL(phoneNumber);
  };

  const emailClient = () => {
    // Mock email
    const email = 'mailto:client@example.com';
    Linking.openURL(email);
  };

  const recordPayment = () => {
    setRecordingPayment(true);
  };

  const sendDocument = () => {
    setSuccessMessage(`${isEstimate ? 'Estimate' : 'Invoice'} sent successfully!`);
    setShowSuccessDialog(true);
  };

  const downloadPDF = async () => {
    if (!companyId) {
      Alert.alert('Error', 'No active business selected');
      return;
    }

    setShowDownloadModal(true);
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadComplete(false);

    try {
      const pdfUrl = invoice?.pdfUrl ?? await getInvoicePdfUrl(companyId, invoiceId);
      const fileName = `${documentNumber}.pdf`;
      const directory = FileSystem.documentDirectory ?? '';
      const fileUri = `${directory}${fileName}`;

      const downloadResumable = FileSystem.createDownloadResumable(
        pdfUrl,
        fileUri,
        {},
        (progress) => {
          const total = progress.totalBytesExpectedToWrite;
          if (total > 0) {
            const percent = Math.round((progress.totalBytesWritten / total) * 100);
            setDownloadProgress(percent);
          }
        }
      );

      await downloadResumable.downloadAsync();
      setIsDownloading(false);
      setDownloadComplete(true);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setIsDownloading(false);
      setShowDownloadModal(false);
      Alert.alert('Error', 'Failed to download PDF. Please try again.');
    }
  };

  const handleDownloadComplete = () => {
    setShowDownloadModal(false);
    setDownloadProgress(0);
    setDownloadComplete(false);
    setSuccessMessage(`${isEstimate ? 'Estimate' : 'Invoice'} PDF saved to your device!`);
    setShowSuccessDialog(true);
  };

  const shareDocument = async () => {
    try {
      const documentType = isEstimate ? 'Estimate' : 'Invoice';
      const result = await Share.share({
        title: `${documentType} ${documentNumber}`,
        message: `${documentType} ${documentNumber}\n\nClient: ${clientName}\nTotal: ${formatCurrency(grandTotal)}\nDue Date: ${formatDate(dueDate)}\n\nView details in NouPro app.`,
        // url: invoice?.pdfUrl, // Uncomment when PDF URL is available
      });
      
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared with specific activity type
          console.log('Shared via:', result.activityType);
        }
      }
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
  const isInvoiceOwner = invoice?.companyId === companyId;

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

  const handleMarkFullyPaid = () => {
    setPaymentStatus('paid');
    setShowPaymentOptions(false);
    setSuccessMessage('Invoice marked as fully paid!');
    setShowSuccessDialog(true);
  };

  const handleAddPartialPayment = () => {
    setShowPaymentOptions(false);
    // Navigate to ReceivedPayments screen
    (navigation as any).navigate('ReceivedPayments', { 
      invoiceId,
      totalAmount: grandTotal,
      paidAmount: invoice?.paidAmount ?? 0,
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
            if (!companyId) {
              Alert.alert('Error', 'No active business selected');
              return;
            }
            try {
              const updatedInvoice = await convertEstimateToInvoice(companyId, invoiceId);
              setInvoice(updatedInvoice);
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

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return '#9CA3AF'; // gray
      case 'sent':
        return '#3B82F6'; // blue (info)
      case 'paid':
        return '#10B981'; // green (success)
      case 'overdue':
        return '#F59E0B'; // orange (warning)
      default:
        return '#9CA3AF';
    }
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!invoice) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>Invoice not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // More options menu items - dynamically built based on document type and ownership
  const moreOptionsItems = [
    // Send option - only for owner and for estimates or draft invoices
    ...(isInvoiceOwner && (isEstimate || status === 'draft') ? [{
      id: 'send',
      title: isEstimate ? 'Send Estimate' : 'Send Invoice',
      description: `Send ${isEstimate ? 'estimate' : 'invoice'} to client`,
      icon: 'send',
    }] : []),
    // Download PDF - always available
    {
      id: 'download',
      title: 'Download PDF',
      description: `Download ${isEstimate ? 'estimate' : 'invoice'} as PDF`,
      icon: 'download',
    },
    {
      id: 'share',
      title: 'Share',
      description: `Share ${isEstimate ? 'estimate' : 'invoice'} details`,
      icon: 'share',
    },
    // Delete - only for owner
    ...(isInvoiceOwner ? [{
      id: 'delete',
      title: 'Delete',
      description: `Delete this ${isEstimate ? 'estimate' : 'invoice'}`,
      icon: 'trash-2',
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
            onPress: () => {
              // Handle delete logic here
              Alert.alert('Deleted', `${isEstimate ? 'Estimate' : 'Invoice'} has been deleted`);
              navigation.goBack();
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
          <TouchableOpacity onPress={navigateToClientProfile}>
            <Text style={[styles.clientName, { color: theme.colors.primary }]}>
              {clientName}
            </Text>
          </TouchableOpacity>
          

          
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
            <TouchableOpacity 
              style={[
                styles.paymentToggleButton,
                { backgroundColor: paymentStatus === 'paid' ? theme.colors.success : theme.colors.error },
                !isInvoiceOwner && { opacity: 0.7 }
              ]}
              onPress={handlePaymentButtonPress}
              disabled={paymentStatus === 'paid'}
            >
              <Text style={styles.paymentToggleText}>
                {paymentStatus === 'paid' ? 'PAID' : 'UNPAID'}
              </Text>
            </TouchableOpacity>
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
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                 </Text>
               </View>
               <Text style={[styles.lineItemTotal, { color: theme.colors.primary }]}>
                  {formatCurrency(item.total)}
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
               {formatCurrency(subtotal)}
             </Text>
           </View>
           {globalDiscount > 0 && (
             <View style={styles.totalRow}>
               <Text style={[styles.totalLabel, { color: theme.colors.secondary }]}>
                 Discount
               </Text>
               <Text style={[styles.totalValue, { color: theme.colors.primary }]}>
                 – {formatCurrency(globalDiscount)}
               </Text>
             </View>
           )}
           <View style={styles.totalRow}>
             <Text style={[styles.totalLabel, { color: theme.colors.secondary }]}>
               Tax
             </Text>
             <Text style={[styles.totalValue, { color: theme.colors.primary }]}>
               {formatCurrency(totalTax)}
             </Text>
           </View>
           {shippingCost > 0 && (
             <View style={styles.totalRow}>
               <Text style={[styles.totalLabel, { color: theme.colors.secondary }]}>
                 Shipping
               </Text>
               <Text style={[styles.totalValue, { color: theme.colors.primary }]}>
                 {formatCurrency(shippingCost)}
               </Text>
             </View>
           )}
           <View style={[styles.totalRow, styles.grandTotalRow]}>
             <Text style={[styles.grandTotalLabel, { color: theme.colors.primary }]}>
               Grand Total
             </Text>
             <Text style={[styles.grandTotalValue, { color: theme.colors.primary }]}>
               {formatCurrency(grandTotal)}
             </Text>
           </View>
        </View>

        {/* 5. Notes & Terms */}
        <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
          {notes && (
            <View style={styles.notesSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                Notes
              </Text>
              <Text style={[styles.sectionContent, { color: theme.colors.secondary }]}>
                {notes}
              </Text>
            </View>
          )}
          {terms && (
            <View style={styles.termsSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                Terms & Conditions
              </Text>
              <Text style={[styles.sectionContent, { color: theme.colors.secondary }]}>
                {terms}
              </Text>
            </View>
          )}
        </View>

        {/* 6. Activity Log */}
        <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            Activity
          </Text>
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
      </ScrollView>

      {/* 7. Sticky Bottom Action Bar */}
      <View style={[styles.actionBar, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.borderColor }]}>
        {isEstimate ? (
          // Estimate: Only show "Convert to Invoice" for owner
          isInvoiceOwner && (
            <TouchableOpacity
              onPress={handleConvertToInvoice}
              style={[styles.actionButton, { backgroundColor: theme.colors.primary, flex: 1 }]}
            >
              <Text style={styles.actionButtonText}>Convert to Invoice</Text>
            </TouchableOpacity>
          )
        ) : (
          // Invoice: Show Record Payment and Download PDF
          <>
            {isAdmin && status !== 'paid' && (
              <TouchableOpacity
                onPress={recordPayment}
                style={[styles.actionButton, { backgroundColor: theme.colors.success }]}
              >
                <Text style={styles.actionButtonText}>Record Payment</Text>
              </TouchableOpacity>
            )}
            {isAdmin && status === 'draft' && (
              <TouchableOpacity
                onPress={sendDocument}
                style={[styles.actionButton, { backgroundColor: '#EA5A5A' }]}
              >
                <Text style={styles.actionButtonText}>Send Invoice</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={downloadPDF}
              style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
            >
              <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>
                Download PDF
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Payment Recording Modal */}
      {recordingPayment && (
        <Modal
          visible={recordingPayment}
          transparent={true}
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
                    placeholder={formatCurrency(grandTotal)}
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
                
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.colors.success, marginTop: 20 }]}
                  onPress={() => {
                    setRecordingPayment(false);
                    setSuccessMessage('Payment recorded successfully!');
                    setShowSuccessDialog(true);
                  }}
                >
                  <Text style={styles.actionButtonText}>Record Payment</Text>
                </TouchableOpacity>
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
                  <Icon name="download" size={32} color={theme.colors.primary} />
                </View>
                <Text style={[styles.downloadTitle, { color: theme.colors.text }]}>
                  Downloading PDF
                </Text>
                <Text style={[styles.downloadSubtitle, { color: theme.colors.textSecondary }]}>
                  {isEstimate ? 'Estimate' : 'Invoice'} {documentNumber}
                </Text>
                
                {/* Progress Bar */}
                <View style={[styles.progressBarContainer, { backgroundColor: theme.colors.surface }]}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { 
                        backgroundColor: theme.colors.primary,
                        width: `${downloadProgress}%` 
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
                  {downloadProgress}%
                </Text>
              </>
            ) : (
              <>
                <View style={[styles.downloadIconContainer, { backgroundColor: theme.colors.success + '20' }]}>
                  <Icon name="checkmark-circle" size={32} color={theme.colors.success} />
                </View>
                <Text style={[styles.downloadTitle, { color: theme.colors.text }]}>
                  Download Complete
                </Text>
                <Text style={[styles.downloadSubtitle, { color: theme.colors.textSecondary }]}>
                  {isEstimate ? 'Estimate' : 'Invoice'} {documentNumber}.pdf
                </Text>
                
                <AppButton
                  title="Done"
                  onPress={handleDownloadComplete}
                  variant="primary"
                  size="large"
                  fullWidth
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
      >
        {moreOptionsItems.map((item, index) => (
          <ListItemCard
            key={item.id}
            avatar={{
              type: 'icon',
              icon: item.icon,
              iconColor: theme.colors.text,
              backgroundColor: theme.colors.surface,
            }}
            title={item.title}
            subtitle={item.description}
            onPress={() => {
              handleMoreOptionSelect(item);
              setShowMoreOptions(false);
            }}
            showDivider={index < moreOptionsItems.length - 1}
          />
        ))}
      </AppBottomSheet>

      {/* Payment Options Bottom Sheet */}
      <AppBottomSheet
        visible={showPaymentOptions}
        onClose={() => setShowPaymentOptions(false)}
        title="Payment Options"
      >
        <ListItemCard
          avatar={{
            type: 'icon',
            icon: 'add-circle-outline',
            iconColor: theme.colors.text,
            backgroundColor: theme.colors.surface,
          }}
          title="Add Partial Payment"
          subtitle="Record a partial payment received"
          onPress={handleAddPartialPayment}
          showDivider
        />
        <ListItemCard
          avatar={{
            type: 'icon',
            icon: 'checkmark-circle',
            iconColor: '#FFFFFF',
            backgroundColor: theme.colors.success,
          }}
          title="Mark as Fully Paid"
          subtitle="Mark invoice as completely paid"
          onPress={handleMarkFullyPaid}
          showDivider={false}
        />
      </AppBottomSheet>
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
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DAD3D1',
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
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  paymentToggleText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
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
    borderTopColor: '#E5E7EB',
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
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
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
    borderBottomColor: '#E5E7EB',
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