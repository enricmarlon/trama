import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  BASE_COLORS,
  BUSINESS_TYPES,
  DEFAULT_PALETTE,
  DEFAULT_PRODUCT_CATEGORIES,
  DEFAULT_SUPPLY_CATEGORIES,
  initialData,
  STORAGE_KEY,
} from './constants';
import {
  availableSupplyQuantity,
  createPalette,
  dateDifferenceInDays,
  deliveryCountdown,
  formatDate,
  formatLongDate,
  calculateCommissionAmount,
  localDateKey,
  money,
  parseAmount,
  parseDeliveryDate,
  sameMonth,
  supplyDaysRemaining,
} from './utils';
import { createStyles, ThemeContext } from './theme/ThemeContext';
import type {
  CompanyProfile,
  CustomerOrder,
  CategoryKind,
  Expense,
  FormType,
  Offer,
  Product,
  Sale,
  StoreData,
  Supply,
  Tab,
} from './types';
import ActionButton from './components/ActionButton';
import ProductPicture from './components/ProductPicture';
import SectionTitle from './components/SectionTitle';
import AlertsScreen from './screens/AlertsScreen';
import CommissionsScreen from './screens/CommissionsScreen';
import ProductsScreen from './screens/ProductsScreen';
import SettingsScreen from './screens/SettingsScreen';
import { createBackupFile, persistProductImage, readBackupFile } from './backup';

function normalizeStoreData(savedData: Partial<StoreData>): StoreData {
  const products = savedData.products ?? [];
  const supplies = savedData.supplies ?? [];
  return {
    ...initialData,
    ...savedData,
    products,
    supplies,
    productCategories: [...new Set([
      ...DEFAULT_PRODUCT_CATEGORIES,
      ...(savedData.productCategories ?? []),
      ...products.map((product) => product.category),
    ])],
    supplyCategories: [...new Set([
      ...DEFAULT_SUPPLY_CATEGORIES,
      ...(savedData.supplyCategories ?? []),
      ...supplies.flatMap((supply) => supply.category ? [supply.category] : []),
    ])],
  };
}

