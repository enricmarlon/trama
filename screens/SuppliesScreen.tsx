import { useContext } from 'react';
import { Pressable, Text, View } from 'react-native';
import ActionButton from '../components/ActionButton';
import { ThemeContext } from '../theme/ThemeContext';
import type useStoreData from '../hooks/useStoreData';
import { supplyDaysRemaining } from '../utils';

type StoreState = ReturnType<typeof useStoreData>;
type SuppliesScreenProps = Pick<StoreState,
  'data'
  | 'openForm'
  | 'lowStockSupplies'
  | 'suppliesWithStock'
  | 'changeSupplyStock'
>;

export default function SuppliesScreen({
  data,
  openForm,
  lowStockSupplies,
  suppliesWithStock,
  changeSupplyStock
}: SuppliesScreenProps) {
  const { styles } = useContext(ThemeContext);
  return (
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
}
