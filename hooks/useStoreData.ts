import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Alert, AppState } from 'react-native';
import {
  DEFAULT_PALETTE,
  DEFAULT_PRODUCT_CATEGORIES,
  DEFAULT_SUPPLY_CATEGORIES,
  initialData,
  STORAGE_KEY,
} from '../constants';
import {
  availableSupplyQuantity,
  calculateCommissionAmount,
  dateDifferenceInDays,
  localDateKey,
  money,
  parseAmount,
  parseDate,
  parseDeliveryDate,
  sameMonth,
} from '../utils';
import type {
  CategoryKind,
  CompanyProfile,
  CustomerOrder,
  Expense,
  DriveBackupSettings,
  FormType,
  Offer,
  Product,
  Sale,
  StoreData,
  Supply,
  Tab,
} from '../types';
import { createBackupFile, persistProductImage, readBackupFile } from '../backup';
import {
  createDriveBackup,
  connectGoogleDrive,
  DEFAULT_DRIVE_BACKUP_SETTINGS,
  disconnectGoogleDrive,
  getGoogleDriveAccountEmail,
  isGoogleDriveConfigured,
  readDriveBackupSettings,
  saveDriveBackupSettings,
} from '../services/googleDriveBackup';
import {
  ensureDailyDriveBackupTask,
  unregisterDailyDriveBackupTask,
} from '../services/driveBackupTask';
import { normalizeStoreData } from '../storeData';

export { normalizeStoreData } from '../storeData';

