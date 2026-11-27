import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { createPalette } from './utils';
import { createStyles, ThemeContext } from './theme/ThemeContext';
import type { Tab } from './types';
import AlertsScreen from './screens/AlertsScreen';
import CommissionsScreen from './screens/CommissionsScreen';
import CompanySetupScreen from './screens/CompanySetupScreen';
import HomeScreen from './screens/HomeScreen';
import ManagementScreen from './screens/ManagementScreen';
import OrdersScreen from './screens/OrdersScreen';
import ProductsScreen from './screens/ProductsScreen';
import SalesScreen from './screens/SalesScreen';
import SettingsScreen from './screens/SettingsScreen';
import SuppliesScreen from './screens/SuppliesScreen';
import FormModal from './modals/FormModal';
import useStoreData from './hooks/useStoreData';

export default function App() {
  const storeData = useStoreData();
  const { data, loaded, tab, setTab, editingCompany, selectedColor } = storeData;

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
            <CompanySetupScreen
              editingCompany={storeData.editingCompany}
              businessType={storeData.businessType}
              setBusinessType={storeData.setBusinessType}
              customBusinessType={storeData.customBusinessType}
              setCustomBusinessType={storeData.setCustomBusinessType}
              businessName={storeData.businessName}
              setBusinessName={storeData.setBusinessName}
              selectedColor={storeData.selectedColor}
              setSelectedColor={storeData.setSelectedColor}
              employeeDraft={storeData.employeeDraft}
              setEmployeeDraft={storeData.setEmployeeDraft}
              addEmployee={storeData.addEmployee}
              employees={storeData.employees}
              setEmployees={storeData.setEmployees}
              backupBusy={storeData.backupBusy}
              importBackup={storeData.importBackup}
              saveCompanyProfile={storeData.saveCompanyProfile}
              setEditingCompany={storeData.setEditingCompany}
            />
          ) : (
            <>
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
              <ScrollView
                style={styles.screen}
                contentContainerStyle={styles.screenContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {tab === 'home' ? (
                  <HomeScreen
                    data={data}
                    revenueTrend={storeData.revenueTrend}
                    monthRevenue={storeData.monthRevenue}
                    monthSales={storeData.monthSales}
                    monthLabel={storeData.monthLabel}
                    revenueBars={storeData.revenueBars}
                    maxRevenueBar={storeData.maxRevenueBar}
                    monthSpent={storeData.monthSpent}
                    lowStockProducts={storeData.lowStockProducts}
                    lowStockSupplies={storeData.lowStockSupplies}
                    alertingOrders={storeData.alertingOrders}
                    setTab={setTab}
                    openForm={storeData.openForm}
                  />
                ) : null}
                {tab === 'products' ? (
                  <ProductsScreen
                    visibleProducts={storeData.visibleProducts}
                    totalProducts={data.products.length}
                    lowStockCount={storeData.lowStockProducts.length}
                    query={storeData.query}
                    setQuery={storeData.setQuery}
                    openForm={storeData.openForm}
                    editProduct={storeData.openProductForEditing}
                    deleteProduct={storeData.deleteProduct}
                    changeStock={storeData.changeStock}
                    offerFor={storeData.offerFor}
                    priceFor={storeData.priceFor}
                  />
                ) : null}
                {tab === 'sales' ? (
                  <SalesScreen
                    openForm={storeData.openForm}
                    changeMonth={storeData.changeMonth}
                    monthLabel={storeData.monthLabel}
                    salesEmployeeOptions={storeData.salesEmployeeOptions}
                    setSalesEmployeeFilter={storeData.setSalesEmployeeFilter}
                    activeSalesEmployeeFilter={storeData.activeSalesEmployeeFilter}
                    reportRevenue={storeData.reportRevenue}
                    reportSales={storeData.reportSales}
                    openSaleForEditing={storeData.openSaleForEditing}
                    deleteSale={storeData.deleteSale}
                  />
                ) : null}
                {tab === 'commissions' ? (
                  <CommissionsScreen
                    sales={data.sales}
                    onMarkPaid={storeData.markCommissionPaid}
                    onUndoPaid={storeData.undoCommissionPayment}
                  />
                ) : null}
                {tab === 'orders' ? (
                  <OrdersScreen
                    pendingOrders={storeData.pendingOrders}
                    data={data}
                    openForm={storeData.openForm}
                    alertingOrders={storeData.alertingOrders}
                    today={storeData.today}
                    markOrderDelivered={storeData.markOrderDelivered}
                    undoOrderDelivery={storeData.undoOrderDelivery}
                  />
                ) : null}
                {tab === 'supplies' ? (
                  <SuppliesScreen
                    data={data}
                    openForm={storeData.openForm}
                    lowStockSupplies={storeData.lowStockSupplies}
                    suppliesWithStock={storeData.suppliesWithStock}
                    changeSupplyStock={storeData.changeSupplyStock}
                  />
                ) : null}
                {tab === 'alerts' ? (
                  <AlertsScreen
                    orders={storeData.alertingOrders}
                    products={storeData.lowStockProducts}
                    supplies={storeData.lowStockSupplies}
                    today={storeData.today}
                    onNavigate={setTab}
                  />
                ) : null}
                {tab === 'management' ? (
                  <ManagementScreen
                    editCompanyProfile={storeData.editCompanyProfile}
                    monthLabel={storeData.monthLabel}
                    changeMonth={storeData.changeMonth}
                    monthRevenue={storeData.monthRevenue}
                    monthSpent={storeData.monthSpent}
                    openForm={storeData.openForm}
                    backupBusy={storeData.backupBusy}
                    exportBackup={storeData.exportBackup}
                    importBackup={storeData.importBackup}
                    monthExpenses={storeData.monthExpenses}
                    openExpenseForEditing={storeData.openExpenseForEditing}
                    deleteExpense={storeData.deleteExpense}
                    data={data}
                    toggleOffer={storeData.toggleOffer}
                  />
                ) : null}
                {tab === 'settings' ? (
                  <SettingsScreen
                    productCategories={storeData.productCategoryOptions}
                    supplyCategories={storeData.supplyCategoryOptions}
                    employees={data.company?.employees ?? []}
                    onAddCategory={storeData.addManagedCategory}
                    onRenameCategory={storeData.renameManagedCategory}
                    onRemoveCategory={storeData.removeManagedCategory}
                    onAddEmployee={storeData.addManagedEmployee}
                    onRenameEmployee={storeData.renameManagedEmployee}
                    onRemoveEmployee={storeData.removeManagedEmployee}
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
                        {item.key === 'alerts' && storeData.lowStockCount + storeData.alertingOrders.length > 0
                          ? <View style={styles.navNotificationDot} />
                          : null}
                        {selected ? <View style={styles.navIndicator} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </SafeAreaView>
              <FormModal {...storeData} />
            </>
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    </ThemeContext.Provider>
  );
}
