import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  lowStockAt: number;
  imageUri?: string;
};

type SaleItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

type Sale = {
  id: string;
  date: string;
  items: SaleItem[];
  total: number;
  savings: number;
  employeeName?: string;
};

type Expense = {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
};

type Offer = {
  id: string;
  productId: string;
  name: string;
  discountType: 'percent' | 'fixed';
  value: number;
  active: boolean;
};

type StoreData = {
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  offers: Offer[];
  company?: CompanyProfile;
};

type CompanyProfile = {
  businessType: string;
  customBusinessType?: string;
  name: string;
  baseColor: string;
  employees: string[];
};

type Palette = {
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

type Tab = 'home' | 'products' | 'sales' | 'management';
type FormType = 'product' | 'sale' | 'expense' | 'offer' | null;

const STORAGE_KEY = '@trama/store-data-v1';
const BUSINESS_TYPES = [
  'Ateliê',
  'Loja',
  'Banca',
  'Ambulante',
  'Feirante',
  'Salão',
  'Barbearia',
  'Studio',
  'Clínica',
  'Oficina',
  'Assistência',
  'Outro',
];
const BASE_COLORS = [
  { name: 'Azul', value: '#3C6E91' },
  { name: 'Verde', value: '#315B48' },
  { name: 'Vermelho', value: '#A94E49' },
  { name: 'Amarelo', value: '#826313' },
  { name: 'Marrom', value: '#79543D' },
  { name: 'Cinza', value: '#5C686C' },
  { name: 'Roxo', value: '#76558E' },
  { name: 'Rosa', value: '#A64F70' },
  { name: 'Laranja', value: '#AA6031' },
];

function hexToHsl(hex: string) {
  const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  let saturation = 0;
  const lightness = (max + min) / 2;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return { hue, saturation, lightness };
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const offset = lightness - chroma / 2;
  const [red, green, blue] =
    segment < 1 ? [chroma, secondary, 0]
      : segment < 2 ? [secondary, chroma, 0]
        : segment < 3 ? [0, chroma, secondary]
          : segment < 4 ? [0, secondary, chroma]
            : segment < 5 ? [secondary, 0, chroma]
              : [chroma, 0, secondary];
  return `#${[red, green, blue].map((channel) => Math.round((channel + offset) * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function mixColors(color: string, other: string, amount: number) {
  const first = [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16));
  const second = [1, 3, 5].map((index) => Number.parseInt(other.slice(index, index + 2), 16));
  return `#${first.map((channel, index) => Math.round(channel * (1 - amount) + second[index] * amount).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function createPalette(primary: string): Palette {
  const { hue, saturation } = hexToHsl(primary);
  const secondaryHue = (hue + 34) % 360;
  const secondary = hslToHex(secondaryHue, Math.max(0.3, saturation * 0.72), 0.47);
  const secondaryDeep = hslToHex(secondaryHue, Math.max(0.3, saturation * 0.72), 0.34);
  return {
    ink: '#25362F',
    muted: mixColors('#7A847D', primary, 0.12),
    green: primary,
    paleGreen: mixColors('#FFFFFF', primary, 0.1),
    cream: mixColors('#F7F6F1', primary, 0.035),
    white: '#FFFFFF',
    border: mixColors('#E9E9E2', primary, 0.11),
    orange: secondary,
    paleOrange: mixColors('#FFFFFF', secondary, 0.1),
    red: '#B45448',
    accentDeep: mixColors(primary, '#15231C', 0.2),
    accentMid: mixColors(primary, '#FFFFFF', 0.28),
    accentOn: '#FFFFFF',
    secondaryDeep,
    secondarySoft: mixColors('#FFFFFF', secondary, 0.16),
    canvasShade: mixColors('#EBE7DC', primary, 0.14),
  };
}

const DEFAULT_PALETTE = createPalette(BASE_COLORS[1].value);

const initialData: StoreData = { products: [], sales: [], expenses: [], offers: [] };

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const parseAmount = (value: string) => {
  const trimmed = value.trim();
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

const sameMonth = (date: string, month: Date) => {
  const [year, monthNumber] = date.slice(0, 10).split('-').map(Number);
  return year === month.getFullYear() && monthNumber === month.getMonth() + 1;
};

function ActionButton({
  label,
  onPress,
  secondary = false,
  compact = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  compact?: boolean;
}) {
  const { styles } = useContext(ThemeContext);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.actionButton, secondary && styles.actionButtonSecondary, compact && styles.actionButtonCompact]}
    >
      <Text style={[styles.actionButtonText, secondary && styles.actionButtonTextSecondary, compact && styles.actionButtonTextCompact]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SectionTitle({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  const { styles } = useContext(ThemeContext);
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button">
          <Text style={styles.linkText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ProductPicture({ product, large = false }: { product: Product; large?: boolean }) {
  const { styles } = useContext(ThemeContext);
  return (
    <View style={[styles.productPicture, large && styles.productPictureLarge]}>
      {product.imageUri ? (
        <Image source={{ uri: product.imageUri }} style={styles.productImage} />
      ) : (
        <Text style={styles.picturePlaceholder}>✿</Text>
      )}
    </View>
  );
}

export default function App() {
  const [data, setData] = useState<StoreData>(initialData);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  const [form, setForm] = useState<FormType>(null);
  const [month, setMonth] = useState(new Date());
  const [query, setQuery] = useState('');
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('Casa');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('');
  const [lowStockAt, setLowStockAt] = useState('2');
  const [photoUri, setPhotoUri] = useState<string>();
  const [expenseName, setExpenseName] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Matéria-prima');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [offerProductId, setOfferProductId] = useState('');
  const [offerName, setOfferName] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
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
        if (saved && active) setData(JSON.parse(saved) as StoreData);
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
  const offerFor = (productId: string) => activeOffers.find((offer) => offer.productId === productId);
  const priceFor = (product: Product) => {
    const offer = offerFor(product.id);
    if (!offer) return product.price;
    const discount = offer.discountType === 'percent' ? (product.price * offer.value) / 100 : offer.value;
    return Math.max(0, product.price - discount);
  };
  const monthSales = data.sales.filter((sale) => sameMonth(sale.date, month));
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
  const visibleProducts = data.products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()));
  const monthLabel = month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const openForm = (next: Exclude<FormType, null>) => {
    setForm(next);
    if (next === 'product') {
      setProductName('');
      setProductCategory('Casa');
      setProductPrice('');
      setProductStock('');
      setLowStockAt('2');
      setPhotoUri(undefined);
    }
    if (next === 'sale') {
      setCart({});
      setSelectedEmployee('');
    }
    if (next === 'expense') {
      setExpenseName('');
      setExpenseCategory('Matéria-prima');
      setExpenseAmount('');
    }
    if (next === 'offer') {
      setOfferProductId(data.products[0]?.id ?? '');
      setOfferName('');
      setDiscountType('percent');
      setDiscountValue('');
    }
  };

  const closeForm = () => setForm(null);

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

  const choosePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
      });
      if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
    } catch {
      Alert.alert('Não foi possível abrir as fotos', 'Tente novamente ou escolha outra imagem.');
    }
  };

  const saveProduct = () => {
    const price = parseAmount(productPrice);
    const stock = Number.parseInt(productStock, 10);
    const threshold = Number.parseInt(lowStockAt, 10);
    if (!productName.trim() || price <= 0 || !Number.isInteger(stock) || stock < 0 || !Number.isInteger(threshold) || threshold < 0) {
      Alert.alert('Confira os dados', 'Informe o nome, um preço válido e quantidades inteiras iguais ou maiores que zero.');
      return;
    }
    const product: Product = {
      id: `p${Date.now()}`,
      name: productName.trim(),
      category: productCategory,
      price,
      stock,
      lowStockAt: threshold,
      imageUri: photoUri,
    };
    setData((current) => ({ ...current, products: [product, ...current.products] }));
    closeForm();
  };

  const saveSale = () => {
    const items = data.products
      .filter((product) => (cart[product.id] ?? 0) > 0)
      .map((product) => ({
        product,
        quantity: cart[product.id],
        unitPrice: priceFor(product),
      }));
    if (items.length === 0) {
      Alert.alert('Venda sem produtos', 'Adicione ao menos um produto para registrar a venda.');
      return;
    }
    const unavailable = items.find(({ product, quantity }) => quantity > product.stock);
    if (unavailable) {
      Alert.alert('Estoque insuficiente', `Há apenas ${unavailable.product.stock} unidade(s) de ${unavailable.product.name}.`);
      return;
    }
    const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const savings = items.reduce((sum, item) => sum + (item.product.price - item.unitPrice) * item.quantity, 0);
    const sale: Sale = {
      id: `s${Date.now()}`,
      date: localDateKey(new Date()),
      items: items.map(({ product, quantity, unitPrice }) => ({
        productId: product.id,
        name: product.name,
        quantity,
        unitPrice,
      })),
      total,
      savings,
      ...(selectedEmployee ? { employeeName: selectedEmployee } : {}),
    };
    setData((current) => ({
      ...current,
      sales: [sale, ...current.sales],
      products: current.products.map((product) => {
        const sold = cart[product.id] ?? 0;
        return sold ? { ...product, stock: product.stock - sold } : product;
      }),
    }));
    setMonth(new Date());
    closeForm();
  };

  const saveExpense = () => {
    const amount = parseAmount(expenseAmount);
    if (!expenseName.trim() || amount <= 0) {
      Alert.alert('Confira os dados', 'Informe a descrição e um valor maior que zero.');
      return;
    }
    const expense: Expense = {
      id: `e${Date.now()}`,
      date: localDateKey(new Date()),
      description: expenseName.trim(),
      category: expenseCategory,
      amount,
    };
    setData((current) => ({ ...current, expenses: [expense, ...current.expenses] }));
    setMonth(new Date());
    closeForm();
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
        accessibilityLabel={`${lowStockProducts.length} alertas de estoque`}
        onPress={() => setTab('products')}
        style={styles.notificationButton}
      >
        <Text style={styles.notificationIcon}>♧</Text>
        {lowStockProducts.length > 0 ? <View style={styles.notificationDot} /> : null}
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

  const renderProducts = () => (
    <>
      <Text style={styles.pageEyebrow}>SEU CATÁLOGO</Text>
      <View style={styles.pageHeadingRow}>
        <View><Text style={styles.pageTitle}>Produtos</Text><Text style={styles.pageSubtitle}>{data.products.length} produtos cadastrados</Text></View>
        <ActionButton label="+ Adicionar" onPress={() => openForm('product')} compact />
      </View>
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput value={query} onChangeText={setQuery} placeholder="Buscar produto..." placeholderTextColor={palette.muted} style={styles.searchInput} />
      </View>
      {lowStockProducts.length > 0 ? (
        <View style={styles.inventoryNotice}>
          <Text style={styles.inventoryNoticeIcon}>!</Text>
          <Text style={styles.inventoryNoticeText}>{lowStockProducts.length} produto(s) com estoque baixo</Text>
        </View>
      ) : null}
      <View style={styles.productGrid}>
        {visibleProducts.map((product) => {
          const low = product.stock <= product.lowStockAt;
          const offer = offerFor(product.id);
          return (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productCardImageWrap}>
                <ProductPicture product={product} large />
                {offer ? <View style={styles.offerPill}><Text style={styles.offerPillText}>OFERTA</Text></View> : null}
              </View>
              <View style={styles.productCardContent}>
                <Text style={styles.productCategory}>{product.category.toUpperCase()}</Text>
                <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                <View style={styles.productPriceRow}>
                  <Text style={styles.productPrice}>{money(priceFor(product))}</Text>
                  {offer ? <Text style={styles.oldPrice}>{money(product.price)}</Text> : null}
                </View>
                <View style={styles.productStockRow}>
                  <Text style={[styles.stockLabel, low && styles.stockLabelLow]}>{low ? 'Estoque baixo' : 'Em estoque'}</Text>
                  <View style={styles.quantityStepper}>
                    <Pressable style={styles.stepButton} onPress={() => changeStock(product.id, -1)} accessibilityLabel={`Remover uma unidade de ${product.name}`}><Text style={styles.stepText}>−</Text></Pressable>
                    <Text style={[styles.stockCount, low && styles.stockCountLow]}>{product.stock}</Text>
                    <Pressable style={styles.stepButton} onPress={() => changeStock(product.id, 1)} accessibilityLabel={`Adicionar uma unidade de ${product.name}`}><Text style={styles.stepText}>+</Text></Pressable>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </View>
      {visibleProducts.length === 0 ? <Text style={styles.emptyState}>Nenhum produto encontrado. Tente outra busca.</Text> : null}
      <View style={styles.bottomSpacer} />
    </>
  );

  const renderSales = () => (
    <>
      <Text style={styles.pageEyebrow}>MOVIMENTO DO NEGÓCIO</Text>
      <View style={styles.pageHeadingRow}>
        <View><Text style={styles.pageTitle}>Vendas</Text><Text style={styles.pageSubtitle}>Acompanhe cada encomenda</Text></View>
        <ActionButton label="+ Nova venda" onPress={() => openForm('sale')} compact />
      </View>
      <View style={styles.monthSelector}>
        <Pressable onPress={() => changeMonth(-1)} style={styles.monthArrow}><Text style={styles.monthArrowText}>‹</Text></Pressable>
        <Text style={styles.monthSelectorLabel}>{monthLabel}</Text>
        <Pressable onPress={() => changeMonth(1)} style={styles.monthArrow}><Text style={styles.monthArrowText}>›</Text></Pressable>
      </View>
      <View style={styles.salesSummary}>
        <View style={styles.salesSummaryCell}><Text style={styles.summaryLabel}>FATURAMENTO</Text><Text style={styles.summaryValue}>{money(monthRevenue)}</Text></View>
        <View style={styles.summarySeparator} />
        <View style={styles.salesSummaryCell}><Text style={styles.summaryLabel}>VENDAS</Text><Text style={styles.summaryValue}>{monthSales.length}</Text></View>
      </View>
      <SectionTitle title="Histórico" />
      <View style={styles.listCard}>
        {monthSales.map((sale, index) => (
          <View key={sale.id} style={[styles.saleHistoryRow, index > 0 && styles.rowDivider]}>
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
        ))}
        {monthSales.length === 0 ? <Text style={styles.emptyText}>Nenhuma venda neste mês.</Text> : null}
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
      <SectionTitle title="Gastos com materiais" action="Adicionar" onPress={() => openForm('expense')} />
      <View style={styles.listCard}>
        {monthExpenses.map((expense, index) => (
          <View key={expense.id} style={[styles.expenseRow, index > 0 && styles.rowDivider]}>
            <View style={styles.expenseIcon}><Text style={styles.expenseIconText}>↙</Text></View>
            <View style={styles.recentSaleCopy}>
              <Text style={styles.recentSaleName}>{expense.description}</Text>
              <Text style={styles.recentSaleDate}>{expense.category} · {formatDate(expense.date)}</Text>
            </View>
            <Text style={styles.expenseAmount}>− {money(expense.amount)}</Text>
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

  const renderField = (label: string, value: string, onChangeText: (text: string) => void, placeholder: string, keyboardType: 'default' | 'decimal-pad' | 'number-pad' = 'default') => (
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
    const title = form === 'product' ? 'Novo produto' : form === 'sale' ? 'Nova venda' : form === 'expense' ? 'Registrar gasto' : 'Criar oferta';
    const canSave = form === 'product' || form === 'sale' || form === 'expense' || form === 'offer';
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
                  <Pressable style={styles.photoPicker} onPress={choosePhoto} accessibilityRole="button">
                    {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoPreview} /> : <View style={styles.photoPlaceholder}><Text style={styles.photoPlaceholderIcon}>＋</Text><Text style={styles.photoPlaceholderText}>Adicionar foto</Text></View>}
                  </Pressable>
                  {renderField('Nome do produto', productName, setProductName, 'Ex.: Caneca de cerâmica')}
                  {renderChoices('Categoria', ['Casa', 'Cerâmica', 'Têxtil', 'Acessórios'], productCategory, setProductCategory)}
                  <View style={styles.formColumns}>
                    <View style={styles.formColumn}>{renderField('Preço de venda', productPrice, setProductPrice, '0,00', 'decimal-pad')}</View>
                    <View style={styles.formColumn}>{renderField('Quantidade', productStock, setProductStock, '0', 'number-pad')}</View>
                  </View>
                  {renderField('Notificar estoque quando chegar a', lowStockAt, setLowStockAt, '2 unidades', 'number-pad')}
                  <Text style={styles.fieldHint}>Você receberá um alerta quando o estoque atingir este limite.</Text>
                </>
              ) : null}
              {form === 'sale' ? (
                <>
                  <Text style={styles.formIntro}>Escolha os produtos e as quantidades desta venda.</Text>
                  {(data.company?.employees ?? []).length > 0 ? (
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
                    const currentPrice = priceFor(product);
                    return (
                      <View key={product.id} style={styles.cartProduct}>
                        <ProductPicture product={product} />
                        <View style={styles.cartProductCopy}>
                          <Text style={styles.cartProductName}>{product.name}</Text>
                          <Text style={styles.cartProductPrice}>{money(currentPrice)} · {product.stock} disponíveis</Text>
                        </View>
                        <View style={styles.quantityStepper}>
                          <Pressable style={styles.stepButton} onPress={() => setCart((current) => ({ ...current, [product.id]: Math.max(0, quantity - 1) }))}><Text style={styles.stepText}>−</Text></Pressable>
                          <Text style={styles.cartQuantity}>{quantity}</Text>
                          <Pressable style={styles.stepButton} onPress={() => setCart((current) => ({ ...current, [product.id]: Math.min(product.stock, quantity + 1) }))}><Text style={styles.stepText}>+</Text></Pressable>
                        </View>
                      </View>
                    );
                  })}
                  <View style={styles.cartTotal}>
                    <Text style={styles.cartTotalLabel}>Total da venda</Text>
                    <Text style={styles.cartTotalValue}>{money(data.products.reduce((sum, product) => sum + (cart[product.id] ?? 0) * priceFor(product), 0))}</Text>
                  </View>
                  {activeOffers.length ? <Text style={styles.fieldHint}>Ofertas ativas já aplicadas ao total.</Text> : null}
                </>
              ) : null}
              {form === 'expense' ? (
                <>
                  <Text style={styles.formIntro}>Registre compras de materiais e despesas do seu negócio.</Text>
                  {renderField('O que você comprou?', expenseName, setExpenseName, 'Ex.: Fios de algodão')}
                  {renderChoices('Categoria', ['Matéria-prima', 'Embalagens', 'Ferramentas', 'Outros'], expenseCategory, setExpenseCategory)}
                  {renderField('Valor da compra', expenseAmount, setExpenseAmount, '0,00', 'decimal-pad')}
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
                  label={form === 'product' ? 'Salvar produto' : form === 'sale' ? 'Confirmar venda' : form === 'expense' ? 'Salvar gasto' : 'Ativar oferta'}
                  onPress={form === 'product' ? saveProduct : form === 'sale' ? saveSale : form === 'expense' ? saveExpense : saveOffer}
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
                {tab === 'products' ? renderProducts() : null}
                {tab === 'sales' ? renderSales() : null}
                {tab === 'management' ? renderManagement() : null}
              </ScrollView>
              <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea}>
                <View style={styles.bottomNavigation}>
                  {tabItems.map((item) => {
                    const selected = tab === item.key;
                    return (
                      <Pressable key={item.key} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setTab(item.key)} style={styles.navItem}>
                        <Text style={[styles.navIcon, selected && styles.navIconSelected]}>{item.icon}</Text>
                        <Text style={[styles.navLabel, selected && styles.navLabelSelected]}>{item.label}</Text>
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

function createStyles(COLORS: Palette) {
  return StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.cream },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.muted, fontSize: 13 },
  setupScreen: { flex: 1 },
  setupContent: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 22 },
  setupBrand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 27 },
  setupEyebrow: { color: COLORS.green, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  setupTitle: { color: COLORS.ink, fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.5, marginTop: 7 },
  setupDescription: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 6 },
  setupSection: { marginTop: 19 },
  businessTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  businessTypeChip: { width: '31.5%', minHeight: 42, borderWidth: 1, borderColor: COLORS.border, borderRadius: 11, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  colorChoiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  colorChoice: { width: '31.5%', minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 11, backgroundColor: COLORS.white, paddingHorizontal: 8 },
  colorChoiceSelected: { backgroundColor: COLORS.paleGreen },
  colorSwatch: { width: 16, height: 16, borderRadius: 8 },
  colorChoiceText: { color: COLORS.ink, fontSize: 10, fontWeight: '500', flex: 1 },
  colorCheck: { color: COLORS.green, fontSize: 11, fontWeight: '700' },
  palettePreview: { backgroundColor: COLORS.white, borderRadius: 13, marginTop: 11, padding: 11 },
  palettePreviewLabel: { color: COLORS.muted, fontSize: 8, fontWeight: '700', letterSpacing: 0.9, marginBottom: 8 },
  palettePreviewSwatches: { flexDirection: 'row', gap: 7 },
  palettePreviewSwatch: { flex: 1, height: 17, borderRadius: 6 },
  optionalLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '400' },
  employeeEntry: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  employeeInput: { flex: 1 },
  addEmployeeButton: { width: 46, height: 46, borderRadius: 12, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  addEmployeeText: { color: COLORS.accentOn, fontSize: 25, lineHeight: 28 },
  employeeChipList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 },
  employeeChip: { backgroundColor: COLORS.paleGreen, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  employeeChipText: { color: COLORS.green, fontSize: 10, fontWeight: '600' },
  cancelEditButton: { alignItems: 'center', paddingVertical: 12 },
  cancelEditText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  topBar: { height: 66, backgroundColor: COLORS.cream, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 35, height: 35, borderRadius: 12, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: COLORS.white, fontSize: 21, fontWeight: '700', fontStyle: 'italic' },
  brandName: { color: COLORS.ink, fontSize: 19, fontWeight: '700', letterSpacing: -0.5 },
  brandCaption: { color: COLORS.muted, fontSize: 10, marginTop: -1 },
  notificationButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  notificationIcon: { color: COLORS.ink, fontSize: 19 },
  notificationDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.orange, borderWidth: 1, borderColor: COLORS.white },
  screen: { flex: 1 },
  screenContent: { paddingHorizontal: 22, paddingTop: 16 },
  eyebrow: { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginTop: 5 },
  greeting: { color: COLORS.ink, fontSize: 29, fontWeight: '700', letterSpacing: -0.8, marginTop: 6 },
  greetingAccent: { color: COLORS.orange },
  introCopy: { color: COLORS.muted, fontSize: 14, marginTop: 3, marginBottom: 21 },
  revenueCard: { backgroundColor: COLORS.green, borderRadius: 22, padding: 20, minHeight: 185, overflow: 'hidden' },
  revenueHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  revenueLabel: { color: COLORS.accentOn, fontSize: 10, letterSpacing: 1.2, fontWeight: '700' },
  trendBadge: { backgroundColor: COLORS.accentDeep, borderRadius: 12, paddingVertical: 5, paddingHorizontal: 8 },
  trendText: { color: COLORS.accentOn, fontSize: 10, fontWeight: '600' },
  revenueValue: { color: COLORS.white, fontSize: 31, fontWeight: '700', letterSpacing: -0.9, marginTop: 11 },
  revenueFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  revenueFootnote: { color: COLORS.accentOn, fontSize: 11 },
  sparkline: { height: 39, flexDirection: 'row', alignItems: 'flex-end', gap: 7, marginTop: 16 },
  sparkBar: { flex: 1, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: COLORS.accentMid },
  sparkBarActive: { backgroundColor: COLORS.orange },
  metricRow: { flexDirection: 'row', gap: 11, marginTop: 12 },
  metricCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 18, padding: 14, minHeight: 133 },
  metricIcon: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  metricLabel: { color: COLORS.muted, fontSize: 10, minHeight: 23 },
  metricValue: { color: COLORS.ink, fontSize: 18, fontWeight: '700', marginTop: 2 },
  metricHint: { color: COLORS.muted, fontSize: 10, marginTop: 1 },
  stockAlert: { backgroundColor: COLORS.paleOrange, padding: 13, borderRadius: 15, marginTop: 13, flexDirection: 'row', alignItems: 'center' },
  alertIcon: { height: 31, width: 31, borderRadius: 11, backgroundColor: COLORS.secondarySoft, alignItems: 'center', justifyContent: 'center' },
  alertIconText: { color: COLORS.orange, fontWeight: '700', fontSize: 15 },
  alertCopy: { flex: 1, marginLeft: 10 },
  alertTitle: { fontSize: 12, fontWeight: '700', color: COLORS.ink },
  alertText: { fontSize: 10, color: COLORS.muted, marginTop: 3 },
  chevron: { color: COLORS.orange, fontSize: 23, paddingHorizontal: 3 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 },
  sectionTitle: { color: COLORS.ink, fontWeight: '700', fontSize: 16, letterSpacing: -0.2 },
  linkText: { color: COLORS.green, fontWeight: '600', fontSize: 12 },
  quickActions: { flexDirection: 'row', gap: 10 },
  quickAction: { flex: 1, height: 78, backgroundColor: COLORS.white, borderRadius: 15, alignItems: 'center', justifyContent: 'center', gap: 7 },
  quickIcon: { color: COLORS.green, fontSize: 19, fontWeight: '500' },
  quickLabel: { color: COLORS.ink, fontSize: 10, fontWeight: '600' },
  listCard: { backgroundColor: COLORS.white, borderRadius: 17, paddingHorizontal: 14 },
  recentSale: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  saleIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: COLORS.paleGreen, alignItems: 'center', justifyContent: 'center' },
  saleIconText: { color: COLORS.green, fontSize: 17, fontWeight: '600' },
  recentSaleCopy: { flex: 1, minWidth: 0 },
  recentSaleName: { color: COLORS.ink, fontSize: 12, fontWeight: '600' },
  recentSaleDate: { color: COLORS.muted, fontSize: 10, marginTop: 4 },
  recentSaleAmount: { color: COLORS.ink, fontSize: 12, fontWeight: '700' },
  rowDivider: { borderTopWidth: 1, borderTopColor: COLORS.border },
  emptyText: { color: COLORS.muted, textAlign: 'center', fontSize: 12, paddingVertical: 22 },
  bottomSpacer: { height: 20 },
  bottomSafeArea: { backgroundColor: COLORS.white },
  bottomNavigation: { minHeight: 66, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 7, paddingBottom: Platform.OS === 'android' ? 6 : 1 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, position: 'relative' },
  navIcon: { color: COLORS.muted, fontSize: 19, lineHeight: 23 },
  navIconSelected: { color: COLORS.green, fontWeight: '700' },
  navLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '500' },
  navLabelSelected: { color: COLORS.green, fontWeight: '700' },
  navIndicator: { position: 'absolute', bottom: -7, width: 17, height: 2, borderRadius: 2, backgroundColor: COLORS.green },
  pageEyebrow: { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginTop: 4 },
  pageHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 7, marginBottom: 18 },
  profileEditButton: { minHeight: 35, justifyContent: 'center', borderRadius: 11, backgroundColor: COLORS.paleGreen, paddingHorizontal: 11 },
  profileEditText: { color: COLORS.green, fontSize: 10, fontWeight: '700' },
  pageTitle: { color: COLORS.ink, fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  pageSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  actionButton: { backgroundColor: COLORS.green, borderRadius: 13, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: 17 },
  actionButtonSecondary: { backgroundColor: COLORS.paleGreen, flex: 1, marginTop: 0 },
  actionButtonCompact: { minHeight: 39, borderRadius: 12, paddingHorizontal: 12, marginTop: 0 },
  actionButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  actionButtonTextSecondary: { color: COLORS.green, fontSize: 12 },
  actionButtonTextCompact: { fontSize: 11 },
  searchBox: { height: 45, backgroundColor: COLORS.white, borderRadius: 13, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 14 },
  searchIcon: { color: COLORS.muted, fontSize: 21, marginRight: 8 },
  searchInput: { flex: 1, color: COLORS.ink, fontSize: 13, paddingVertical: 0 },
  inventoryNotice: { backgroundColor: COLORS.paleOrange, borderRadius: 11, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  inventoryNoticeIcon: { color: COLORS.orange, fontWeight: '700', marginRight: 7 },
  inventoryNoticeText: { color: COLORS.secondaryDeep, fontSize: 11, fontWeight: '600' },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  productCard: { width: '48.3%', backgroundColor: COLORS.white, borderRadius: 16, overflow: 'hidden' },
  productCardImageWrap: { position: 'relative' },
  productPicture: { width: 40, height: 40, borderRadius: 13, backgroundColor: COLORS.paleGreen, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  productPictureLarge: { width: '100%', height: 136, borderRadius: 0, backgroundColor: COLORS.canvasShade },
  productImage: { width: '100%', height: '100%' },
  picturePlaceholder: { color: COLORS.green, fontSize: 23 },
  offerPill: { position: 'absolute', left: 9, top: 9, backgroundColor: COLORS.orange, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4 },
  offerPillText: { color: COLORS.white, fontSize: 8, fontWeight: '700', letterSpacing: 0.6 },
  productCardContent: { padding: 11 },
  productCategory: { color: COLORS.muted, fontSize: 8, letterSpacing: 1, fontWeight: '700' },
  productName: { color: COLORS.ink, fontSize: 12, fontWeight: '700', marginTop: 4 },
  productPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  productPrice: { color: COLORS.green, fontSize: 13, fontWeight: '700' },
  oldPrice: { color: COLORS.muted, fontSize: 9, textDecorationLine: 'line-through' },
  productStockRow: { borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8 },
  stockLabel: { color: COLORS.muted, fontSize: 8 },
  stockLabelLow: { color: COLORS.red },
  quantityStepper: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  stepButton: { width: 24, height: 24, borderRadius: 8, backgroundColor: COLORS.paleGreen, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: COLORS.ink, fontSize: 16, lineHeight: 19 },
  stockCount: { color: COLORS.ink, fontSize: 11, fontWeight: '700', minWidth: 11, textAlign: 'center' },
  stockCountLow: { color: COLORS.red },
  emptyState: { textAlign: 'center', color: COLORS.muted, fontSize: 13, marginTop: 28 },
  monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 13, height: 45, paddingHorizontal: 8, marginBottom: 13 },
  monthArrow: { height: 34, width: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  monthArrowText: { color: COLORS.green, fontSize: 24, lineHeight: 27 },
  monthSelectorLabel: { color: COLORS.ink, fontWeight: '600', fontSize: 12, textTransform: 'capitalize' },
  salesSummary: { backgroundColor: COLORS.green, borderRadius: 17, padding: 17, flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  salesSummaryCell: { flex: 1 },
  summaryLabel: { color: COLORS.accentOn, fontSize: 9, letterSpacing: 1, fontWeight: '700' },
  summaryValue: { color: COLORS.white, fontSize: 19, fontWeight: '700', marginTop: 6 },
  summarySeparator: { width: 1, height: 34, backgroundColor: COLORS.accentMid, marginHorizontal: 13 },
  saleHistoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  savingsText: { color: COLORS.orange, fontSize: 9, marginTop: 4, fontWeight: '600' },
  financeCard: { backgroundColor: COLORS.white, borderRadius: 18, padding: 17, marginBottom: 13 },
  financeEyebrow: { color: COLORS.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.1, marginBottom: 14 },
  financeLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
  financeLabel: { color: COLORS.muted, fontSize: 12 },
  financeIncome: { color: COLORS.green, fontSize: 12, fontWeight: '600' },
  financeExpense: { color: COLORS.orange, fontSize: 12, fontWeight: '600' },
  financeRule: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 7, marginBottom: 5 },
  financeTotalLabel: { color: COLORS.ink, fontSize: 12, fontWeight: '700' },
  financeTotal: { color: COLORS.ink, fontSize: 16, fontWeight: '700' },
  managementActions: { flexDirection: 'row', gap: 10, marginBottom: 1 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  expenseIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: COLORS.paleOrange, alignItems: 'center', justifyContent: 'center' },
  expenseIconText: { color: COLORS.orange, fontSize: 15, fontWeight: '700' },
  expenseAmount: { color: COLORS.ink, fontSize: 11, fontWeight: '600' },
  offerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  pauseOffer: { backgroundColor: COLORS.paleGreen, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7 },
  pauseOfferText: { color: COLORS.muted, fontSize: 9, fontWeight: '600' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(24, 35, 29, 0.42)' },
  modalSheet: { backgroundColor: COLORS.cream, borderTopLeftRadius: 25, borderTopRightRadius: 25, maxHeight: '91%', paddingHorizontal: 21, paddingBottom: Platform.OS === 'ios' ? 24 : 14 },
  modalHandle: { width: 38, height: 4, borderRadius: 3, backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 10, marginBottom: 5 },
  modalHeader: { height: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: COLORS.ink, fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  closeButton: { width: 32, height: 32, borderRadius: 11, backgroundColor: COLORS.paleGreen, alignItems: 'center', justifyContent: 'center' },
  closeButtonText: { color: COLORS.ink, fontSize: 22, lineHeight: 24 },
  modalContent: { paddingBottom: 17 },
  photoPicker: { alignSelf: 'center', marginVertical: 8, width: 94, height: 94, borderRadius: 19, overflow: 'hidden', backgroundColor: COLORS.paleGreen },
  photoPreview: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photoPlaceholderIcon: { color: COLORS.green, fontSize: 25, lineHeight: 29 },
  photoPlaceholderText: { color: COLORS.green, fontSize: 9, fontWeight: '600', marginTop: 3 },
  fieldGroup: { marginTop: 14 },
  fieldLabel: { color: COLORS.ink, fontSize: 11, fontWeight: '600', marginBottom: 7 },
  fieldInput: { minHeight: 46, borderRadius: 12, backgroundColor: COLORS.white, paddingHorizontal: 13, color: COLORS.ink, fontSize: 13 },
  fieldHint: { color: COLORS.muted, fontSize: 10, marginTop: 7, lineHeight: 15 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choiceChip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 11, backgroundColor: COLORS.white },
  choiceChipSelected: { borderColor: COLORS.green, backgroundColor: COLORS.paleGreen },
  choiceText: { color: COLORS.muted, fontSize: 10, fontWeight: '500' },
  choiceTextSelected: { color: COLORS.green, fontWeight: '700' },
  formColumns: { flexDirection: 'row', gap: 10 },
  formColumn: { flex: 1 },
  formIntro: { color: COLORS.muted, fontSize: 12, marginBottom: 7, lineHeight: 18 },
  cartProduct: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  cartProductCopy: { flex: 1 },
  cartProductName: { color: COLORS.ink, fontSize: 11, fontWeight: '600' },
  cartProductPrice: { color: COLORS.muted, fontSize: 9, marginTop: 4 },
  cartQuantity: { color: COLORS.ink, fontSize: 12, fontWeight: '700', minWidth: 11, textAlign: 'center' },
  cartTotal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 15 },
  cartTotalLabel: { color: COLORS.ink, fontSize: 13, fontWeight: '600' },
  cartTotalValue: { color: COLORS.green, fontSize: 18, fontWeight: '700' },
  horizontalChoices: { gap: 7 },
  productChoice: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, paddingVertical: 9, paddingHorizontal: 11, borderRadius: 10 },
  productChoiceSelected: { borderColor: COLORS.green, backgroundColor: COLORS.paleGreen },
  productChoiceText: { color: COLORS.muted, fontSize: 10 },
  productChoiceTextSelected: { color: COLORS.green, fontWeight: '700' },
  offerPreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.paleGreen, borderRadius: 13, marginTop: 14, padding: 13 },
  offerPreviewLabel: { color: COLORS.green, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  offerPreviewValue: { color: COLORS.green, fontSize: 16, fontWeight: '700' },
  });
}

type ThemeContextValue = {
  palette: Palette;
  styles: ReturnType<typeof createStyles>;
};

const ThemeContext = createContext<ThemeContextValue>({
  palette: DEFAULT_PALETTE,
  styles: createStyles(DEFAULT_PALETTE),
});
