import { useContext } from 'react';
import { Text, View } from 'react-native';
import SectionTitle from '../components/SectionTitle';
import { ThemeContext } from '../theme/ThemeContext';
import type { CustomerOrder, Product, Supply, Tab } from '../types';
import { dateDifferenceInDays, deliveryCountdown, formatLongDate, supplyDaysRemaining } from '../utils';

type AlertsScreenProps = {
  orders: CustomerOrder[];
  products: Product[];
  supplies: { supply: Supply; quantity: number }[];
  today: string;
  onNavigate: (tab: Tab) => void;
};

export default function AlertsScreen({ orders, products, supplies, today, onNavigate }: AlertsScreenProps) {
  const { styles } = useContext(ThemeContext);
  const alertCount = orders.length + products.length + supplies.length;

  return (
    <>
      <Text style={styles.pageEyebrow}>ACOMPANHAMENTO DO NEGÓCIO</Text>
      <View style={styles.pageHeadingRow}>
        <View>
          <Text style={styles.pageTitle}>Alertas</Text>
          <Text style={styles.pageSubtitle}>
            {alertCount === 0 ? 'Nenhum alerta pendente' : `${alertCount} alerta(s) precisam da sua atenção`}
          </Text>
        </View>
      </View>

      <SectionTitle title={`Pedidos (${orders.length})`} action="Ver pedidos" onPress={() => onNavigate('orders')} />
      <View style={styles.listCard}>
        {orders.map((order, index) => {
          const daysUntilDelivery = dateDifferenceInDays(today, order.deliveryDate);
          return (
            <View key={order.id} style={[styles.orderCard, index > 0 && styles.rowDivider]}>
              <Text style={styles.recentSaleName}>{order.customerName}</Text>
              <Text style={styles.orderCountdown}>{deliveryCountdown(daysUntilDelivery)}</Text>
              <Text style={styles.recentSaleDate}>Entrega: {formatLongDate(order.deliveryDate)}</Text>
              <Text style={styles.orderItems}>
                {order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')}
              </Text>
            </View>
          );
        })}
        {orders.length === 0 ? <Text style={styles.emptyText}>Nenhum pedido dentro do prazo de alerta.</Text> : null}
      </View>

      <SectionTitle title={`Estoque (${products.length})`} action="Ver produtos" onPress={() => onNavigate('products')} />
      <View style={styles.listCard}>
        {products.map((product, index) => (
          <View key={product.id} style={[styles.supplyRow, index > 0 && styles.rowDivider]}>
            <View style={styles.alertIcon}><Text style={styles.alertIconText}>!</Text></View>
            <View style={styles.recentSaleCopy}>
              <Text style={styles.recentSaleName}>{product.name}</Text>
              <Text style={[styles.recentSaleDate, styles.stockLabelLow]}>
                {product.stock} disponível(is) · alerta em {product.lowStockAt} ou menos
              </Text>
            </View>
          </View>
        ))}
        {products.length === 0 ? <Text style={styles.emptyText}>Nenhum produto com estoque baixo.</Text> : null}
      </View>

      <SectionTitle title={`Insumos (${supplies.length})`} action="Ver insumos" onPress={() => onNavigate('supplies')} />
      <View style={styles.listCard}>
        {supplies.map(({ supply, quantity }, index) => {
          const daysRemaining = supplyDaysRemaining(supply.dailyUse, quantity);
          return (
            <View key={supply.id} style={[styles.supplyRow, index > 0 && styles.rowDivider]}>
              <View style={styles.alertIcon}><Text style={styles.alertIconText}>!</Text></View>
              <View style={styles.recentSaleCopy}>
                <Text style={styles.recentSaleName}>{supply.name}</Text>
                <Text style={[styles.recentSaleDate, styles.stockLabelLow]}>
                  {quantity} unidade(s) · {daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
                </Text>
              </View>
            </View>
          );
        })}
        {supplies.length === 0 ? <Text style={styles.emptyText}>Nenhum insumo abaixo de 2 unidades.</Text> : null}
      </View>
      <View style={styles.bottomSpacer} />
    </>
  );
}