export default function useStoreData() {
  const [data, setData] = useState<StoreData>(initialData);
  const [loaded, setLoaded] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [driveBackupBusy, setDriveBackupBusy] = useState(false);
  const [driveBackupSettings, setDriveBackupSettings] = useState<DriveBackupSettings>(DEFAULT_DRIVE_BACKUP_SETTINGS);
  const [driveBackupSettingsLoaded, setDriveBackupSettingsLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  const [form, setForm] = useState<FormType>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
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
  const [saleDate, setSaleDate] = useState('');
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
    let active = true;
    readDriveBackupSettings()
      .then(async (settings) => {
        const accountEmail = await getGoogleDriveAccountEmail();
        const refreshedSettings = accountEmail === settings.accountEmail
          ? settings
          : { ...settings, accountEmail };
        if (refreshedSettings !== settings) await saveDriveBackupSettings(refreshedSettings);
        if (active) setDriveBackupSettings(refreshedSettings);
      })
      .catch((error: unknown) => {
        Alert.alert(
          'Não foi possível carregar as configurações de backup',
          error instanceof Error ? error.message : 'Tente abrir as configurações novamente.',
        );
      })
      .finally(() => {
        if (active) setDriveBackupSettingsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded || !driveBackupSettingsLoaded || !driveBackupSettings.enabled) return;
    ensureDailyDriveBackupTask().catch((error: unknown) => {
      Alert.alert(
        'Não foi possível agendar o backup',
        error instanceof Error ? error.message : 'Revise as permissões e tente novamente.',
      );
    });
  }, [loaded, driveBackupSettingsLoaded, driveBackupSettings.enabled]);

  useEffect(() => {
    let active = true;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      readDriveBackupSettings()
        .then((settings) => {
          if (active) setDriveBackupSettings(settings);
        })
        .catch((error: unknown) => {
          Alert.alert(
            'Não foi possível atualizar o status do backup',
            error instanceof Error ? error.message : 'Tente abrir as configurações novamente.',
          );
        });
    });
    return () => {
      active = false;
      subscription.remove();
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
  const monthSales = data.sales
    .filter((sale) => sameMonth(sale.date, month))
    .sort((first, second) => second.date.localeCompare(first.date));
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
      setEditingProductId(null);
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
      setSaleDate('');
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
    setEditingProductId(null);
    setEditingSaleId(null);
    setEditingExpenseId(null);
  };

  const openProductForEditing = (product: Product) => {
    const activeProductOffer = data.offers.find((offer) => offer.productId === product.id && offer.active);
    setEditingProductId(product.id);
    setProductName(product.name);
    setProductCategory(product.category);
    setProductPrice(String(product.price));
    setProductStock(String(product.stock));
    setLowStockAt(String(product.lowStockAt));
    setProductMakerEmployee(product.makerEmployee ?? '');
    setProductCommissionPercent(String(product.commissionPercent ?? 0));
    setProductDiscountType(activeProductOffer?.discountType ?? 'none');
    setProductDiscountValue(activeProductOffer ? String(activeProductOffer.value) : '');
    setPhotoUri(product.imageUri);
    setForm('product');
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
    const previousProduct = editingProductId
      ? data.products.find((product) => product.id === editingProductId)
      : undefined;
    if (editingProductId && !previousProduct) {
      Alert.alert('Produto não encontrado', 'Atualize a lista e tente novamente.');
      return;
    }

    const id = previousProduct?.id ?? `p${Date.now()}`;
    let imageUri: string | undefined;
    if (photoUri) {
      if (photoUri === previousProduct?.imageUri) {
        imageUri = photoUri;
      } else {
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
    const activeProductOffer = previousProduct
      ? data.offers.find((offer) => offer.productId === previousProduct.id && offer.active)
      : undefined;
    const initialOffer: Offer | undefined = productDiscountType === 'none'
      ? undefined
      : {
        id: activeProductOffer?.id ?? `o${Date.now()}`,
        productId: product.id,
        name: activeProductOffer?.name ?? 'Oferta inicial',
        discountType: productDiscountType,
        value: offerValue,
        active: true,
      };
    setData((current) => ({
      ...current,
      products: previousProduct
        ? current.products.map((item) => item.id === product.id ? product : item)
        : [product, ...current.products],
      offers: previousProduct
        ? initialOffer
          ? activeProductOffer
            ? current.offers.map((offer) => offer.id === activeProductOffer.id ? initialOffer : offer)
            : [...current.offers, initialOffer]
          : current.offers.map((offer) =>
            offer.productId === product.id && offer.active ? { ...offer, active: false } : offer)
        : initialOffer ? [...current.offers, initialOffer] : current.offers,
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
    const date = previousSale
      ? previousSale.date
      : saleDate.trim()
        ? parseDate(saleDate)
        : localDateKey(new Date());
    if (!date) {
      Alert.alert('Data inválida', 'Informe a data no formato DD/MM/AAAA ou deixe o campo em branco para usar hoje.');
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
      date,
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
          : [sale, ...current.sales].sort((first, second) => second.date.localeCompare(first.date)),
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
    if (!previousSale) {
      const [year, monthNumber] = sale.date.split('-').map(Number);
      setMonth(new Date(year, monthNumber - 1, 1));
    }
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

  const connectDriveAccount = async () => {
    if (driveBackupBusy) return;
    if (!isGoogleDriveConfigured()) {
      Alert.alert(
        'Configure o Google Drive',
        'O backup no Google Drive exige um development build e não funciona no Expo Go. Configure também os IDs OAuth e gere um novo aplicativo. Consulte as instruções nesta seção.',
      );
      return;
    }

    setDriveBackupBusy(true);
    try {
      const accountEmail = await connectGoogleDrive();
      const nextSettings = {
        ...driveBackupSettings,
        accountEmail,
        lastBackupError: null,
      };
      await saveDriveBackupSettings(nextSettings);
      setDriveBackupSettings(nextSettings);
      Alert.alert('Google Drive conectado', 'A conta está autorizada para criar backups do Trama.');
    } catch (error) {
      Alert.alert(
        'Não foi possível conectar ao Google Drive',
        error instanceof Error ? error.message : 'Confira a configuração da conta Google e tente novamente.',
      );
    } finally {
      setDriveBackupBusy(false);
    }
  };

  const disconnectDriveAccount = async () => {
    if (driveBackupBusy) return;
    setDriveBackupBusy(true);
    const disabledSettings = { ...driveBackupSettings, enabled: false };
    try {
      await saveDriveBackupSettings(disabledSettings);
      setDriveBackupSettings(disabledSettings);
      await unregisterDailyDriveBackupTask();
      await disconnectGoogleDrive();
      const disconnectedSettings = { ...disabledSettings, accountEmail: null };
      await saveDriveBackupSettings(disconnectedSettings);
      setDriveBackupSettings(disconnectedSettings);
      Alert.alert('Google Drive desconectado', 'Os backups automáticos foram desativados.');
    } catch (error) {
      Alert.alert(
        'Não foi possível desconectar o Google Drive',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    } finally {
      setDriveBackupBusy(false);
    }
  };

  const updateDriveBackupTime = async (time: string) => {
    if (driveBackupBusy) return;
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      Alert.alert('Horário inválido', 'Informe o horário no formato de 24 horas, como 08:30.');
      return;
    }

    setDriveBackupBusy(true);
    try {
      const nextSettings = { ...driveBackupSettings, time };
      await saveDriveBackupSettings(nextSettings);
      setDriveBackupSettings(nextSettings);
      Alert.alert('Horário atualizado', `O backup será tentado diariamente após ${time}.`);
    } catch (error) {
      Alert.alert(
        'Não foi possível salvar o horário',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    } finally {
      setDriveBackupBusy(false);
    }
  };

  const toggleDriveBackup = async (enabled: boolean) => {
    if (driveBackupBusy) return;
    if (enabled && !isGoogleDriveConfigured()) {
      Alert.alert(
        'Configure o Google Drive',
        'O backup no Google Drive exige um development build e não funciona no Expo Go. Configure também os IDs OAuth antes de ativar os backups automáticos.',
      );
      return;
    }
    if (enabled && !driveBackupSettings.accountEmail) {
      Alert.alert('Conecte uma conta Google', 'Conecte o Google Drive antes de ativar o backup diário.');
      return;
    }

    setDriveBackupBusy(true);
    try {
      const nextSettings = { ...driveBackupSettings, enabled };
      if (enabled) {
        await ensureDailyDriveBackupTask();
        await saveDriveBackupSettings(nextSettings);
      } else {
        await saveDriveBackupSettings(nextSettings);
        await unregisterDailyDriveBackupTask();
      }
      setDriveBackupSettings(nextSettings);
      Alert.alert(
        enabled ? 'Backup automático ativado' : 'Backup automático desativado',
        enabled
          ? `O sistema tentará enviar um backup após ${nextSettings.time} todos os dias.`
          : 'Nenhum novo backup será agendado.',
      );
    } catch (error) {
      Alert.alert(
        'Não foi possível atualizar o backup automático',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    } finally {
      setDriveBackupBusy(false);
    }
  };

  const runDriveBackupNow = async () => {
    if (driveBackupBusy) return;
    if (!isGoogleDriveConfigured() || !driveBackupSettings.accountEmail) {
      Alert.alert('Conecte o Google Drive', 'Configure e conecte uma conta Google antes de enviar o backup.');
      return;
    }

    setDriveBackupBusy(true);
    try {
      const now = new Date();
      await createDriveBackup(data, now);
      const nextSettings = {
        ...driveBackupSettings,
        lastBackupAt: now.toISOString(),
        lastBackupError: null,
      };
      setDriveBackupSettings(nextSettings);
      try {
        await saveDriveBackupSettings(nextSettings);
      } catch (error) {
        Alert.alert(
          'Backup enviado, mas status não salvo',
          error instanceof Error ? error.message : 'A cópia está no Drive, mas o status local não foi atualizado.',
        );
        return;
      }
      Alert.alert('Backup enviado', 'Uma cópia dos dados e das fotos foi salva no Google Drive.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tente novamente.';
      const nextSettings = { ...driveBackupSettings, lastBackupError: message };
      try {
        await saveDriveBackupSettings(nextSettings);
        setDriveBackupSettings(nextSettings);
      } catch (saveError) {
        Alert.alert(
          'Falha ao registrar o erro',
          saveError instanceof Error ? saveError.message : 'O status do backup não pôde ser salvo.',
        );
      }
      Alert.alert('Não foi possível enviar o backup', message);
    } finally {
      setDriveBackupBusy(false);
    }
  };

  return {
    data,
    setData,
    loaded,
    backupBusy,
    driveBackupBusy,
    driveBackupSettings,
    googleDriveConfigured: isGoogleDriveConfigured(),
    tab,
    setTab,
    form,
    editingProductId,
    editingSaleId,
    editingExpenseId,
    month,
    setMonth,
    salesEmployeeFilter,
    setSalesEmployeeFilter,
    query,
    setQuery,
    productName,
    setProductName,
    productCategory,
    setProductCategory,
    productPrice,
    setProductPrice,
    productStock,
    setProductStock,
    lowStockAt,
    setLowStockAt,
    productMakerEmployee,
    setProductMakerEmployee,
    productCommissionPercent,
    setProductCommissionPercent,
    productDiscountType,
    setProductDiscountType,
    productDiscountValue,
    setProductDiscountValue,
    photoUri,
    setPhotoUri,
    expenseName,
    setExpenseName,
    expenseCategory,
    setExpenseCategory,
    expenseAmount,
    setExpenseAmount,
    supplyName,
    setSupplyName,
    supplyCategory,
    setSupplyCategory,
    supplyQuantity,
    setSupplyQuantity,
    supplyDailyUse,
    setSupplyDailyUse,
    offerProductId,
    setOfferProductId,
    offerName,
    setOfferName,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    cart,
    setCart,
    cartDiscounts,
    setCartDiscounts,
    orderCustomerName,
    setOrderCustomerName,
    orderPhone,
    setOrderPhone,
    orderDeliveryDate,
    setOrderDeliveryDate,
    orderAlertDays,
    setOrderAlertDays,
    orderCart,
    setOrderCart,
    orderCartDiscounts,
    setOrderCartDiscounts,
    businessType,
    setBusinessType,
    customBusinessType,
    setCustomBusinessType,
    businessName,
    setBusinessName,
    selectedColor,
    setSelectedColor,
    employees,
    setEmployees,
    employeeDraft,
    setEmployeeDraft,
    selectedEmployee,
    setSelectedEmployee,
    saleDate,
    setSaleDate,
    editingCompany,
    setEditingCompany,
    activeOffers,
    productCategoryOptions,
    supplyCategoryOptions,
    offerFor,
    priceFor,
    editingSale,
    saleUnitPrice,
    salesEmployeeOptions,
    activeSalesEmployeeFilter,
    monthSales,
    reportSales,
    reportRevenue,
    monthExpenses,
    monthRevenue,
    monthSpent,
    revenueTrend,
    revenueBars,
    maxRevenueBar,
    lowStockProducts,
    today,
    suppliesWithStock,
    lowStockSupplies,
    lowStockCount,
    pendingOrders,
    alertingOrders,
    visibleProducts,
    monthLabel,
    openForm,
    closeForm,
    openProductForEditing,
    openSaleForEditing,
    addEmployee,
    addManagedCategory,
    renameManagedCategory,
    removeManagedCategory,
    addManagedEmployee,
    renameManagedEmployee,
    removeManagedEmployee,
    saveCompanyProfile,
    exportBackup,
    importBackup,
    connectDriveAccount,
    disconnectDriveAccount,
    updateDriveBackupTime,
    toggleDriveBackup,
    runDriveBackupNow,
    editCompanyProfile,
    choosePhoto,
    saveProduct,
    saveSale,
    deleteSale,
    saveOrder,
    markOrderDelivered,
    undoOrderDelivery,
    markCommissionPaid,
    undoCommissionPayment,
    saveExpense,
    openExpenseForEditing,
    deleteExpense,
    saveSupply,
    changeSupplyStock,
    saveOffer,
    changeStock,
    deleteProduct,
    toggleOffer,
    changeMonth
  };
}