export default function App() {
  const [data, setData] = useState<StoreData>(initialData);
  const [loaded, setLoaded] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  const [form, setForm] = useState<FormType>(null);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date());
  const [salesEmployeeFilter, setSalesEmployeeFilter] = useState<string[] | null>(null);
  const [query, setQuery] = useState('');
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState(DEFAULT_PRODUCT_CATEGORIES[0]);
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('');
  const [lowStockAt, setLowStockAt] = useState('2');
  const [productMakerEmployee, setProductMakerEmployee] = useState('');
  const [productCommissionPercent, setProductCommissionPercent] = useState('0');
  const [productDiscountType, setProductDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [productDiscountValue, setProductDiscountValue] = useState('');
  const [photoUri, setPhotoUri] = useState<string>();
  const [expenseName, setExpenseName] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Matéria-prima');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [supplyName, setSupplyName] = useState('');
  const [supplyCategory, setSupplyCategory] = useState(DEFAULT_SUPPLY_CATEGORIES[0]);
  const [supplyQuantity, setSupplyQuantity] = useState('');
  const [supplyDailyUse, setSupplyDailyUse] = useState('');
  const [offerProductId, setOfferProductId] = useState('');
  const [offerName, setOfferName] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartDiscounts, setCartDiscounts] = useState<Record<string, string>>({});
  const [orderCustomerName, setOrderCustomerName] = useState('');
  const [orderPhone, setOrderPhone] = useState('');
  const [orderDeliveryDate, setOrderDeliveryDate] = useState('');
  const [orderAlertDays, setOrderAlertDays] = useState('');
  const [orderCart, setOrderCart] = useState<Record<string, number>>({});
  const [orderCartDiscounts, setOrderCartDiscounts] = useState<Record<string, string>>({});
  const [businessType, setBusinessType] = useState('Ateliê');
  const [customBusinessType, setCustomBusinessType] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [selectedColor, setSelectedColor] = useState(DEFAULT_PALETTE.green);
  const [employees, setEmployees] = useState<string[]>([]);
  const [employeeDraft, setEmployeeDraft] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [editingCompany, setEditingCompany] = useState(false);

  const activeColor = data.company && !editingCompany ? data.company.baseColor : selectedColor;
  const palette = useMemo(() => createPalette(activeColor), [activeColor]);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const theme = useMemo(() => ({ palette, styles }), [palette, styles]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved && active) {
          const savedData = JSON.parse(saved) as Partial<StoreData>;
          const products = savedData.products ?? [];
          const offers = savedData.offers ?? [];
          const migratedOrders = (savedData.orders ?? []).map((order) => {
            const items = order.items.map((item) => {
              const product = products.find((candidate) => candidate.id === item.productId);
              const offer = offers.find((candidate) => candidate.productId === item.productId && candidate.active);
              const currentUnitPrice = product
                ? Math.max(0, product.price - (offer
                  ? offer.discountType === 'percent' ? (product.price * offer.value) / 100 : offer.value
                  : 0))
                : 0;
              return {
                ...item,
                unitPrice: item.unitPrice ?? currentUnitPrice,
                lineDiscount: item.lineDiscount ?? 0,
              };
            });
            const total = order.total ?? items.reduce(
              (sum, item) => sum + Math.max(0, item.unitPrice * item.quantity - item.lineDiscount),
              0,
            );
            const savings = order.savings ?? items.reduce((sum, item) => {
              const product = products.find((candidate) => candidate.id === item.productId);
              const originalTotal = (product?.price ?? item.unitPrice) * item.quantity;
              return sum + originalTotal - Math.max(0, item.unitPrice * item.quantity - item.lineDiscount);
            }, 0);
            return { ...order, items, total, savings };
          });
          setData(normalizeStoreData({ ...savedData, orders: migratedOrders }));
        }
      })
      .catch(() => {
        Alert.alert('Não foi possível carregar os dados', 'Confira o armazenamento do dispositivo e tente novamente.');
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {
      Alert.alert('Falha ao salvar', 'Não foi possível salvar as alterações neste dispositivo.');
    });
  }, [data, loaded]);

  const activeOffers = useMemo(() => data.offers.filter((offer) => offer.active), [data.offers]);
  const productCategoryOptions = data.productCategories ?? DEFAULT_PRODUCT_CATEGORIES;
  const supplyCategoryOptions = data.supplyCategories ?? DEFAULT_SUPPLY_CATEGORIES;
  const offerFor = (productId: string) => activeOffers.find((offer) => offer.productId === productId);
  const priceFor = (product: Product) => {
    const offer = offerFor(product.id);
    if (!offer) return product.price;
    const discount = offer.discountType === 'percent' ? (product.price * offer.value) / 100 : offer.value;
    return Math.max(0, product.price - discount);
  };
  const editingSale = editingSaleId
    ? data.sales.find((sale) => sale.id === editingSaleId)
    : undefined;
  const saleUnitPrice = (product: Product) =>
    editingSale?.items.find((item) => item.productId === product.id)?.unitPrice ?? priceFor(product);
  const salesEmployeeOptions = [...new Set(data.company?.employees ?? [])];
  const validSalesEmployeeFilter = salesEmployeeFilter?.filter((employee) =>
    salesEmployeeOptions.includes(employee),
  ) ?? null;
  const activeSalesEmployeeFilter = salesEmployeeFilter
    && salesEmployeeFilter.length > 0
    && validSalesEmployeeFilter?.length === 0
    ? null
    : validSalesEmployeeFilter;
  const monthSales = data.sales.filter((sale) => sameMonth(sale.date, month));
  const reportSales = salesEmployeeOptions.length === 0 || activeSalesEmployeeFilter === null
    ? monthSales
    : monthSales.filter((sale) => sale.employeeName && activeSalesEmployeeFilter.includes(sale.employeeName));
  const reportRevenue = reportSales.reduce((sum, sale) => sum + sale.total, 0);
  const monthExpenses = data.expenses.filter((expense) => sameMonth(expense.date, month));
  const monthRevenue = monthSales.reduce((sum, sale) => sum + sale.total, 0);
  const monthSpent = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const previousMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const previousRevenue = data.sales
    .filter((sale) => sameMonth(sale.date, previousMonth))
    .reduce((sum, sale) => sum + sale.total, 0);
  const revenueTrend = previousRevenue > 0 ? Math.round(((monthRevenue - previousRevenue) / previousRevenue) * 100) : null;
  const revenueBars = Array.from({ length: 6 }, (_, index) =>
    monthSales
      .filter((sale) => Math.min(5, Math.floor((Number(sale.date.slice(8, 10)) - 1) / 5)) === index)
      .reduce((sum, sale) => sum + sale.total, 0),
  );
  const maxRevenueBar = Math.max(1, ...revenueBars);
  const lowStockProducts = data.products.filter((product) => product.stock <= product.lowStockAt);
  const today = localDateKey(new Date());
  const suppliesWithStock = data.supplies.map((supply) => ({
    supply,
    quantity: availableSupplyQuantity(supply, today),
  }));
  const lowStockSupplies = suppliesWithStock.filter(({ quantity }) => quantity < 2);
  const lowStockCount = lowStockProducts.length + lowStockSupplies.length;
  const pendingOrders = data.orders.filter((order) => order.status === 'pending');
  const alertingOrders = pendingOrders.filter((order) =>
    order.alertDays !== undefined && dateDifferenceInDays(today, order.deliveryDate) <= order.alertDays,
  );
  const visibleProducts = data.products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()));
  const monthLabel = month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const openForm = (next: Exclude<FormType, null>) => {
    setForm(next);
    if (next === 'product') {
      setProductName('');
      setProductCategory(productCategoryOptions[0] ?? '');
      setProductPrice('');
      setProductStock('');
      setLowStockAt('2');
      setProductMakerEmployee('');
      setProductCommissionPercent('0');
      setProductDiscountType('none');
      setProductDiscountValue('');
      setPhotoUri(undefined);
    }
    if (next === 'sale') {
      setEditingSaleId(null);
      setCart({});
      setCartDiscounts({});
      setSelectedEmployee('');
    }
    if (next === 'order') {
      setOrderCustomerName('');
      setOrderPhone('');
      setOrderDeliveryDate('');
      setOrderAlertDays('');
      setOrderCart({});
      setOrderCartDiscounts({});
    }
    if (next === 'expense') {
      setEditingExpenseId(null);
      setExpenseName('');
      setExpenseCategory('Matéria-prima');
      setExpenseAmount('');
    }
    if (next === 'supply') {
      setSupplyName('');
      setSupplyCategory(supplyCategoryOptions[0] ?? '');
      setSupplyQuantity('');
      setSupplyDailyUse('');
    }
    if (next === 'offer') {
      setOfferProductId(data.products[0]?.id ?? '');
      setOfferName('');
      setDiscountType('percent');
      setDiscountValue('');
    }
  };

  const closeForm = () => {
    setForm(null);
    setEditingSaleId(null);
    setEditingExpenseId(null);
  };

  const openSaleForEditing = (sale: Sale) => {
    if (sale.items.some((item) => item.commissionPaidDate)) {
      Alert.alert(
        'Venda protegida',
        'Esta venda tem uma comissão marcada como paga e não pode ser alterada.',
      );
      return;
    }
    const missingProduct = sale.items.find((item) =>
      !data.products.some((product) => product.id === item.productId),
    );
    if (missingProduct) {
      Alert.alert(
        'Não é possível editar esta venda',
        `O produto "${missingProduct.name}" não está mais cadastrado. Reative ou cadastre o produto antes de editar a venda.`,
      );
      return;
    }
    setEditingSaleId(sale.id);
    setCart(sale.items.reduce<Record<string, number>>((items, item) => {
      items[item.productId] = (items[item.productId] ?? 0) + item.quantity;
      return items;
    }, {}));
    setCartDiscounts(sale.items.reduce<Record<string, string>>((discounts, item) => {
      discounts[item.productId] = item.lineDiscount ? String(item.lineDiscount) : '';
      return discounts;
    }, {}));
    setSelectedEmployee(sale.employeeName ?? '');
    setForm('sale');
  };

  const addEmployee = () => {
    const name = employeeDraft.trim();
    if (!name) return;
    if (employees.some((employee) => employee.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      Alert.alert('Funcionário já cadastrado', 'Use um nome diferente ou remova o nome já existente.');
      return;
    }
    setEmployees((current) => [...current, name]);
    setEmployeeDraft('');
  };

  const addManagedCategory = (kind: CategoryKind, value: string) => {
    const name = value.trim();
    const categories = kind === 'product' ? productCategoryOptions : supplyCategoryOptions;
    if (!name) {
      Alert.alert('Informe a categoria', 'Digite um nome antes de adicionar.');
      return false;
    }
    if (categories.some((category) => category.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      Alert.alert('Categoria já cadastrada', 'Use um nome diferente ou edite a categoria existente.');
      return false;
    }
    setData((current) => kind === 'product'
      ? { ...current, productCategories: [...(current.productCategories ?? DEFAULT_PRODUCT_CATEGORIES), name] }
      : { ...current, supplyCategories: [...(current.supplyCategories ?? DEFAULT_SUPPLY_CATEGORIES), name] });
    return true;
  };

  const renameManagedCategory = (kind: CategoryKind, oldName: string, value: string) => {
    const name = value.trim();
    const categories = kind === 'product' ? productCategoryOptions : supplyCategoryOptions;
    if (!name) {
      Alert.alert('Informe a categoria', 'O nome da categoria não pode ficar vazio.');
      return false;
    }
    if (categories.some((category) => category !== oldName && category.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      Alert.alert('Categoria já cadastrada', 'Use um nome diferente ou edite a categoria existente.');
      return false;
    }
    if (name === oldName) return true;

    setData((current) => kind === 'product'
      ? {
        ...current,
        productCategories: (current.productCategories ?? DEFAULT_PRODUCT_CATEGORIES)
          .map((category) => category === oldName ? name : category),
        products: current.products.map((product) =>
          product.category === oldName ? { ...product, category: name } : product),
      }
      : {
        ...current,
        supplyCategories: (current.supplyCategories ?? DEFAULT_SUPPLY_CATEGORIES)
          .map((category) => category === oldName ? name : category),
        supplies: current.supplies.map((supply) =>
          supply.category === oldName ? { ...supply, category: name } : supply),
      });
    if (kind === 'product') {
      setProductCategory((current) => current === oldName ? name : current);
    } else {
      setSupplyCategory((current) => current === oldName ? name : current);
    }
    return true;
  };

  const removeManagedCategory = (kind: CategoryKind, name: string) => {
    const categories = kind === 'product' ? productCategoryOptions : supplyCategoryOptions;
    if (categories.length <= 1) {
      Alert.alert('Mantenha uma categoria', 'É necessário ter ao menos uma categoria para cadastrar itens.');
      return;
    }
    const replacement = categories.find((category) => category !== name);
    if (!replacement) return;
    const affectedCount = kind === 'product'
      ? data.products.filter((product) => product.category === name).length
      : data.supplies.filter((supply) => supply.category === name).length;
    const affectedLabel = kind === 'product' ? 'produto(s)' : 'insumo(s)';

    Alert.alert(
      'Remover categoria?',
      affectedCount > 0
        ? `${affectedCount} ${affectedLabel} desta categoria serão movidos para "${replacement}".`
        : `A categoria "${name}" será removida.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            setData((current) => kind === 'product'
              ? {
                ...current,
                productCategories: (current.productCategories ?? DEFAULT_PRODUCT_CATEGORIES)
                  .filter((category) => category !== name),
                products: current.products.map((product) =>
                  product.category === name ? { ...product, category: replacement } : product),
              }
              : {
                ...current,
                supplyCategories: (current.supplyCategories ?? DEFAULT_SUPPLY_CATEGORIES)
                  .filter((category) => category !== name),
                supplies: current.supplies.map((supply) =>
                  supply.category === name ? { ...supply, category: replacement } : supply),
              });
            if (kind === 'product') {
              setProductCategory((current) => current === name ? replacement : current);
            } else {
              setSupplyCategory((current) => current === name ? replacement : current);
            }
          },
        },
      ],
    );
  };

  const addManagedEmployee = (value: string) => {
    const name = value.trim();
    const currentEmployees = data.company?.employees ?? [];
    if (!name) {
      Alert.alert('Informe o funcionário', 'Digite um nome antes de adicionar.');
      return false;
    }
    if (currentEmployees.some((employee) => employee.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      Alert.alert('Funcionário já cadastrado', 'Use um nome diferente ou edite o funcionário existente.');
      return false;
    }
    const nextEmployees = [...currentEmployees, name];
    setEmployees(nextEmployees);
    setData((current) => current.company
      ? { ...current, company: { ...current.company, employees: nextEmployees } }
      : current);
    return true;
  };

  const renameManagedEmployee = (oldName: string, value: string) => {
    const name = value.trim();
    const currentEmployees = data.company?.employees ?? [];
    if (!name) {
      Alert.alert('Informe o funcionário', 'O nome do funcionário não pode ficar vazio.');
      return false;
    }
    if (currentEmployees.some((employee) => employee !== oldName && employee.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      Alert.alert('Funcionário já cadastrado', 'Use um nome diferente ou edite o funcionário existente.');
      return false;
    }
    if (name === oldName) return true;
    const nextEmployees = currentEmployees.map((employee) => employee === oldName ? name : employee);
    setEmployees(nextEmployees);
    setData((current) => ({
      ...current,
      company: current.company ? { ...current.company, employees: nextEmployees } : current.company,
      products: current.products.map((product) =>
        product.makerEmployee === oldName ? { ...product, makerEmployee: name } : product),
      sales: current.sales.map((sale) => ({
        ...sale,
        employeeName: sale.employeeName === oldName ? name : sale.employeeName,
        items: sale.items.map((item) =>
          item.commissionEmployee === oldName ? { ...item, commissionEmployee: name } : item),
      })),
      orders: current.orders.map((order) => ({
        ...order,
        items: order.items.map((item) =>
          item.commissionEmployee === oldName ? { ...item, commissionEmployee: name } : item),
      })),
    }));
    return true;
  };

  const removeManagedEmployee = (name: string) => {
    Alert.alert(
      'Remover funcionário?',
      `As referências atuais de "${name}" serão removidas. Vendas e comissões já registradas serão mantidas no histórico.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            const nextEmployees = (data.company?.employees ?? []).filter((employee) => employee !== name);
            setEmployees(nextEmployees);
            setData((current) => ({
              ...current,
              company: current.company ? { ...current.company, employees: nextEmployees } : current.company,
              products: current.products.map((product) =>
                product.makerEmployee === name
                  ? { ...product, makerEmployee: undefined, commissionPercent: 0 }
                  : product),
              orders: current.orders.map((order) => order.status === 'pending'
                ? {
                  ...order,
                  items: order.items.map((item) => item.commissionEmployee === name
                    ? {
                      ...item,
                      commissionEmployee: undefined,
                      commissionPercent: undefined,
                      commissionAmount: undefined,
                    }
                    : item),
                }
                : order),
            }));
          },
        },
      ],
    );
  };

  const saveCompanyProfile = () => {
    const name = businessName.trim();
    const customType = customBusinessType.trim();
    if (!name) {
      Alert.alert('Informe o estabelecimento', 'Digite o nome da sua empresa ou local de trabalho.');
      return;
    }
    if (businessType === 'Outro' && !customType) {
      Alert.alert('Informe o ramo', 'Digite o tipo do seu estabelecimento.');
      return;
    }
    const company: CompanyProfile = {
      businessType,
      customBusinessType: businessType === 'Outro' ? customType : undefined,
      name,
      baseColor: selectedColor,
      employees,
    };
    setData((current) => ({ ...current, company }));
    setEditingCompany(false);
  };

  const exportBackup = async () => {
    if (backupBusy) return;
    setBackupBusy(true);
    let backupFile: File | undefined;
    try {
      backupFile = await createBackupFile(data);
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('O compartilhamento de arquivos não está disponível neste dispositivo.');
      }
      await Sharing.shareAsync(backupFile.uri, {
        dialogTitle: 'Exportar backup do Trama',
        mimeType: 'application/json',
      });
      Alert.alert('Backup pronto', 'O arquivo JSON contém seus dados e as fotos dos produtos.');
    } catch (error) {
      Alert.alert(
        'Não foi possível exportar o backup',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    } finally {
      if (backupFile?.exists) {
        try {
          backupFile.delete();
        } catch {
          Alert.alert('Aviso', 'O backup foi processado, mas o arquivo temporário não pôde ser removido.');
        }
      }
      setBackupBusy(false);
    }
  };

  const importBackupFromFile = async () => {
    if (backupBusy) return;
    setBackupBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const importedData = normalizeStoreData(await readBackupFile(result.assets[0].uri));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(importedData));
      setData(importedData);
      setBusinessType(importedData.company?.businessType ?? 'Ateliê');
      setCustomBusinessType(importedData.company?.customBusinessType ?? '');
      setBusinessName(importedData.company?.name ?? '');
      setSelectedColor(importedData.company?.baseColor ?? DEFAULT_PALETTE.green);
      setEmployees(importedData.company?.employees ?? []);
      setEditingCompany(false);
      setMonth(new Date());
      setTab('home');
      Alert.alert('Backup importado', 'Os dados e as imagens foram restaurados neste dispositivo.');
    } catch (error) {
      Alert.alert(
        'Não foi possível importar o backup',
        error instanceof Error ? error.message : 'Confira o arquivo e tente novamente.',
      );
    } finally {
      setBackupBusy(false);
    }
  };

  const importBackup = () => {
    if (backupBusy) return;
    const hasExistingData = Boolean(data.company)
      || data.products.length > 0
      || data.sales.length > 0
      || data.orders.length > 0
      || data.expenses.length > 0
      || data.supplies.length > 0
      || data.offers.length > 0;
    if (!hasExistingData) {
      void importBackupFromFile();
      return;
    }

    Alert.alert(
      'Substituir os dados atuais?',
      'A importação substituirá os dados deste dispositivo pelo conteúdo do backup.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Importar backup', style: 'destructive', onPress: () => void importBackupFromFile() },
      ],
    );
  };

  const editCompanyProfile = () => {
    const company = data.company;
    if (!company) return;
    setBusinessType(company.businessType);
    setCustomBusinessType(company.customBusinessType ?? '');
    setBusinessName(company.name);
    setSelectedColor(company.baseColor);
    setEmployees(company.employees ?? []);
    setEditingCompany(true);
  };

  const choosePhoto = async (source: 'gallery' | 'camera') => {
    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permissão necessária',
          source === 'camera'
            ? 'Permita o acesso à câmera para fotografar o produto.'
            : 'Permita o acesso às fotos para escolher uma imagem do produto.',
        );
        return;
      }
      const options = { allowsEditing: true, aspect: [1, 1] as [number, number], quality: 0.75 };
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync({ ...options, mediaTypes: ['images'] });
      if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
    } catch {
      Alert.alert(
        source === 'camera' ? 'Não foi possível abrir a câmera' : 'Não foi possível abrir a galeria',
        'Confira as permissões do dispositivo e tente novamente.',
      );
    }
  };

  const saveProduct = async () => {
    const price = parseAmount(productPrice);
    const stock = Number.parseInt(productStock, 10);
    const threshold = Number.parseInt(lowStockAt, 10);
    const offerValue = parseAmount(productDiscountValue);
    const commissionPercent = parseAmount(productCommissionPercent);
    if (!productName.trim() || price <= 0 || !Number.isInteger(stock) || stock < 0 || !Number.isInteger(threshold) || threshold < 0) {
      Alert.alert('Confira os dados', 'Informe o nome, um preço válido e quantidades inteiras iguais ou maiores que zero.');
      return;
    }
    if (productDiscountType !== 'none' && (offerValue <= 0 || (productDiscountType === 'percent' && offerValue > 100))) {
      Alert.alert('Confira a oferta', 'Informe um desconto maior que zero e, em porcentagem, de no máximo 100%.');
      return;
    }
    if (commissionPercent < 0 || commissionPercent > 100) {
      Alert.alert('Confira a comissão', 'Informe uma porcentagem de comissão entre 0% e 100%.');
      return;
    }
    if (commissionPercent > 0 && !productMakerEmployee) {
      Alert.alert('Selecione quem fabricou', 'Escolha o funcionário responsável pela fabricação para cadastrar a comissão.');
      return;
    }
    const id = `p${Date.now()}`;
    let imageUri: string | undefined;
    if (photoUri) {
      try {
        imageUri = await persistProductImage(photoUri);
      } catch (error) {
        Alert.alert(
          'Não foi possível salvar a foto',
          error instanceof Error ? error.message : 'Tente escolher a imagem novamente.',
        );
        return;
      }
    }
    const product: Product = {
      id,
      name: productName.trim(),
      category: productCategory,
      price,
      stock,
      lowStockAt: threshold,
      imageUri,
      ...(productMakerEmployee ? { makerEmployee: productMakerEmployee } : {}),
      commissionPercent,
    };
    const initialOffer: Offer | undefined = productDiscountType === 'none'
      ? undefined
      : {
        id: `o${Date.now()}`,
        productId: product.id,
        name: 'Oferta inicial',
        discountType: productDiscountType,
        value: offerValue,
        active: true,
      };
    setData((current) => ({
      ...current,
      products: [product, ...current.products],
      offers: initialOffer ? [...current.offers, initialOffer] : current.offers,
    }));
    closeForm();
  };

  const saveSale = () => {
    const previousSale = editingSaleId
      ? data.sales.find((sale) => sale.id === editingSaleId)
      : undefined;
    if (editingSaleId && !previousSale) {
      Alert.alert('Venda não encontrada', 'Atualize o histórico e tente novamente.');
      return;
    }
    if (previousSale?.items.some((item) => item.commissionPaidDate)) {
      Alert.alert('Venda protegida', 'Esta venda tem uma comissão marcada como paga e não pode ser alterada.');
      return;
    }
    const items = data.products
      .filter((product) => (cart[product.id] ?? 0) > 0)
      .map((product) => {
        const previousItem = previousSale?.items.find((item) => item.productId === product.id);
        return {
          product,
          quantity: cart[product.id],
          unitPrice: previousItem?.unitPrice ?? priceFor(product),
          lineDiscount: parseAmount(cartDiscounts[product.id] ?? ''),
          previousItem,
        };
      });
    if (items.length === 0) {
      Alert.alert('Venda sem produtos', 'Adicione ao menos um produto para registrar a venda.');
      return;
    }
    const previousQuantities = new Map<string, number>();
    previousSale?.items.forEach((item) => {
      previousQuantities.set(
        item.productId,
        (previousQuantities.get(item.productId) ?? 0) + item.quantity,
      );
    });
    const unavailable = items.find(({ product, quantity }) =>
      quantity > product.stock + (previousQuantities.get(product.id) ?? 0),
    );
    if (unavailable) {
      const available = unavailable.product.stock + (previousQuantities.get(unavailable.product.id) ?? 0);
      Alert.alert('Estoque insuficiente', `Há apenas ${available} unidade(s) disponíveis de ${unavailable.product.name}.`);
      return;
    }
    const invalidDiscount = items.find((item) =>
      item.lineDiscount < 0 || item.lineDiscount > item.unitPrice * item.quantity,
    );
    if (invalidDiscount) {
      Alert.alert(
        'Desconto inválido',
        `O desconto de ${invalidDiscount.product.name} não pode ser maior que o total da linha (${money(invalidDiscount.unitPrice * invalidDiscount.quantity)}).`,
      );
      return;
    }
    const lineTotal = (item: typeof items[number]) =>
      Math.max(0, item.unitPrice * item.quantity - item.lineDiscount);
    const total = items.reduce((sum, item) => sum + lineTotal(item), 0);
    const savings = items.reduce((sum, item) =>
      sum + Math.max(0, item.product.price * item.quantity - lineTotal(item)),
    0);
    const saleItems: Sale['items'] = items.map(({ product, quantity, unitPrice, lineDiscount, previousItem }) => {
        const commissionPercent = previousItem
          ? previousItem.commissionPercent ?? 0
          : product.commissionPercent ?? 0;
        const commissionEmployee = previousItem
          ? previousItem.commissionEmployee
          : product.makerEmployee;
        const commissionAmount = calculateCommissionAmount(
          Math.max(0, unitPrice * quantity - lineDiscount),
          commissionPercent,
        );
        return {
          productId: product.id,
          name: product.name,
          quantity,
          unitPrice,
          ...(lineDiscount > 0 ? { lineDiscount } : {}),
          ...(commissionEmployee && commissionPercent > 0
            ? {
              commissionEmployee,
              commissionPercent,
              commissionAmount,
            }
            : {}),
        };
      });
    const sale: Sale = {
      id: previousSale?.id ?? `s${Date.now()}`,
      date: previousSale?.date ?? localDateKey(new Date()),
      items: saleItems,
      total,
      savings,
      ...(selectedEmployee ? { employeeName: selectedEmployee } : {}),
    };
    setData((current) => {
      const currentSale = previousSale
        ? current.sales.find((item) => item.id === previousSale.id)
        : undefined;
      if (previousSale && (!currentSale || currentSale.items.some((item) => item.commissionPaidDate))) {
        return current;
      }
      const oldQuantities = new Map<string, number>();
      currentSale?.items.forEach((item) => {
        oldQuantities.set(item.productId, (oldQuantities.get(item.productId) ?? 0) + item.quantity);
      });
      const newQuantities = new Map<string, number>();
      saleItems.forEach((item) => {
        newQuantities.set(item.productId, (newQuantities.get(item.productId) ?? 0) + item.quantity);
      });
      const orderItems = saleItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        ...(item.lineDiscount ? { lineDiscount: item.lineDiscount } : {}),
        ...(item.commissionEmployee ? { commissionEmployee: item.commissionEmployee } : {}),
        ...(item.commissionPercent !== undefined ? { commissionPercent: item.commissionPercent } : {}),
        ...(item.commissionAmount !== undefined ? { commissionAmount: item.commissionAmount } : {}),
      }));
      return {
        ...current,
        sales: currentSale
          ? current.sales.map((item) => item.id === sale.id ? sale : item)
          : [sale, ...current.sales],
        orders: currentSale
          ? current.orders.map((order) => order.saleId === sale.id
            ? { ...order, items: orderItems, total, savings }
            : order)
          : current.orders,
        products: current.products.map((product) => {
          const stockChange = (oldQuantities.get(product.id) ?? 0) - (newQuantities.get(product.id) ?? 0);
          return stockChange ? { ...product, stock: product.stock + stockChange } : product;
        }),
      };
    });
    if (!previousSale) setMonth(new Date());
    closeForm();
  };

  const deleteSale = (saleId: string) => {
    const sale = data.sales.find((item) => item.id === saleId);
    if (!sale) return;
    if (sale.items.some((item) => item.commissionPaidDate)) {
      Alert.alert(
        'Venda protegida',
        'Esta venda tem uma comissão marcada como paga e não pode ser excluída.',
      );
      return;
    }
    const linkedOrder = data.orders.find((order) => order.saleId === sale.id);
    const hasMissingProduct = sale.items.some((item) =>
      !data.products.some((product) => product.id === item.productId),
    );
    const message = linkedOrder
      ? 'Os itens voltarão ao estoque e o pedido será reaberto como pendente.'
      : 'Os itens desta venda voltarão ao estoque.';
    Alert.alert(
      'Excluir venda?',
      hasMissingProduct
        ? `${message} Produtos removidos do catálogo não podem ter o estoque restaurado.`
        : message,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => setData((current) => {
            const currentSale = current.sales.find((item) => item.id === saleId);
            if (!currentSale || currentSale.items.some((item) => item.commissionPaidDate)) {
              return current;
            }
            const restoredQuantities = new Map<string, number>();
            currentSale.items.forEach((item) => {
              restoredQuantities.set(
                item.productId,
                (restoredQuantities.get(item.productId) ?? 0) + item.quantity,
              );
            });
            return {
              ...current,
              sales: current.sales.filter((item) => item.id !== saleId),
              orders: current.orders.map((order) => order.saleId === saleId
                ? { ...order, status: 'pending', saleId: undefined }
                : order),
              products: current.products.map((product) => ({
                ...product,
                stock: product.stock + (restoredQuantities.get(product.id) ?? 0),
              })),
            };
          }),
        },
      ],
    );
  };

  const saveOrder = () => {
    const customerName = orderCustomerName.trim();
    const phone = orderPhone.trim();
    const deliveryDate = parseDeliveryDate(orderDeliveryDate);
    const hasAlertDays = orderAlertDays.trim() !== '';
    const alertDays = hasAlertDays ? Number(orderAlertDays) : undefined;
    const items = data.products
      .filter((product) => (orderCart[product.id] ?? 0) > 0)
      .map((product) => {
        const quantity = orderCart[product.id];
        return {
          product,
          quantity,
          unitPrice: priceFor(product),
          lineDiscount: parseAmount(orderCartDiscounts[product.id] ?? ''),
          commissionEmployee: product.makerEmployee,
          commissionPercent: product.commissionPercent ?? 0,
        };
      });

    if (!customerName || !phone || !deliveryDate) {
      Alert.alert('Confira os dados do pedido', 'Informe o nome, o telefone do cliente e uma data válida para a entrega.');
      return;
    }
    if (dateDifferenceInDays(today, deliveryDate) < 0) {
      Alert.alert('Data de entrega inválida', 'A data de entrega deve ser hoje ou uma data futura.');
      return;
    }
    if (hasAlertDays && (!Number.isInteger(alertDays) || (alertDays ?? -1) < 0)) {
      Alert.alert('Prazo de alerta inválido', 'Informe uma quantidade de dias inteira igual ou maior que zero, ou deixe o campo vazio.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Pedido sem produtos', 'Selecione ao menos um produto para registrar o pedido.');
      return;
    }
    const invalidDiscount = items.find((item) =>
      item.lineDiscount < 0 || item.lineDiscount > item.unitPrice * item.quantity,
    );
    if (invalidDiscount) {
      Alert.alert(
        'Desconto inválido',
        `O desconto de ${invalidDiscount.product.name} não pode ser maior que o total da linha (${money(invalidDiscount.unitPrice * invalidDiscount.quantity)}).`,
      );
      return;
    }

    const lineTotal = (item: typeof items[number]) =>
      Math.max(0, item.unitPrice * item.quantity - item.lineDiscount);
    const total = items.reduce((sum, item) => sum + lineTotal(item), 0);
    const savings = items.reduce((sum, item) =>
      sum + item.product.price * item.quantity - lineTotal(item),
    0);

    const order: CustomerOrder = {
      id: `r${today}-${data.orders.length + 1}`,
      customerName,
      phone,
      createdDate: today,
      deliveryDate,
      ...(alertDays !== undefined ? { alertDays } : {}),
      items: items.map(({ product, quantity, unitPrice, lineDiscount }) => {
        const commissionPercent = product.commissionPercent ?? 0;
        const commissionAmount = calculateCommissionAmount(
          Math.max(0, unitPrice * quantity - lineDiscount),
          commissionPercent,
        );
        return {
          productId: product.id,
          name: product.name,
          quantity,
          unitPrice,
          ...(lineDiscount > 0 ? { lineDiscount } : {}),
          ...(product.makerEmployee && commissionPercent > 0
            ? {
              commissionEmployee: product.makerEmployee,
              commissionPercent,
              commissionAmount,
            }
            : {}),
        };
      }),
      total,
      savings,
      status: 'pending',
    };
    setData((current) => ({ ...current, orders: [order, ...current.orders] }));
    closeForm();
  };

  const markOrderDelivered = (orderId: string) => {
    const order = data.orders.find((item) => item.id === orderId);
    if (!order || order.status !== 'pending') return;
    const insufficient = order.items.find((item) => {
      const product = data.products.find((candidate) => candidate.id === item.productId);
      return product && product.stock < item.quantity;
    });
    if (insufficient) {
      const product = data.products.find((item) => item.id === insufficient.productId);
      Alert.alert(
        'Estoque insuficiente',
        `${product?.name ?? insufficient.name}: estoque disponível ${product?.stock ?? 0}, quantidade do pedido ${insufficient.quantity}. Reponha o estoque antes de marcar como entregue.`,
      );
      return;
    }
    const saleId = `order-sale-${order.id}`;
    const sale: Sale = {
      id: saleId,
      date: today,
      items: order.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        ...(item.lineDiscount ? { lineDiscount: item.lineDiscount } : {}),
        ...(item.commissionEmployee ? { commissionEmployee: item.commissionEmployee } : {}),
        ...(item.commissionPercent !== undefined ? { commissionPercent: item.commissionPercent } : {}),
        ...(item.commissionAmount !== undefined ? { commissionAmount: item.commissionAmount } : {}),
      })),
      total: order.total,
      savings: order.savings,
    };
    setData((current) => {
      const currentOrder = current.orders.find((item) => item.id === orderId);
      if (!currentOrder || currentOrder.status !== 'pending') return current;
      return {
        ...current,
        orders: current.orders.map((item) =>
          item.id === orderId ? { ...item, status: 'delivered', saleId } : item,
        ),
        sales: [sale, ...current.sales],
        products: current.products.map((product) => {
          const item = order.items.find((orderItem) => orderItem.productId === product.id);
          return item ? { ...product, stock: product.stock - item.quantity } : product;
        }),
      };
    });
    setMonth(new Date());
  };

  const undoOrderDelivery = (orderId: string) => {
    const order = data.orders.find((item) => item.id === orderId);
    if (!order || order.status !== 'delivered') return;
    const linkedSale = data.sales.find((sale) => sale.id === order.saleId);
    if (linkedSale?.items.some((item) => item.commissionPaidDate)) {
      Alert.alert(
        'Não é possível desfazer a entrega',
        'Já existe uma comissão marcada como paga neste pedido. A entrega não pode ser desfeita para preservar o histórico financeiro.',
      );
      return;
    }
    setData((current) => {
      const currentOrder = current.orders.find((item) => item.id === orderId);
      if (!currentOrder || currentOrder.status !== 'delivered') return current;
      const restoredQuantities = new Map<string, number>();
      if (currentOrder.saleId) {
        currentOrder.items.forEach((item) => {
          restoredQuantities.set(
            item.productId,
            (restoredQuantities.get(item.productId) ?? 0) + item.quantity,
          );
        });
      }
      const pendingOrder = { ...currentOrder, status: 'pending' as const, saleId: undefined };
      return {
        ...current,
        orders: current.orders.map((item) => item.id === orderId ? pendingOrder : item),
        sales: currentOrder.saleId
          ? current.sales.filter((saleItem) => saleItem.id !== currentOrder.saleId)
          : current.sales,
        products: currentOrder.saleId
          ? current.products.map((product) => ({
            ...product,
            stock: product.stock + (restoredQuantities.get(product.id) ?? 0),
          }))
          : current.products,
      };
    });
    setMonth(new Date());
  };

  const markCommissionPaid = (saleId: string, itemIndex: number) => {
    const paidDate = localDateKey(new Date());
    setData((current) => ({
      ...current,
      sales: current.sales.map((sale) => sale.id !== saleId
        ? sale
        : {
          ...sale,
          items: sale.items.map((item, index) =>
            index === itemIndex
              && item.commissionEmployee
              && (item.commissionAmount ?? 0) > 0
              && !item.commissionPaidDate
              ? { ...item, commissionPaidDate: paidDate }
              : item,
          ),
        }),
    }));
  };

  const undoCommissionPayment = (saleId: string, itemIndex: number) => {
    Alert.alert(
        'Desfazer pagamento?',
        'A comissão voltará para pendente e a venda poderá ser editada novamente.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desfazer pagamento',
            style: 'destructive',
            onPress: () => setData((current) => ({
              ...current,
              sales: current.sales.map((sale) => sale.id !== saleId
                ? sale
                : {
                  ...sale,
                  items: sale.items.map((item, index) =>
                    index === itemIndex && item.commissionPaidDate
                      ? { ...item, commissionPaidDate: undefined }
                      : item,
                  ),
                }),
            })),
          },
        ],
    );
  };

  const saveExpense = () => {
    const amount = parseAmount(expenseAmount);
    if (!expenseName.trim() || amount <= 0) {
      Alert.alert('Confira os dados', 'Informe a descrição e um valor maior que zero.');
      return;
    }
    const previousExpense = editingExpenseId
      ? data.expenses.find((expense) => expense.id === editingExpenseId)
      : undefined;
    if (editingExpenseId && !previousExpense) {
      Alert.alert('Gasto não encontrado', 'Atualize a lista e tente novamente.');
      return;
    }
    const expense: Expense = {
      id: previousExpense?.id ?? `e${Date.now()}`,
      date: previousExpense?.date ?? localDateKey(new Date()),
      description: expenseName.trim(),
      category: expenseCategory,
      amount,
    };
    setData((current) => ({
      ...current,
      expenses: previousExpense
        ? current.expenses.map((item) => item.id === expense.id ? expense : item)
        : [expense, ...current.expenses],
    }));
    if (!previousExpense) setMonth(new Date());
    closeForm();
  };

  const openExpenseForEditing = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setExpenseName(expense.description);
    setExpenseCategory(expense.category);
    setExpenseAmount(String(expense.amount));
    setForm('expense');
  };

  const deleteExpense = (expenseId: string) => {
    const expense = data.expenses.find((item) => item.id === expenseId);
    if (!expense) return;
    Alert.alert(
      'Excluir gasto?',
      `O registro "${expense.description}" será removido permanentemente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => setData((current) => ({
            ...current,
            expenses: current.expenses.filter((item) => item.id !== expenseId),
          })),
        },
      ],
    );
  };

  const saveSupply = () => {
    const quantity = Number.parseInt(supplyQuantity, 10);
    const dailyUse = Number.parseInt(supplyDailyUse, 10);
    if (!supplyName.trim() || !Number.isInteger(quantity) || quantity < 0 || !Number.isInteger(dailyUse) || dailyUse < 1) {
      Alert.alert('Confira os dados', 'Informe o nome, uma quantidade igual ou maior que zero e o consumo diário em unidades inteiras.');
      return;
    }
    const supply: Supply = {
      id: `i${Date.now()}`,
      name: supplyName.trim(),
      category: supplyCategory,
      quantity,
      dailyUse,
      registeredDate: localDateKey(new Date()),
    };
    setData((current) => ({ ...current, supplies: [supply, ...current.supplies] }));
    closeForm();
  };

  const changeSupplyStock = (supplyId: string, adjustment: number) => {
    setData((current) => ({
      ...current,
      supplies: current.supplies.map((supply) => {
        if (supply.id !== supplyId) return supply;
        const today = localDateKey(new Date());
        const quantity = availableSupplyQuantity(supply, today);
        return {
          ...supply,
          quantity: Math.max(0, quantity + adjustment),
          registeredDate: today,
        };
      }),
    }));
  };

  const saveOffer = () => {
    const value = parseAmount(discountValue);
    const product = data.products.find((item) => item.id === offerProductId);
    if (!product || !offerName.trim() || value <= 0 || (discountType === 'percent' && value > 100)) {
      Alert.alert('Confira a oferta', 'Escolha um produto, informe o nome e um desconto válido (até 100%).');
      return;
    }
    const offer: Offer = {
      id: `o${Date.now()}`,
      productId: product.id,
      name: offerName.trim(),
      discountType,
      value,
      active: true,
    };
    setData((current) => ({
      ...current,
      offers: [...current.offers.filter((item) => item.productId !== product.id), offer],
    }));
    closeForm();
  };

  const changeStock = (productId: string, adjustment: number) => {
    setData((current) => ({
      ...current,
      products: current.products.map((product) =>
        product.id === productId ? { ...product, stock: Math.max(0, product.stock + adjustment) } : product,
      ),
    }));
  };

  const deleteProduct = (productId: string) => {
    const product = data.products.find((item) => item.id === productId);
    if (!product) return;
    Alert.alert(
      'Excluir produto?',
      `${product.name} será removido do catálogo. O histórico de vendas será mantido.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => setData((current) => ({
            ...current,
            products: current.products.filter((item) => item.id !== productId),
            offers: current.offers.filter((offer) => offer.productId !== productId),
          })),
        },
      ],
    );
  };

  const toggleOffer = (offerId: string) => {
    setData((current) => ({
      ...current,
      offers: current.offers.map((offer) => (offer.id === offerId ? { ...offer, active: !offer.active } : offer)),
    }));
  };

  const changeMonth = (adjustment: number) =>
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + adjustment, 1));

  const tabItems: { key: Tab; icon: string; label: string }[] = [
    { key: 'home', icon: '⌂', label: 'Início' },
    { key: 'products', icon: '▦', label: 'Produtos' },
    { key: 'sales', icon: '↗', label: 'Vendas' },
    { key: 'commissions', icon: '%', label: 'Comissões' },
    { key: 'orders', icon: '▣', label: 'Pedidos' },
    { key: 'supplies', icon: '▤', label: 'Insumos' },
    { key: 'alerts', icon: '!', label: 'Alertas' },
    { key: 'management', icon: '☷', label: 'Gestão' },
  ];

  const renderCompanySetup = () => (
    <ScrollView
      style={styles.setupScreen}
      contentContainerStyle={styles.setupContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.setupBrand}>
        <View style={styles.brandMark}><Text style={styles.brandMarkText}>t.</Text></View>
        <View>
          <Text style={styles.brandName}>trama</Text>
          <Text style={styles.brandCaption}>gestão do seu negócio</Text>
        </View>
      </View>
      <Text style={styles.setupEyebrow}>SEU ESPAÇO, DO SEU JEITO</Text>
      <Text style={styles.setupTitle}>{editingCompany ? 'Perfil da empresa' : 'Vamos cadastrar sua empresa'}</Text>
      <Text style={styles.setupDescription}>Conte um pouco sobre seu estabelecimento para personalizar o aplicativo.</Text>

      <View style={styles.setupSection}>
        <Text style={styles.fieldLabel}>Qual é o tipo do estabelecimento?</Text>
        <View style={styles.businessTypeGrid}>
          {BUSINESS_TYPES.map((type) => (
            <Pressable
              key={type}
              onPress={() => setBusinessType(type)}
              style={[styles.businessTypeChip, businessType === type && styles.choiceChipSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected: businessType === type }}
            >
              <Text style={[styles.choiceText, businessType === type && styles.choiceTextSelected]}>{type}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {businessType === 'Outro' ? (
        <View style={styles.setupSection}>
          <Text style={styles.fieldLabel}>Qual é o ramo?</Text>
          <TextInput
            value={customBusinessType}
            onChangeText={setCustomBusinessType}
            placeholder="Digite o tipo de estabelecimento"
            placeholderTextColor={palette.muted}
            style={styles.fieldInput}
            maxLength={50}
          />
        </View>
      ) : null}

      <View style={styles.setupSection}>
        <Text style={styles.fieldLabel}>Nome do estabelecimento</Text>
        <TextInput
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="Ex.: Ateliê Linha & Barro"
          placeholderTextColor={palette.muted}
          style={styles.fieldInput}
          maxLength={60}
          returnKeyType="next"
        />
      </View>

      <View style={styles.setupSection}>
        <Text style={styles.fieldLabel}>Cor principal do aplicativo</Text>
        <Text style={styles.fieldHint}>Vamos criar tons combinando e aplicar a paleta em toda a interface.</Text>
        <View style={styles.colorChoiceGrid}>
          {BASE_COLORS.map((color) => (
            <Pressable
              key={color.name}
              onPress={() => setSelectedColor(color.value)}
              style={[
                styles.colorChoice,
                { borderColor: selectedColor === color.value ? palette.green : palette.border },
                selectedColor === color.value && styles.colorChoiceSelected,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Selecionar cor ${color.name}`}
              accessibilityState={{ selected: selectedColor === color.value }}
            >
              <View style={[styles.colorSwatch, { backgroundColor: color.value }]} />
              <Text style={[styles.colorChoiceText, selectedColor === color.value && styles.choiceTextSelected]}>{color.name}</Text>
              {selectedColor === color.value ? <Text style={styles.colorCheck}>✓</Text> : null}
            </Pressable>
          ))}
        </View>
        <View style={styles.palettePreview}>
          <Text style={styles.palettePreviewLabel}>SUA PALETA</Text>
          <View style={styles.palettePreviewSwatches}>
            {[palette.green, palette.accentDeep, palette.paleGreen, palette.orange, palette.paleOrange].map((color, index) => (
              <View key={`${color}-${index}`} style={[styles.palettePreviewSwatch, { backgroundColor: color }]} />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.setupSection}>
        <Text style={styles.fieldLabel}>Funcionários <Text style={styles.optionalLabel}>(opcional)</Text></Text>
        <Text style={styles.fieldHint}>Você poderá selecionar quem realizou cada venda.</Text>
        <View style={styles.employeeEntry}>
          <TextInput
            value={employeeDraft}
            onChangeText={setEmployeeDraft}
            placeholder="Nome do funcionário"
            placeholderTextColor={palette.muted}
            style={[styles.fieldInput, styles.employeeInput]}
            maxLength={50}
            returnKeyType="done"
            onSubmitEditing={addEmployee}
          />
          <Pressable onPress={addEmployee} style={styles.addEmployeeButton} accessibilityRole="button" accessibilityLabel="Adicionar funcionário">
            <Text style={styles.addEmployeeText}>+</Text>
          </Pressable>
        </View>
        <View style={styles.employeeChipList}>
          {employees.map((employee) => (
            <Pressable
              key={employee}
              onPress={() => setEmployees((current) => current.filter((name) => name !== employee))}
              style={styles.employeeChip}
              accessibilityRole="button"
              accessibilityLabel={`Remover ${employee}`}
            >
              <Text style={styles.employeeChipText}>{employee}  ×</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.fieldHint}>Já usa o Trama? Importe um backup JSON com seus dados e fotos.</Text>
      <ActionButton
        label={backupBusy ? 'Processando backup...' : 'Importar backup'}
        onPress={importBackup}
        compact
      />
      <ActionButton label={editingCompany ? 'Salvar alterações' : 'Começar a usar o Trama'} onPress={saveCompanyProfile} />
      {editingCompany ? (
        <Pressable onPress={() => setEditingCompany(false)} style={styles.cancelEditButton} accessibilityRole="button">
          <Text style={styles.cancelEditText}>Cancelar</Text>
        </Pressable>
      ) : null}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  const renderHeader = () => (
    <View style={styles.topBar}>
      <View style={styles.brandLockup}>
        <View style={styles.brandMark}><Text style={styles.brandMarkText}>t.</Text></View>
        <View>
          <Text style={styles.brandName} numberOfLines={1}>{data.company?.name ?? 'trama'}</Text>
          <Text style={styles.brandCaption} numberOfLines={1}>{data.company?.customBusinessType ?? data.company?.businessType ?? 'feito com cuidado'}</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Configurações"
        onPress={() => setTab('settings')}
        style={styles.notificationButton}
      >
        <Text style={styles.notificationIcon}>⚙</Text>
      </Pressable>
    </View>
  );

  const renderHome = () => (
    <>
      <Text style={styles.eyebrow}>
        {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).toUpperCase()}
      </Text>
      <Text style={styles.greeting}>Oi, {data.company?.name ?? 'seu negócio'} <Text style={styles.greetingAccent}>✦</Text></Text>
      <Text style={styles.introCopy}>Veja o resumo do seu negócio hoje.</Text>

      <View style={styles.revenueCard}>
        <View style={styles.revenueHeader}>
          <Text style={styles.revenueLabel}>VENDAS DO MÊS</Text>
          <View style={styles.trendBadge}>
            <Text style={styles.trendText}>
              {revenueTrend === null ? 'MÊS ATUAL' : `${revenueTrend >= 0 ? '↑' : '↓'} ${Math.abs(revenueTrend)}%`}
            </Text>
          </View>
        </View>
        <Text style={styles.revenueValue}>{money(monthRevenue)}</Text>
        <View style={styles.revenueFooter}>
          <Text style={styles.revenueFootnote}>{monthSales.length} vendas realizadas</Text>
          <Text style={styles.revenueFootnote}>{monthLabel}</Text>
        </View>
        <View style={styles.sparkline}>
          {revenueBars.map((value, index) => (
            <View
              key={index}
              style={[
                styles.sparkBar,
                { height: `${value === 0 ? 12 : Math.max(18, (value / maxRevenueBar) * 100)}%` },
                index === revenueBars.length - 1 && styles.sparkBarActive,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.metricRow}>
        <View style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: palette.paleOrange }]}><Text>◒</Text></View>
          <Text style={styles.metricLabel}>Gastos com materiais</Text>
          <Text style={styles.metricValue}>{money(monthSpent)}</Text>
          <Text style={styles.metricHint}>neste mês</Text>
        </View>
        <View style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: palette.paleGreen }]}><Text>▦</Text></View>
          <Text style={styles.metricLabel}>Produtos ativos</Text>
          <Text style={styles.metricValue}>{data.products.length}</Text>
          <Text style={styles.metricHint}>no seu catálogo</Text>
        </View>
      </View>

      {lowStockProducts.length > 0 ? (
        <Pressable style={styles.stockAlert} onPress={() => setTab('products')}>
          <View style={styles.alertIcon}><Text style={styles.alertIconText}>!</Text></View>
          <View style={styles.alertCopy}>
            <Text style={styles.alertTitle}>Estoque pedindo atenção</Text>
            <Text style={styles.alertText}>{lowStockProducts.length} produto(s) no limite ou abaixo do mínimo</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ) : null}

      {lowStockSupplies.length > 0 ? (
        <Pressable style={styles.stockAlert} onPress={() => setTab('supplies')}>
          <View style={styles.alertIcon}><Text style={styles.alertIconText}>!</Text></View>
          <View style={styles.alertCopy}>
            <Text style={styles.alertTitle}>Insumos com estoque baixo</Text>
            <Text style={styles.alertText}>{lowStockSupplies.length} insumo(s) com menos de 2 unidades</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ) : null}

      {alertingOrders.length > 0 ? (
        <Pressable style={styles.stockAlert} onPress={() => setTab('orders')}>
          <View style={styles.alertIcon}><Text style={styles.alertIconText}>!</Text></View>
          <View style={styles.alertCopy}>
            <Text style={styles.alertTitle}>Entrega de pedidos se aproximando</Text>
            <Text style={styles.alertText}>{alertingOrders.length} pedido(s) dentro do prazo de alerta</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ) : null}

      <SectionTitle title="Acesso rápido" />
      <View style={styles.quickActions}>
        <Pressable style={styles.quickAction} onPress={() => { setTab('sales'); openForm('sale'); }}>
          <Text style={styles.quickIcon}>＋</Text><Text style={styles.quickLabel}>Nova venda</Text>
        </Pressable>
        <Pressable style={styles.quickAction} onPress={() => { setTab('products'); openForm('product'); }}>
          <Text style={styles.quickIcon}>▦</Text><Text style={styles.quickLabel}>Novo produto</Text>
        </Pressable>
        <Pressable style={styles.quickAction} onPress={() => { setTab('management'); openForm('expense'); }}>
          <Text style={styles.quickIcon}>↙</Text><Text style={styles.quickLabel}>Anotar gasto</Text>
        </Pressable>
      </View>

      <SectionTitle title="Vendas recentes" action="Ver todas" onPress={() => setTab('sales')} />
      <View style={styles.listCard}>
        {data.sales.slice(0, 3).map((sale, index) => (
          <View key={sale.id} style={[styles.recentSale, index > 0 && styles.rowDivider]}>
            <View style={styles.saleIcon}><Text style={styles.saleIconText}>↗</Text></View>
            <View style={styles.recentSaleCopy}>
              <Text style={styles.recentSaleName}>{sale.items.map((item) => item.name).join(', ')}</Text>
              <Text style={styles.recentSaleDate}>
                {formatDate(sale.date)} · {sale.items.reduce((sum, item) => sum + item.quantity, 0)} item(ns)
                {sale.employeeName ? ` · ${sale.employeeName}` : ''}
              </Text>
            </View>
            <Text style={styles.recentSaleAmount}>{money(sale.total)}</Text>
          </View>
        ))}
        {data.sales.length === 0 ? <Text style={styles.emptyText}>Suas vendas registradas aparecem aqui.</Text> : null}
      </View>
      <View style={styles.bottomSpacer} />
    </>
  );

  const renderSales = () => (
    <>
      <Text style={styles.pageEyebrow}>MOVIMENTO DO NEGÓCIO</Text>
      <View style={styles.pageHeadingRow}>
        <View><Text style={styles.pageTitle}>Vendas</Text><Text style={styles.pageSubtitle}>Registre vendas e acompanhe resultados</Text></View>
        <ActionButton label="+ Nova venda" onPress={() => openForm('sale')} compact />
      </View>
      <View style={styles.monthSelector}>
        <Pressable onPress={() => changeMonth(-1)} style={styles.monthArrow}><Text style={styles.monthArrowText}>‹</Text></Pressable>
        <Text style={styles.monthSelectorLabel}>{monthLabel}</Text>
        <Pressable onPress={() => changeMonth(1)} style={styles.monthArrow}><Text style={styles.monthArrowText}>›</Text></Pressable>
      </View>
      {salesEmployeeOptions.length > 0 ? (
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Filtrar por vendedor</Text>
          <View style={styles.choiceRow}>
            <Pressable
              onPress={() => setSalesEmployeeFilter(null)}
              style={[styles.choiceChip, activeSalesEmployeeFilter === null && styles.choiceChipSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected: activeSalesEmployeeFilter === null }}
            >
              <Text style={[styles.choiceText, activeSalesEmployeeFilter === null && styles.choiceTextSelected]}>Todos</Text>
            </Pressable>
            {salesEmployeeOptions.map((employee) => {
              const selected = activeSalesEmployeeFilter?.includes(employee) ?? false;
              return (
                <Pressable
                  key={employee}
                  onPress={() => setSalesEmployeeFilter((current) => {
                    const availableSelection = current?.filter((name) =>
                      salesEmployeeOptions.includes(name),
                    ) ?? null;
                    const normalizedSelection = current
                      && current.length > 0
                      && availableSelection?.length === 0
                      ? null
                      : availableSelection;
                    if (normalizedSelection === null) return [employee];
                    const next = normalizedSelection.includes(employee)
                      ? normalizedSelection.filter((name) => name !== employee)
                      : [...normalizedSelection, employee];
                    return next.length === salesEmployeeOptions.length ? null : next;
                  })}
                  style={[styles.choiceChip, selected && styles.choiceChipSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{employee}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : (
        <Text style={styles.fieldHint}>Nenhum funcionário cadastrado; exibindo todas as vendas.</Text>
      )}
      <View style={styles.salesSummary}>
        <View style={styles.salesSummaryCell}><Text style={styles.summaryLabel}>FATURAMENTO</Text><Text style={styles.summaryValue}>{money(reportRevenue)}</Text></View>
        <View style={styles.summarySeparator} />
        <View style={styles.salesSummaryCell}><Text style={styles.summaryLabel}>VENDAS</Text><Text style={styles.summaryValue}>{reportSales.length}</Text></View>
      </View>
      <SectionTitle title="Histórico" />
      <View style={styles.listCard}>
        {reportSales.map((sale, index) => (
          <View key={sale.id} style={[styles.saleHistoryEntry, index > 0 && styles.rowDivider]}>
            <View style={styles.saleHistoryRow}>
              <View style={styles.saleIcon}><Text style={styles.saleIconText}>↗</Text></View>
              <View style={styles.recentSaleCopy}>
                <Text style={styles.recentSaleName}>{sale.items.map((item) => item.name).join(', ')}</Text>
                <Text style={styles.recentSaleDate}>
                  {formatDate(sale.date)} · {sale.items.reduce((sum, item) => sum + item.quantity, 0)} item(ns)
                  {sale.employeeName ? ` · ${sale.employeeName}` : ''}
                </Text>
                {sale.savings > 0 ? <Text style={styles.savingsText}>Desconto de {money(sale.savings)}</Text> : null}
              </View>
              <Text style={styles.recentSaleAmount}>{money(sale.total)}</Text>
            </View>
            <View style={styles.saleActionsRow}>
              <Pressable
                onPress={() => openSaleForEditing(sale)}
                style={styles.saleActionButton}
                accessibilityRole="button"
                accessibilityLabel="Editar venda"
              >
                <Text style={styles.saleActionText}>Editar</Text>
              </Pressable>
              <Pressable
                onPress={() => deleteSale(sale.id)}
                style={[styles.saleActionButton, styles.saleActionDanger]}
                accessibilityRole="button"
                accessibilityLabel="Excluir venda e devolver itens ao estoque"
              >
                <Text style={[styles.saleActionText, styles.saleActionDangerText]}>Excluir</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {reportSales.length === 0 ? <Text style={styles.emptyText}>Nenhuma venda para os vendedores selecionados neste mês.</Text> : null}
      </View>
      <View style={styles.bottomSpacer} />
    </>
  );

  const renderOrders = () => (
    <>
      <Text style={styles.pageEyebrow}>ACOMPANHAMENTO DE ENTREGAS</Text>
      <View style={styles.pageHeadingRow}>
        <View>
          <Text style={styles.pageTitle}>Pedidos</Text>
          <Text style={styles.pageSubtitle}>{pendingOrders.length} pendentes · {data.orders.length} cadastrados</Text>
        </View>
        <ActionButton label="+ Novo pedido" onPress={() => openForm('order')} compact />
      </View>
      {alertingOrders.length > 0 ? (
        <View style={styles.inventoryNotice}>
          <Text style={styles.inventoryNoticeIcon}>!</Text>
          <Text style={styles.inventoryNoticeText}>{alertingOrders.length} pedido(s) dentro do prazo de alerta</Text>
        </View>
      ) : null}
      <View style={styles.listCard}>
        {data.orders.map((order, index) => {
          const daysUntilDelivery = dateDifferenceInDays(today, order.deliveryDate);
          const shouldAlert = order.status === 'pending'
            && order.alertDays !== undefined
            && daysUntilDelivery <= order.alertDays;
          return (
            <View key={order.id} style={[styles.orderCard, index > 0 && styles.rowDivider]}>
              <View style={styles.orderHeader}>
                <View style={styles.orderCustomerCopy}>
                  <Text style={styles.recentSaleName}>{order.customerName}</Text>
                  <Text style={styles.recentSaleDate}>{order.phone}</Text>
                </View>
                <Text style={[styles.orderStatus, order.status === 'delivered' && styles.orderStatusDelivered]}>
                  {order.status === 'delivered' ? 'Entregue' : 'Pendente'}
                </Text>
              </View>
              <Text style={styles.orderItems}>
                {order.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}
              </Text>
              <Text style={styles.orderDeliveryDate}>Entrega: {formatLongDate(order.deliveryDate)}</Text>
              <Text style={[styles.orderCountdown, (shouldAlert || daysUntilDelivery < 0) && styles.stockLabelLow]}>
                {deliveryCountdown(daysUntilDelivery)}
              </Text>
              {order.alertDays !== undefined ? (
                <Text style={styles.orderAlertSetting}>Alertar {order.alertDays} dia(s) antes</Text>
              ) : null}
              <View style={styles.orderTotalRow}>
                <Text style={styles.orderTotalLabel}>Total do pedido</Text>
                <Text style={styles.orderTotalValue}>{money(order.total)}</Text>
              </View>
              {order.status === 'pending' ? (
                <Pressable
                  style={styles.orderCompleteButton}
                  onPress={() => markOrderDelivered(order.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Marcar pedido de ${order.customerName} como entregue`}
                >
                  <Text style={styles.orderCompleteText}>Marcar como entregue</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.orderUndoButton}
                  onPress={() => undoOrderDelivery(order.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Desfazer entrega do pedido de ${order.customerName}`}
                >
                  <Text style={styles.orderUndoText}>Desfazer entrega</Text>
                </Pressable>
              )}
            </View>
          );
        })}
        {data.orders.length === 0 ? <Text style={styles.emptyText}>Nenhum pedido cadastrado. Crie um pedido para acompanhar uma entrega.</Text> : null}
      </View>
      <View style={styles.bottomSpacer} />
    </>
  );

  const renderSupplies = () => (
    <>
      <Text style={styles.pageEyebrow}>MATERIAIS DO NEGÓCIO</Text>
      <View style={styles.pageHeadingRow}>
        <View>
          <Text style={styles.pageTitle}>Insumos</Text>
          <Text style={styles.pageSubtitle}>{data.supplies.length} insumos cadastrados</Text>
        </View>
        <ActionButton label="+ Cadastrar" onPress={() => openForm('supply')} compact />
      </View>
      <Text style={styles.formIntro}>Acompanhe a quantidade disponível e a duração estimada pelo consumo diário.</Text>
      {lowStockSupplies.length > 0 ? (
        <View style={styles.inventoryNotice}>
          <Text style={styles.inventoryNoticeIcon}>!</Text>
          <Text style={styles.inventoryNoticeText}>{lowStockSupplies.length} insumo(s) com menos de 2 unidades</Text>
        </View>
      ) : null}
      <View style={styles.listCard}>
        {suppliesWithStock.map(({ supply, quantity }, index) => {
          const low = quantity < 2;
          const daysRemaining = supplyDaysRemaining(supply.dailyUse, quantity);
          return (
            <View key={supply.id} style={[styles.supplyRow, index > 0 && styles.rowDivider]}>
              <View style={styles.supplyIcon}><Text style={styles.supplyIconText}>▤</Text></View>
              <View style={styles.recentSaleCopy}>
                <Text style={styles.productCategory}>{(supply.category ?? 'Sem categoria').toUpperCase()}</Text>
                <Text style={styles.recentSaleName}>{supply.name}</Text>
                <Text style={[styles.recentSaleDate, low && styles.stockLabelLow]}>
                  {quantity} unidade(s) · {daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
                </Text>
                <Text style={styles.supplyConsumption}>{supply.dailyUse} unidade(s) por dia</Text>
              </View>
              <View style={styles.quantityStepper}>
                <Pressable
                  style={[styles.stepButton, quantity === 0 && styles.stepButtonDisabled]}
                  onPress={() => changeSupplyStock(supply.id, -1)}
                  disabled={quantity === 0}
                  accessibilityRole="button"
                  accessibilityLabel={`Remover uma unidade de ${supply.name}`}
                >
                  <Text style={styles.stepText}>−</Text>
                </Pressable>
                <Text style={[styles.stockCount, low && styles.stockCountLow]}>{quantity}</Text>
                <Pressable
                  style={styles.stepButton}
                  onPress={() => changeSupplyStock(supply.id, 1)}
                  accessibilityRole="button"
                  accessibilityLabel={`Adicionar uma unidade de ${supply.name}`}
                >
                  <Text style={styles.stepText}>+</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
        {data.supplies.length === 0 ? <Text style={styles.emptyText}>Cadastre insumos para acompanhar quantidades e duração.</Text> : null}
      </View>
      <View style={styles.bottomSpacer} />
    </>
  );

  const renderManagement = () => (
    <>
      <Text style={styles.pageEyebrow}>VISÃO DO NEGÓCIO</Text>
      <View style={styles.pageHeadingRow}>
        <View><Text style={styles.pageTitle}>Gestão</Text><Text style={styles.pageSubtitle}>Entradas, materiais e ofertas</Text></View>
        <Pressable onPress={editCompanyProfile} style={styles.profileEditButton} accessibilityRole="button">
          <Text style={styles.profileEditText}>Empresa</Text>
        </Pressable>
      </View>
      <View style={styles.monthSelector}>
        <Pressable onPress={() => changeMonth(-1)} style={styles.monthArrow}><Text style={styles.monthArrowText}>‹</Text></Pressable>
        <Text style={styles.monthSelectorLabel}>{monthLabel}</Text>
        <Pressable onPress={() => changeMonth(1)} style={styles.monthArrow}><Text style={styles.monthArrowText}>›</Text></Pressable>
      </View>
      <View style={styles.financeCard}>
        <Text style={styles.financeEyebrow}>RESUMO DO MÊS</Text>
        <View style={styles.financeLine}><Text style={styles.financeLabel}>Vendas</Text><Text style={styles.financeIncome}>+ {money(monthRevenue)}</Text></View>
        <View style={styles.financeLine}><Text style={styles.financeLabel}>Materiais e compras</Text><Text style={styles.financeExpense}>− {money(monthSpent)}</Text></View>
        <View style={styles.financeRule} />
        <View style={styles.financeLine}><Text style={styles.financeTotalLabel}>Saldo parcial</Text><Text style={styles.financeTotal}>{money(monthRevenue - monthSpent)}</Text></View>
      </View>
      <View style={styles.managementActions}>
        <ActionButton label="+ Registrar gasto" onPress={() => openForm('expense')} secondary />
        <ActionButton label="+ Criar oferta" onPress={() => openForm('offer')} secondary />
      </View>
      <SectionTitle title="Backup e restauração" />
      <View style={styles.managementActions}>
        <ActionButton
          label={backupBusy ? 'Processando...' : 'Exportar backup'}
          onPress={() => void exportBackup()}
          secondary
          compact
        />
        <ActionButton
          label={backupBusy ? 'Processando...' : 'Importar backup'}
          onPress={importBackup}
          secondary
          compact
        />
      </View>
      <Text style={styles.fieldHint}>O backup inclui os registros e as fotos dos produtos.</Text>
      <SectionTitle title="Gastos com materiais" action="Adicionar" onPress={() => openForm('expense')} />
      <View style={styles.listCard}>
        {monthExpenses.map((expense, index) => (
          <View key={expense.id} style={[styles.expenseEntry, index > 0 && styles.rowDivider]}>
            <View style={styles.expenseRow}>
              <View style={styles.expenseIcon}><Text style={styles.expenseIconText}>↙</Text></View>
              <View style={styles.recentSaleCopy}>
                <Text style={styles.recentSaleName}>{expense.description}</Text>
                <Text style={styles.recentSaleDate}>{expense.category} · {formatDate(expense.date)}</Text>
              </View>
              <Text style={styles.expenseAmount}>− {money(expense.amount)}</Text>
            </View>
            <View style={styles.saleActionsRow}>
              <Pressable
                onPress={() => openExpenseForEditing(expense)}
                style={styles.saleActionButton}
                accessibilityRole="button"
                accessibilityLabel={`Editar gasto ${expense.description}`}
              >
                <Text style={styles.saleActionText}>Editar</Text>
              </Pressable>
              <Pressable
                onPress={() => deleteExpense(expense.id)}
                style={[styles.saleActionButton, styles.saleActionDanger]}
                accessibilityRole="button"
                accessibilityLabel={`Excluir gasto ${expense.description}`}
              >
                <Text style={[styles.saleActionText, styles.saleActionDangerText]}>Excluir</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {monthExpenses.length === 0 ? <Text style={styles.emptyText}>Nenhum gasto registrado neste mês.</Text> : null}
      </View>
      <SectionTitle title="Ofertas e promoções" action="Criar oferta" onPress={() => openForm('offer')} />
      <View style={styles.listCard}>
        {data.offers.map((offer, index) => {
          const product = data.products.find((item) => item.id === offer.productId);
          if (!product) return null;
          return (
            <View key={offer.id} style={[styles.offerRow, index > 0 && styles.rowDivider]}>
              <ProductPicture product={product} />
              <View style={styles.recentSaleCopy}>
                <Text style={styles.recentSaleName}>{offer.name}</Text>
                <Text style={styles.recentSaleDate}>
                  {product.name} · {offer.discountType === 'percent' ? `${offer.value}% de desconto` : `${money(offer.value)} de desconto`} · {offer.active ? 'Ativa' : 'Pausada'}
                </Text>
              </View>
              <Pressable onPress={() => toggleOffer(offer.id)} style={styles.pauseOffer} accessibilityRole="button">
                <Text style={styles.pauseOfferText}>{offer.active ? 'Pausar' : 'Ativar'}</Text>
              </Pressable>
            </View>
          );
        })}
        {data.offers.length === 0 ? <Text style={styles.emptyText}>Crie uma oferta para destacar um produto.</Text> : null}
      </View>
      <View style={styles.bottomSpacer} />
    </>
  );

  const renderField = (label: string, value: string, onChangeText: (text: string) => void, placeholder: string, keyboardType: 'default' | 'decimal-pad' | 'number-pad' | 'phone-pad' = 'default') => (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        keyboardType={keyboardType}
        style={styles.fieldInput}
      />
    </View>
  );

  const renderChoices = (label: string, options: string[], selected: string, onSelect: (value: string) => void) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.choiceRow}>
        {options.map((option) => (
          <Pressable key={option} onPress={() => onSelect(option)} style={[styles.choiceChip, selected === option && styles.choiceChipSelected]}>
            <Text style={[styles.choiceText, selected === option && styles.choiceTextSelected]}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderForm = () => {
    const title = form === 'product' ? 'Novo produto' : form === 'sale' ? editingSale ? 'Editar venda' : 'Nova venda' : form === 'order' ? 'Novo pedido' : form === 'expense' ? editingExpenseId ? 'Editar gasto' : 'Registrar gasto' : form === 'supply' ? 'Novo insumo' : 'Criar oferta';
    const canSave = form === 'product' || form === 'sale' || form === 'order' || form === 'expense' || form === 'supply' || form === 'offer';
    const supplyQuantityNumber = Number.parseInt(supplyQuantity, 10);
    const supplyDailyUseNumber = Number.parseInt(supplyDailyUse, 10);
    const estimatedSupplyDays = supplyDaysRemaining(supplyDailyUseNumber, supplyQuantityNumber);
    const saleTotal = data.products.reduce((sum, product) => {
      const quantity = cart[product.id] ?? 0;
      const discount = parseAmount(cartDiscounts[product.id] ?? '');
      return sum + Math.max(0, saleUnitPrice(product) * quantity - discount);
    }, 0);
    const orderTotal = data.products.reduce((sum, product) => {
      const quantity = orderCart[product.id] ?? 0;
      const discount = parseAmount(orderCartDiscounts[product.id] ?? '');
      return sum + Math.max(0, priceFor(product) * quantity - discount);
    }, 0);
    return (
      <Modal visible={form !== null} transparent animationType="slide" onRequestClose={closeForm}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.modalBackdrop} onPress={closeForm} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Pressable onPress={closeForm} style={styles.closeButton}><Text style={styles.closeButtonText}>×</Text></Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              {form === 'product' ? (
                <>
                  <View style={styles.photoPicker}>
                    {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoPreview} /> : <View style={styles.photoPlaceholder}><Text style={styles.photoPlaceholderIcon}>＋</Text><Text style={styles.photoPlaceholderText}>Foto do produto</Text></View>}
                  </View>
                  <View style={styles.photoSourceRow}>
                    <Pressable
                      style={styles.photoSourceButton}
                      onPress={() => choosePhoto('gallery')}
                      accessibilityRole="button"
                    >
                      <Text style={styles.photoSourceText}>Galeria</Text>
                    </Pressable>
                    <Pressable
                      style={styles.photoSourceButton}
                      onPress={() => choosePhoto('camera')}
                      accessibilityRole="button"
                    >
                      <Text style={styles.photoSourceText}>Câmera</Text>
                    </Pressable>
                  </View>
                  {renderField('Nome do produto', productName, setProductName, 'Ex.: Caneca de cerâmica')}
                  {renderChoices('Categoria', productCategoryOptions, productCategory, setProductCategory)}
                  <View style={styles.formColumns}>
                    <View style={styles.formColumn}>{renderField('Preço de venda', productPrice, setProductPrice, '0,00', 'decimal-pad')}</View>
                    <View style={styles.formColumn}>{renderField('Quantidade', productStock, setProductStock, '0', 'number-pad')}</View>
                  </View>
                  {renderField('Notificar estoque quando chegar a', lowStockAt, setLowStockAt, '2 unidades', 'number-pad')}
                  <Text style={styles.fieldHint}>Você receberá um alerta quando o estoque atingir este limite.</Text>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Funcionário que fabricou <Text style={styles.optionalLabel}>(opcional)</Text></Text>
                    {(data.company?.employees ?? []).length > 0 ? (
                      <View style={styles.choiceRow}>
                        <Pressable
                          onPress={() => setProductMakerEmployee('')}
                          style={[styles.choiceChip, productMakerEmployee === '' && styles.choiceChipSelected]}
                        >
                          <Text style={[styles.choiceText, productMakerEmployee === '' && styles.choiceTextSelected]}>Não definido</Text>
                        </Pressable>
                        {data.company?.employees.map((employee) => (
                          <Pressable
                            key={employee}
                            onPress={() => setProductMakerEmployee(employee)}
                            style={[styles.choiceChip, productMakerEmployee === employee && styles.choiceChipSelected]}
                          >
                            <Text style={[styles.choiceText, productMakerEmployee === employee && styles.choiceTextSelected]}>{employee}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.fieldHint}>Cadastre funcionários no perfil da empresa para atribuir uma comissão.</Text>
                    )}
                  </View>
                  {renderField('Comissão por venda (%)', productCommissionPercent, setProductCommissionPercent, 'Ex.: 10', 'decimal-pad')}
                  <Text style={styles.fieldHint}>A comissão é calculada sobre o valor final do item, depois dos descontos, e pertence a quem fabricou.</Text>
                  {renderChoices(
                    'Oferta no produto',
                    ['Sem oferta', 'Porcentagem', 'Valor em R$'],
                    productDiscountType === 'none' ? 'Sem oferta' : productDiscountType === 'percent' ? 'Porcentagem' : 'Valor em R$',
                    (value) => {
                      const nextType = value === 'Porcentagem' ? 'percent' : value === 'Valor em R$' ? 'fixed' : 'none';
                      setProductDiscountType(nextType);
                      if (nextType === 'none') setProductDiscountValue('');
                    },
                  )}
                  {productDiscountType !== 'none' ? (
                    <>
                      {renderField(
                        productDiscountType === 'percent' ? 'Desconto da oferta (%)' : 'Desconto da oferta (R$)',
                        productDiscountValue,
                        setProductDiscountValue,
                        productDiscountType === 'percent' ? 'Ex.: 15' : 'Ex.: 10,00',
                        'decimal-pad',
                      )}
                      <Text style={styles.fieldHint}>A oferta será aplicada automaticamente nas vendas deste produto.</Text>
                    </>
                  ) : null}
                </>
              ) : null}
              {form === 'sale' ? (
                <>
                  <Text style={styles.formIntro}>
                    {editingSale
                      ? 'Ajuste os itens desta venda. O estoque será atualizado pela diferença das quantidades.'
                      : 'Escolha os produtos e as quantidades desta venda.'}
                  </Text>
                  {!editingSale && (data.company?.employees ?? []).length > 0 ? (
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Funcionário responsável <Text style={styles.optionalLabel}>(opcional)</Text></Text>
                      <View style={styles.choiceRow}>
                        <Pressable
                          onPress={() => setSelectedEmployee('')}
                          style={[styles.choiceChip, !selectedEmployee && styles.choiceChipSelected]}
                        >
                          <Text style={[styles.choiceText, !selectedEmployee && styles.choiceTextSelected]}>Sem seleção</Text>
                        </Pressable>
                        {(data.company?.employees ?? []).map((employee) => (
                          <Pressable
                            key={employee}
                            onPress={() => setSelectedEmployee(employee)}
                            style={[styles.choiceChip, selectedEmployee === employee && styles.choiceChipSelected]}
                          >
                            <Text style={[styles.choiceText, selectedEmployee === employee && styles.choiceTextSelected]}>{employee}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ) : null}
                  {data.products.map((product) => {
                    const quantity = cart[product.id] ?? 0;
                    const originalQuantity = editingSale?.items
                      .filter((item) => item.productId === product.id)
                      .reduce((sum, item) => sum + item.quantity, 0) ?? 0;
                    const availableQuantity = product.stock + originalQuantity;
                    const currentPrice = saleUnitPrice(product);
                    return (
                      <View key={product.id} style={styles.cartProduct}>
                        <View style={styles.cartProductMain}>
                          <ProductPicture product={product} />
                          <View style={styles.cartProductCopy}>
                            <Text style={styles.cartProductName}>{product.name}</Text>
                            <Text style={styles.cartProductPrice}>
                              {money(currentPrice)} · {availableQuantity} disponíveis
                              {!editingSale && offerFor(product.id) ? ' · oferta' : ''}
                            </Text>
                          </View>
                          <View style={styles.quantityStepper}>
                            <Pressable
                              style={styles.stepButton}
                              onPress={() => {
                                const nextQuantity = Math.max(0, quantity - 1);
                                setCart((current) => ({ ...current, [product.id]: nextQuantity }));
                                if (nextQuantity === 0) setCartDiscounts((current) => ({ ...current, [product.id]: '' }));
                              }}
                            >
                              <Text style={styles.stepText}>−</Text>
                            </Pressable>
                            <Text style={styles.cartQuantity}>{quantity}</Text>
                            <Pressable
                              style={[styles.stepButton, quantity >= availableQuantity && styles.stepButtonDisabled]}
                              disabled={quantity >= availableQuantity}
                              onPress={() => setCart((current) => ({ ...current, [product.id]: Math.min(availableQuantity, quantity + 1) }))}
                            >
                              <Text style={styles.stepText}>+</Text>
                            </Pressable>
                          </View>
                        </View>
                        {quantity > 0 ? (
                          <View style={styles.cartDiscountRow}>
                            <View style={styles.cartDiscountCopy}>
                              <Text style={styles.cartDiscountLabel}>Desconto adicional (R$)</Text>
                              <Text style={styles.cartDiscountHint}>Valor total desta linha; soma à oferta.</Text>
                            </View>
                            <TextInput
                              value={cartDiscounts[product.id] ?? ''}
                              onChangeText={(value) => setCartDiscounts((current) => ({ ...current, [product.id]: value }))}
                              placeholder="0,00"
                              placeholderTextColor={palette.muted}
                              keyboardType="decimal-pad"
                              style={styles.cartDiscountInput}
                              accessibilityLabel={`Desconto total em reais para ${product.name}`}
                            />
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                  <View style={styles.cartTotal}>
                    <Text style={styles.cartTotalLabel}>Total da venda</Text>
                    <Text style={styles.cartTotalValue}>{money(saleTotal)}</Text>
                  </View>
                  {!editingSale && activeOffers.length ? <Text style={styles.fieldHint}>Ofertas ativas já aplicadas; descontos manuais são adicionais.</Text> : null}
                </>
              ) : null}
              {form === 'order' ? (
                <>
                  <Text style={styles.formIntro}>Registre uma encomenda. Os pedidos não alteram o estoque dos produtos.</Text>
                  {renderField('Nome do cliente', orderCustomerName, setOrderCustomerName, 'Nome completo')}
                  {renderField('Telefone', orderPhone, setOrderPhone, '(00) 00000-0000', 'phone-pad')}
                  <View style={styles.formColumns}>
                    <View style={styles.formColumn}>
                      {renderField('Data de entrega', orderDeliveryDate, setOrderDeliveryDate, 'DD/MM/AAAA')}
                    </View>
                    <View style={styles.formColumn}>
                      {renderField('Alertar com quantos dias?', orderAlertDays, setOrderAlertDays, 'Opcional', 'number-pad')}
                    </View>
                  </View>
                  <Text style={styles.fieldHint}>Deixe o prazo de alerta vazio se não quiser um aviso antecipado.</Text>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Produtos e quantidades</Text>
                    {data.products.map((product) => {
                      const quantity = orderCart[product.id] ?? 0;
                      return (
                        <View key={product.id} style={styles.cartProduct}>
                          <View style={styles.cartProductMain}>
                            <ProductPicture product={product} />
                            <View style={styles.cartProductCopy}>
                              <Text style={styles.cartProductName}>{product.name}</Text>
                              <Text style={styles.cartProductPrice}>
                                {money(priceFor(product))} · {product.stock > 0 ? `${product.stock} disponível(is)` : 'sob encomenda'}
                                {offerFor(product.id) ? ' · oferta' : ''}
                              </Text>
                            </View>
                            <View style={styles.quantityStepper}>
                              <Pressable
                                style={styles.stepButton}
                                onPress={() => {
                                  const nextQuantity = Math.max(0, quantity - 1);
                                  setOrderCart((current) => ({ ...current, [product.id]: nextQuantity }));
                                  if (nextQuantity === 0) setOrderCartDiscounts((current) => ({ ...current, [product.id]: '' }));
                                }}
                                accessibilityLabel={`Remover uma unidade de ${product.name} do pedido`}
                              >
                                <Text style={styles.stepText}>−</Text>
                              </Pressable>
                              <Text style={styles.cartQuantity}>{quantity}</Text>
                              <Pressable
                                style={styles.stepButton}
                                onPress={() => setOrderCart((current) => ({ ...current, [product.id]: quantity + 1 }))}
                                accessibilityLabel={`Adicionar uma unidade de ${product.name} ao pedido`}
                              >
                                <Text style={styles.stepText}>+</Text>
                              </Pressable>
                            </View>
                          </View>
                          {quantity > 0 ? (
                            <View style={styles.cartDiscountRow}>
                              <View style={styles.cartDiscountCopy}>
                                <Text style={styles.cartDiscountLabel}>Desconto adicional (R$)</Text>
                                <Text style={styles.cartDiscountHint}>Valor total desta linha; soma à oferta.</Text>
                              </View>
                              <TextInput
                                value={orderCartDiscounts[product.id] ?? ''}
                                onChangeText={(value) => setOrderCartDiscounts((current) => ({ ...current, [product.id]: value }))}
                                placeholder="0,00"
                                placeholderTextColor={palette.muted}
                                keyboardType="decimal-pad"
                                style={styles.cartDiscountInput}
                                accessibilityLabel={`Desconto total em reais para ${product.name} no pedido`}
                              />
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                    {data.products.length === 0 ? <Text style={styles.emptyText}>Cadastre produtos antes de criar um pedido.</Text> : null}
                  </View>
                  <View style={styles.cartTotal}>
                    <Text style={styles.cartTotalLabel}>Total do pedido</Text>
                    <Text style={styles.cartTotalValue}>{money(orderTotal)}</Text>
                  </View>
                  {activeOffers.length ? <Text style={styles.fieldHint}>Ofertas ativas já aplicadas; descontos manuais são adicionais.</Text> : null}
                </>
              ) : null}
              {form === 'expense' ? (
                <>
                  <Text style={styles.formIntro}>
                    {editingExpenseId
                      ? 'Atualize a descrição, categoria ou valor deste gasto.'
                      : 'Registre compras de materiais e despesas do seu negócio.'}
                  </Text>
                  {renderField('O que você comprou?', expenseName, setExpenseName, 'Ex.: Fios de algodão')}
                  {renderChoices('Categoria', ['Matéria-prima', 'Embalagens', 'Ferramentas', 'Outros'], expenseCategory, setExpenseCategory)}
                  {renderField('Valor da compra', expenseAmount, setExpenseAmount, '0,00', 'decimal-pad')}
                </>
              ) : null}
              {form === 'supply' ? (
                <>
                  <Text style={styles.formIntro}>Acompanhe o estoque e a duração estimada de cada material.</Text>
                  {renderField('Nome do insumo', supplyName, setSupplyName, 'Ex.: Linha de algodão')}
                  {renderChoices('Categoria', supplyCategoryOptions, supplyCategory, setSupplyCategory)}
                  <View style={styles.formColumns}>
                    <View style={styles.formColumn}>{renderField('Quantidade disponível', supplyQuantity, setSupplyQuantity, '10', 'number-pad')}</View>
                    <View style={styles.formColumn}>{renderField('Consumo por dia', supplyDailyUse, setSupplyDailyUse, '2', 'number-pad')}</View>
                  </View>
                  <Text style={styles.fieldHint}>Alerta de estoque quando restarem menos de 2 unidades. A duração é estimada pelo consumo diário.</Text>
                  {supplyDailyUseNumber > 0 && supplyQuantityNumber >= 0 ? (
                    <View style={styles.offerPreview}>
                      <Text style={styles.offerPreviewLabel}>DURAÇÃO ESTIMADA</Text>
                      <Text style={styles.offerPreviewValue}>
                        {estimatedSupplyDays} {estimatedSupplyDays === 1 ? 'dia' : 'dias'}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : null}
              {form === 'offer' ? (
                <>
                  <Text style={styles.formIntro}>Escolha um produto e defina o desconto que será aplicado nas vendas.</Text>
                  {renderField('Nome da oferta', offerName, setOfferName, 'Ex.: Semana especial')}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Produto</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChoices}>
                      {data.products.map((product) => (
                        <Pressable key={product.id} onPress={() => setOfferProductId(product.id)} style={[styles.productChoice, offerProductId === product.id && styles.productChoiceSelected]}>
                          <Text style={[styles.productChoiceText, offerProductId === product.id && styles.productChoiceTextSelected]}>{product.name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                  {renderChoices('Tipo de desconto', ['Porcentagem', 'Valor fixo'], discountType === 'percent' ? 'Porcentagem' : 'Valor fixo', (value) => setDiscountType(value === 'Porcentagem' ? 'percent' : 'fixed'))}
                  {renderField(discountType === 'percent' ? 'Desconto (%)' : 'Desconto (R$)', discountValue, setDiscountValue, discountType === 'percent' ? 'Ex.: 15' : 'Ex.: 10,00', 'decimal-pad')}
                  {data.products.find((product) => product.id === offerProductId) ? (
                    <View style={styles.offerPreview}>
                      <Text style={styles.offerPreviewLabel}>PREÇO COM DESCONTO</Text>
                      <Text style={styles.offerPreviewValue}>
                        {money(Math.max(0, (data.products.find((product) => product.id === offerProductId)?.price ?? 0) - (discountType === 'percent'
                          ? ((data.products.find((product) => product.id === offerProductId)?.price ?? 0) * parseAmount(discountValue)) / 100
                          : parseAmount(discountValue))))}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : null}
              {canSave ? (
                <ActionButton
                  label={form === 'product' ? 'Salvar produto' : form === 'sale' ? editingSale ? 'Salvar alterações' : 'Confirmar venda' : form === 'order' ? 'Salvar pedido' : form === 'expense' ? editingExpenseId ? 'Salvar alterações' : 'Salvar gasto' : form === 'supply' ? 'Salvar insumo' : 'Ativar oferta'}
                  onPress={form === 'product' ? saveProduct : form === 'sale' ? saveSale : form === 'order' ? saveOrder : form === 'expense' ? saveExpense : form === 'supply' ? saveSupply : saveOffer}
                />
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  return (
    <ThemeContext.Provider value={theme}>
      <SafeAreaProvider>
        <SafeAreaView
          style={styles.safeArea}
          edges={loaded && data.company && !editingCompany ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom']}
        >
          <StatusBar style="dark" />
          {!loaded ? (
            <View style={styles.loadingScreen}>
              <View style={styles.brandMark}><Text style={styles.brandMarkText}>t.</Text></View>
              <Text style={styles.loadingText}>Preparando seu espaço...</Text>
            </View>
          ) : !data.company || editingCompany ? (
            renderCompanySetup()
          ) : (
            <>
              {renderHeader()}
              <ScrollView
                style={styles.screen}
                contentContainerStyle={styles.screenContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {tab === 'home' ? renderHome() : null}
                {tab === 'products' ? (
                  <ProductsScreen
                    visibleProducts={visibleProducts}
                    totalProducts={data.products.length}
                    lowStockCount={lowStockProducts.length}
                    query={query}
                    setQuery={setQuery}
                    openForm={openForm}
                    deleteProduct={deleteProduct}
                    changeStock={changeStock}
                    offerFor={offerFor}
                    priceFor={priceFor}
                  />
                ) : null}
                {tab === 'sales' ? renderSales() : null}
                {tab === 'commissions' ? (
                  <CommissionsScreen
                    sales={data.sales}
                    onMarkPaid={markCommissionPaid}
                    onUndoPaid={undoCommissionPayment}
                  />
                ) : null}
                {tab === 'orders' ? renderOrders() : null}
                {tab === 'supplies' ? renderSupplies() : null}
                {tab === 'alerts' ? (
                  <AlertsScreen
                    orders={alertingOrders}
                    products={lowStockProducts}
                    supplies={lowStockSupplies}
                    today={today}
                    onNavigate={setTab}
                  />
                ) : null}
                {tab === 'management' ? renderManagement() : null}
                {tab === 'settings' ? (
                  <SettingsScreen
                    productCategories={productCategoryOptions}
                    supplyCategories={supplyCategoryOptions}
                    employees={data.company?.employees ?? []}
                    onAddCategory={addManagedCategory}
                    onRenameCategory={renameManagedCategory}
                    onRemoveCategory={removeManagedCategory}
                    onAddEmployee={addManagedEmployee}
                    onRenameEmployee={renameManagedEmployee}
                    onRemoveEmployee={removeManagedEmployee}
                  />
                ) : null}
              </ScrollView>
              <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea}>
                <View style={styles.bottomNavigation}>
                  {tabItems.map((item) => {
                    const selected = tab === item.key;
                    return (
                      <Pressable key={item.key} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setTab(item.key)} style={styles.navItem}>
                        <Text style={[styles.navIcon, selected && styles.navIconSelected]}>{item.icon}</Text>
                        <Text style={[styles.navLabel, selected && styles.navLabelSelected, item.key === 'commissions' && styles.navLabelCompact]}>
                          {item.label}
                        </Text>
                        {item.key === 'alerts' && lowStockCount + alertingOrders.length > 0
                          ? <View style={styles.navNotificationDot} />
                          : null}
                        {selected ? <View style={styles.navIndicator} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </SafeAreaView>
              {renderForm()}
            </>
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    </ThemeContext.Provider>
  );
}
