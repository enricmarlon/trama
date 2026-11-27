import { useContext } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionButton from '../components/ActionButton';
import ProductPicture from '../components/ProductPicture';
import { ThemeContext } from '../theme/ThemeContext';
import type useStoreData from '../hooks/useStoreData';
import { formatDateInput, money, parseAmount, supplyDaysRemaining } from '../utils';

type StoreDataState = ReturnType<typeof useStoreData>;

export type FormModalProps = Pick<StoreDataState,
  'form'
  | 'editingProductId'
  | 'editingSaleId'
  | 'editingExpenseId'
  | 'data'
  | 'photoUri'
  | 'setPhotoUri'
  | 'choosePhoto'
  | 'productName'
  | 'setProductName'
  | 'productCategoryOptions'
  | 'productCategory'
  | 'setProductCategory'
  | 'productPrice'
  | 'setProductPrice'
  | 'productStock'
  | 'setProductStock'
  | 'lowStockAt'
  | 'setLowStockAt'
  | 'productMakerEmployee'
  | 'setProductMakerEmployee'
  | 'productCommissionPercent'
  | 'setProductCommissionPercent'
  | 'productDiscountType'
  | 'setProductDiscountType'
  | 'productDiscountValue'
  | 'setProductDiscountValue'
  | 'editingSale'
  | 'selectedEmployee'
  | 'setSelectedEmployee'
  | 'saleDate'
  | 'setSaleDate'
  | 'cart'
  | 'setCart'
  | 'cartDiscounts'
  | 'setCartDiscounts'
  | 'saleUnitPrice'
  | 'offerFor'
  | 'activeOffers'
  | 'orderCustomerName'
  | 'setOrderCustomerName'
  | 'orderPhone'
  | 'setOrderPhone'
  | 'orderDeliveryDate'
  | 'setOrderDeliveryDate'
  | 'orderAlertDays'
  | 'setOrderAlertDays'
  | 'orderCart'
  | 'setOrderCart'
  | 'orderCartDiscounts'
  | 'setOrderCartDiscounts'
  | 'priceFor'
  | 'expenseName'
  | 'setExpenseName'
  | 'expenseCategory'
  | 'setExpenseCategory'
  | 'expenseAmount'
  | 'setExpenseAmount'
  | 'supplyName'
  | 'setSupplyName'
  | 'supplyCategoryOptions'
  | 'supplyCategory'
  | 'setSupplyCategory'
  | 'supplyQuantity'
  | 'setSupplyQuantity'
  | 'supplyDailyUse'
  | 'setSupplyDailyUse'
  | 'offerName'
  | 'setOfferName'
  | 'offerProductId'
  | 'setOfferProductId'
  | 'discountType'
  | 'setDiscountType'
  | 'discountValue'
  | 'setDiscountValue'
  | 'closeForm'
  | 'saveProduct'
  | 'saveSale'
  | 'saveOrder'
  | 'saveExpense'
  | 'saveSupply'
  | 'saveOffer'
>;

export default function FormModal(props: FormModalProps) {
  const { palette, styles } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const {
    form,
    editingProductId,
    editingSaleId,
    editingExpenseId,
    data,
    photoUri,
    setPhotoUri,
    choosePhoto,
    productName,
    setProductName,
    productCategoryOptions,
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
    editingSale,
    selectedEmployee,
    setSelectedEmployee,
    saleDate,
    setSaleDate,
    cart,
    setCart,
    cartDiscounts,
    setCartDiscounts,
    saleUnitPrice,
    offerFor,
    activeOffers,
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
    priceFor,
    expenseName,
    setExpenseName,
    expenseCategory,
    setExpenseCategory,
    expenseAmount,
    setExpenseAmount,
    supplyName,
    setSupplyName,
    supplyCategoryOptions,
    supplyCategory,
    setSupplyCategory,
    supplyQuantity,
    setSupplyQuantity,
    supplyDailyUse,
    setSupplyDailyUse,
    offerName,
    setOfferName,
    offerProductId,
    setOfferProductId,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    closeForm,
    saveProduct,
    saveSale,
    saveOrder,
    saveExpense,
    saveSupply,
    saveOffer
  } = props;

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
    const title = form === 'product' ? editingProductId ? 'Editar produto' : 'Novo produto' : form === 'sale' ? editingSaleId !== null ? 'Editar venda' : 'Nova venda' : form === 'order' ? 'Novo pedido' : form === 'expense' ? editingExpenseId ? 'Editar gasto' : 'Registrar gasto' : form === 'supply' ? 'Novo insumo' : 'Criar oferta';
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
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 24 : 14) }]}>
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
                  {!editingSale ? (
                    <>
                      {renderField(
                        'Data da venda (opcional)',
                        saleDate,
                        (value) => setSaleDate(formatDateInput(value)),
                        'DD/MM/AAAA',
                        'number-pad',
                      )}
                      <Text style={styles.fieldHint}>Deixe em branco para registrar a venda com a data de hoje.</Text>
                    </>
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
                      {renderField(
                        'Data de entrega',
                        orderDeliveryDate,
                        (value) => setOrderDeliveryDate(formatDateInput(value)),
                        'DD/MM/AAAA',
                        'number-pad',
                      )}
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
                  label={form === 'product' ? editingProductId ? 'Salvar alterações' : 'Salvar produto' : form === 'sale' ? editingSaleId !== null ? 'Salvar alterações' : 'Confirmar venda' : form === 'order' ? 'Salvar pedido' : form === 'expense' ? editingExpenseId ? 'Salvar alterações' : 'Salvar gasto' : form === 'supply' ? 'Salvar insumo' : 'Ativar oferta'}
                  onPress={form === 'product' ? saveProduct : form === 'sale' ? saveSale : form === 'order' ? saveOrder : form === 'expense' ? saveExpense : form === 'supply' ? saveSupply : saveOffer}
                />
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  return renderForm();
}
