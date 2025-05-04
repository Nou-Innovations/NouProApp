export type RootStackParamList = {
  MainTabs: undefined;
  Auth: undefined;
  ProductDetails: { productId: string };
  OrderDetails: { orderId: string };
  InvoiceDetails: { invoiceId: string };
  CreateProduct: undefined;
  CreateOrder: undefined;
  CreateInvoice: undefined;
};

export type TabParamList = {
  Inbox: undefined;
  Delivery: undefined;
  Products: undefined;
  Invoices: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
}; 