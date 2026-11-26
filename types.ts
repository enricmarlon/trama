export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  lowStockAt: number;
  imageUri?: string;
};

export type SaleItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineDiscount?: number;
};

export type Sale = {
  id: string;
  date: string;
  items: SaleItem[];
  total: number;
  savings: number;
  employeeName?: string;
};

export type CustomerOrderItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineDiscount?: number;
};

export type CustomerOrder = {
  id: string;
  customerName: string;
  phone: string;
  createdDate: string;
  deliveryDate: string;
  alertDays?: number;
  items: CustomerOrderItem[];
  total: number;
  savings: number;
  status: 'pending' | 'delivered';
  saleId?: string;
};

export type Expense = {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
};

export type Supply = {
  id: string;
  name: string;
  quantity: number;
  dailyUse: number;
  registeredDate: string;
};

export type Offer = {
  id: string;
  productId: string;
  name: string;
  discountType: 'percent' | 'fixed';
  value: number;
  active: boolean;
};

export type StoreData = {
  products: Product[];
  sales: Sale[];
  orders: CustomerOrder[];
  expenses: Expense[];
  supplies: Supply[];
  offers: Offer[];
  company?: CompanyProfile;
};

export type CompanyProfile = {
  businessType: string;
  customBusinessType?: string;
  name: string;
  baseColor: string;
  employees: string[];
};

export type Palette = {
  ink: string;
  muted: string;
  green: string;
  paleGreen: string;
  cream: string;
  white: string;
  border: string;
  orange: string;
  paleOrange: string;
  red: string;
  accentDeep: string;
  accentMid: string;
  accentOn: string;
  secondaryDeep: string;
  secondarySoft: string;
  canvasShade: string;
};

export type Tab = 'home' | 'products' | 'sales' | 'orders' | 'supplies' | 'alerts' | 'management';
export type FormType = 'product' | 'sale' | 'order' | 'expense' | 'supply' | 'offer' | null;
