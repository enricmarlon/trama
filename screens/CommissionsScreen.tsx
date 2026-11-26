import { useContext, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import ActionButton from '../components/ActionButton';
import SectionTitle from '../components/SectionTitle';
import { ThemeContext } from '../theme/ThemeContext';
import type { Sale, SaleItem } from '../types';
import { formatNumericDate, money } from '../utils';

type CommissionEntry = {
  sale: Sale;
  item: SaleItem;
  itemIndex: number;
};

type CommissionsScreenProps = {
  sales: Sale[];
  onMarkPaid: (saleId: string, itemIndex: number) => void;
  onUndoPaid: (saleId: string, itemIndex: number) => void;
};

function entryKey(entry: CommissionEntry) {
  return `${entry.sale.id}:${entry.itemIndex}`;
}

export default function CommissionsScreen({ sales, onMarkPaid, onUndoPaid }: CommissionsScreenProps) {
  const { styles } = useContext(ThemeContext);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const entries = sales.flatMap((sale) => sale.items
    .map((item, itemIndex) => ({ sale, item, itemIndex }))
    .filter(({ item }) => Boolean(item.commissionEmployee) && (item.commissionAmount ?? 0) > 0));
  const pendingEntries = entries.filter(({ item }) => !item.commissionPaidDate);
  const paidEntries = entries.filter(({ item }) => Boolean(item.commissionPaidDate));
  const selectedEntries = pendingEntries.filter((entry) => selectedKeys.includes(entryKey(entry)));
  const allPendingSelected = pendingEntries.length > 0 && selectedEntries.length === pendingEntries.length;
  const pendingTotal = pendingEntries.reduce((sum, { item }) => sum + (item.commissionAmount ?? 0), 0);
  const paidTotal = paidEntries.reduce((sum, { item }) => sum + (item.commissionAmount ?? 0), 0);

  const markSelectedAsPaid = () => {
    selectedEntries.forEach(({ sale, itemIndex }) => onMarkPaid(sale.id, itemIndex));
    setSelectedKeys([]);
  };

  return (
    <>
      <Text style={styles.pageEyebrow}>REPASSE AOS FABRICANTES</Text>
      <View style={styles.pageHeadingRow}>
        <View>
          <Text style={styles.pageTitle}>Comissões</Text>
          <Text style={styles.pageSubtitle}>Acompanhe e registre os pagamentos por item vendido.</Text>
        </View>
      </View>

      <View style={styles.metricRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>A pagar</Text>
          <Text style={styles.metricValue}>{money(pendingTotal)}</Text>
          <Text style={styles.metricHint}>{pendingEntries.length} item(ns)</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Pagas</Text>
          <Text style={styles.metricValue}>{money(paidTotal)}</Text>
          <Text style={styles.metricHint}>{paidEntries.length} item(ns)</Text>
        </View>
      </View>

      <SectionTitle
        title={`A pagar (${pendingEntries.length})`}
        action={pendingEntries.length > 0 ? allPendingSelected ? 'Limpar seleção' : 'Selecionar todas' : undefined}
        onPress={() => setSelectedKeys(allPendingSelected ? [] : pendingEntries.map(entryKey))}
      />
      {selectedEntries.length > 0 ? (
        <ActionButton
          label={`Marcar ${selectedEntries.length} selecionada(s) como paga(s)`}
          onPress={markSelectedAsPaid}
          compact
        />
      ) : null}
      <View style={styles.listCard}>
        {pendingEntries.map((entry, index) => {
          const selected = selectedKeys.includes(entryKey(entry));
          return (
            <View key={entryKey(entry)} style={[styles.orderCard, index > 0 && styles.rowDivider]}>
              <View style={styles.orderHeader}>
                <View style={styles.orderCustomerCopy}>
                  <Text style={styles.recentSaleName}>{entry.item.name}</Text>
                  <Text style={styles.recentSaleDate}>
                    {entry.item.commissionEmployee} · {entry.item.quantity} un. · {entry.item.commissionPercent ?? 0}%
                  </Text>
                </View>
                <Text style={styles.recentSaleAmount}>{money(entry.item.commissionAmount ?? 0)}</Text>
              </View>
              <Text style={styles.recentSaleDate}>Venda em {formatNumericDate(entry.sale.date)}</Text>
              <Pressable
                onPress={() => setSelectedKeys((current) => selected
                  ? current.filter((key) => key !== entryKey(entry))
                  : [...current, entryKey(entry)])}
                style={[styles.orderCompleteButton, selected && styles.orderUndoButton]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.orderCompleteText, selected && styles.orderUndoText]}>
                  {selected ? 'Selecionada' : 'Selecionar comissão'}
                </Text>
              </Pressable>
            </View>
          );
        })}
        {pendingEntries.length === 0 ? <Text style={styles.emptyText}>Nenhuma comissão pendente.</Text> : null}
      </View>

      <SectionTitle title={`Pagas (${paidEntries.length})`} />
      <View style={styles.listCard}>
        {paidEntries.map((entry, index) => (
          <View key={entryKey(entry)} style={[styles.orderCard, index > 0 && styles.rowDivider]}>
            <View style={styles.orderHeader}>
              <View style={styles.orderCustomerCopy}>
                <Text style={styles.recentSaleName}>{entry.item.name}</Text>
                <Text style={styles.recentSaleDate}>
                  {entry.item.commissionEmployee} · {entry.item.quantity} un. · {entry.item.commissionPercent ?? 0}%
                </Text>
              </View>
              <Text style={styles.recentSaleAmount}>{money(entry.item.commissionAmount ?? 0)}</Text>
            </View>
            <Text style={styles.recentSaleDate}>Venda em {formatNumericDate(entry.sale.date)}</Text>
            <Text style={styles.orderStatusDelivered}>
              Paga em {entry.item.commissionPaidDate ? formatNumericDate(entry.item.commissionPaidDate) : ''}
            </Text>
            <Pressable
              onPress={() => onUndoPaid(entry.sale.id, entry.itemIndex)}
              style={styles.orderUndoButton}
              accessibilityRole="button"
              accessibilityLabel={`Desfazer pagamento da comissão de ${entry.item.name}`}
            >
              <Text style={styles.orderUndoText}>Desfazer pagamento</Text>
            </Pressable>
          </View>
        ))}
        {paidEntries.length === 0 ? <Text style={styles.emptyText}>Nenhuma comissão marcada como paga.</Text> : null}
      </View>
      <View style={styles.bottomSpacer} />
    </>
  );
}
