import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import {
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
import { BASE_COLORS, BUSINESS_TYPES } from './constants';
import {
  createPalette,
  dateDifferenceInDays,
  deliveryCountdown,
  formatDate,
  formatLongDate,
  money,
  parseAmount,
  supplyDaysRemaining,
} from './utils';
import { createStyles, ThemeContext } from './theme/ThemeContext';
import type { Tab } from './types';
import ActionButton from './components/ActionButton';
import ProductPicture from './components/ProductPicture';
import SectionTitle from './components/SectionTitle';
import AlertsScreen from './screens/AlertsScreen';
import CommissionsScreen from './screens/CommissionsScreen';
import ProductsScreen from './screens/ProductsScreen';
import SettingsScreen from './screens/SettingsScreen';
import useStoreData from './hooks/useStoreData';

export default function App() {
  const storeData = useStoreData();
  const {
    data,
    loaded,
    backupBusy,
    tab,
    setTab,
    form,
    editingProductId,
    editingExpenseId,
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
  } = storeData;

  const activeColor = data.company && !editingCompany ? data.company.baseColor : selectedColor;
  const palette = useMemo(() => createPalette(activeColor), [activeColor]);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const theme = useMemo(() => ({ palette, styles }), [palette, styles]);

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
    const title = form === 'product' ? editingProductId ? 'Editar produto' : 'Novo produto' : form === 'sale' ? editingSale ? 'Editar venda' : 'Nova venda' : form === 'order' ? 'Novo pedido' : form === 'expense' ? editingExpenseId ? 'Editar gasto' : 'Registrar gasto' : form === 'supply' ? 'Novo insumo' : 'Criar oferta';
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
                  <Pressable
                    style={styles.photoPicker}
                    onPress={() => choosePhoto('gallery')}
                    accessibilityRole="button"
                    accessibilityLabel={photoUri ? 'Alterar foto do produto' : 'Adicionar foto do produto'}
                  >
                    {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoPreview} /> : <View style={styles.photoPlaceholder}><Text style={styles.photoPlaceholderIcon}>＋</Text><Text style={styles.photoPlaceholderText}>Foto do produto</Text></View>}
                  </Pressable>
                  {photoUri ? (
                    <Pressable onPress={() => setPhotoUri(undefined)} style={styles.cancelEditButton} accessibilityRole="button">
                      <Text style={styles.cancelEditText}>Remover foto</Text>
                    </Pressable>
                  ) : null}
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
                  label={form === 'product' ? editingProductId ? 'Salvar alterações' : 'Salvar produto' : form === 'sale' ? editingSale ? 'Salvar alterações' : 'Confirmar venda' : form === 'order' ? 'Salvar pedido' : form === 'expense' ? editingExpenseId ? 'Salvar alterações' : 'Salvar gasto' : form === 'supply' ? 'Salvar insumo' : 'Ativar oferta'}
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
                    editProduct={openProductForEditing}
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
