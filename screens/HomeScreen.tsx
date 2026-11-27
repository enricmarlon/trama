import { useContext } from 'react';
import { Pressable, Text, View } from 'react-native';
import SectionTitle from '../components/SectionTitle';
import { ThemeContext } from '../theme/ThemeContext';
import type useStoreData from '../hooks/useStoreData';
import { formatDate, money } from '../utils';

type StoreState = ReturnType<typeof useStoreData>;
type HomeScreenProps = Pick<StoreState,
  'data'
  | 'revenueTrend'
  | 'monthRevenue'
  | 'monthSales'
  | 'monthLabel'
  | 'revenueBars'
  | 'maxRevenueBar'
  | 'monthSpent'
  | 'lowStockProducts'
  | 'lowStockSupplies'
  | 'alertingOrders'
  | 'setTab'
  | 'openForm'
>;

export default function HomeScreen({
  data,
  revenueTrend,
  monthRevenue,
  monthSales,
  monthLabel,
  revenueBars,
  maxRevenueBar,
  monthSpent,
  lowStockProducts,
  lowStockSupplies,
  alertingOrders,
  setTab,
  openForm
}: HomeScreenProps) {
  const { palette, styles } = useContext(ThemeContext);
  return (
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
}
