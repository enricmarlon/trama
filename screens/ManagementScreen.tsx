import { useContext } from 'react';
import { Pressable, Text, View } from 'react-native';
import ActionButton from '../components/ActionButton';
import ProductPicture from '../components/ProductPicture';
import SectionTitle from '../components/SectionTitle';
import { ThemeContext } from '../theme/ThemeContext';
import type useStoreData from '../hooks/useStoreData';
import { formatDate, money } from '../utils';

type StoreState = ReturnType<typeof useStoreData>;
type ManagementScreenProps = Pick<StoreState,
  'editCompanyProfile'
  | 'monthLabel'
  | 'changeMonth'
  | 'monthRevenue'
  | 'monthSpent'
  | 'openForm'
  | 'monthExpenses'
  | 'openExpenseForEditing'
  | 'deleteExpense'
  | 'data'
  | 'toggleOffer'
>;

export default function ManagementScreen({
  editCompanyProfile,
  monthLabel,
  changeMonth,
  monthRevenue,
  monthSpent,
  openForm,
  monthExpenses,
  openExpenseForEditing,
  deleteExpense,
  data,
  toggleOffer
}: ManagementScreenProps) {
  const { styles } = useContext(ThemeContext);
  return (
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
}
