import { useContext } from 'react';
import { Pressable, Text, View } from 'react-native';
import ActionButton from '../components/ActionButton';
import SectionTitle from '../components/SectionTitle';
import { ThemeContext } from '../theme/ThemeContext';
import type useStoreData from '../hooks/useStoreData';
import { formatNumericDate, money } from '../utils';

type StoreState = ReturnType<typeof useStoreData>;
type SalesScreenProps = Pick<StoreState,
  'openForm'
  | 'changeMonth'
  | 'monthLabel'
  | 'salesEmployeeOptions'
  | 'setSalesEmployeeFilter'
  | 'activeSalesEmployeeFilter'
  | 'reportRevenue'
  | 'reportSales'
  | 'openSaleForEditing'
  | 'deleteSale'
>;

export default function SalesScreen({
  openForm,
  changeMonth,
  monthLabel,
  salesEmployeeOptions,
  setSalesEmployeeFilter,
  activeSalesEmployeeFilter,
  reportRevenue,
  reportSales,
  openSaleForEditing,
  deleteSale
}: SalesScreenProps) {
  const { styles } = useContext(ThemeContext);
  return (
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
                  {formatNumericDate(sale.date)} · {sale.items.reduce((sum, item) => sum + item.quantity, 0)} item(ns)
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
}
