import { useContext } from 'react';
import { Pressable, Text, View } from 'react-native';
import ActionButton from '../components/ActionButton';
import { ThemeContext } from '../theme/ThemeContext';
import type useStoreData from '../hooks/useStoreData';
import { dateDifferenceInDays, deliveryCountdown, formatLongDate, money } from '../utils';

type StoreState = ReturnType<typeof useStoreData>;
type OrdersScreenProps = Pick<StoreState,
  'pendingOrders'
  | 'data'
  | 'openForm'
  | 'alertingOrders'
  | 'today'
  | 'markOrderDelivered'
  | 'undoOrderDelivery'
>;

export default function OrdersScreen({
  pendingOrders,
  data,
  openForm,
  alertingOrders,
  today,
  markOrderDelivered,
  undoOrderDelivery
}: OrdersScreenProps) {
  const { styles } = useContext(ThemeContext);
  return (
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
}
