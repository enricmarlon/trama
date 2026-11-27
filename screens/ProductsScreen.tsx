import { useContext } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import ActionButton from '../components/ActionButton';
import ProductPicture from '../components/ProductPicture';
import { ThemeContext } from '../theme/ThemeContext';
import type { FormType, Offer, Product } from '../types';
import { money } from '../utils';

type ProductsScreenProps = {
  visibleProducts: Product[];
  totalProducts: number;
  lowStockCount: number;
  query: string;
  setQuery: (query: string) => void;
  openForm: (next: Exclude<FormType, null>) => void;
  editProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  changeStock: (productId: string, adjustment: number) => void;
  offerFor: (productId: string) => Offer | undefined;
  priceFor: (product: Product) => number;
};

export default function ProductsScreen({
  visibleProducts,
  totalProducts,
  lowStockCount,
  query,
  setQuery,
  openForm,
  editProduct,
  deleteProduct,
  changeStock,
  offerFor,
  priceFor,
}: ProductsScreenProps) {
  const { palette, styles } = useContext(ThemeContext);

  return (
    <>
      <Text style={styles.pageEyebrow}>SEU CATÁLOGO</Text>
      <View style={styles.pageHeadingRow}>
        <View>
          <Text style={styles.pageTitle}>Produtos</Text>
          <Text style={styles.pageSubtitle}>{totalProducts} produtos cadastrados</Text>
        </View>
        <ActionButton label="+ Adicionar" onPress={() => openForm('product')} compact />
      </View>
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar produto..."
          placeholderTextColor={palette.muted}
          style={styles.searchInput}
        />
      </View>
      {lowStockCount > 0 ? (
        <View style={styles.inventoryNotice}>
          <Text style={styles.inventoryNoticeIcon}>!</Text>
          <Text style={styles.inventoryNoticeText}>{lowStockCount} produto(s) com estoque baixo</Text>
        </View>
      ) : null}
      <View style={styles.productGrid}>
        {visibleProducts.map((product) => {
          const low = product.stock <= product.lowStockAt;
          const offer = offerFor(product.id);
          return (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productCardImageWrap}>
                <ProductPicture product={product} large />
                {offer ? <View style={styles.offerPill}><Text style={styles.offerPillText}>OFERTA</Text></View> : null}
              </View>
              <View style={styles.productCardContent}>
                <Text style={styles.productCategory}>{product.category.toUpperCase()}</Text>
                <View style={styles.productNameRow}>
                  <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                </View>
                <View style={styles.productPriceRow}>
                  <Text style={styles.productPrice}>{money(priceFor(product))}</Text>
                  {offer ? <Text style={styles.oldPrice}>{money(product.price)}</Text> : null}
                </View>
                <View style={styles.productActionsRow}>
                  <Pressable
                    style={styles.saleActionButton}
                    onPress={() => editProduct(product)}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar ${product.name}`}
                  >
                    <Text style={styles.saleActionText}>Editar</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.saleActionButton, styles.saleActionDanger]}
                    onPress={() => deleteProduct(product.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Excluir ${product.name}`}
                  >
                    <Text style={[styles.saleActionText, styles.saleActionDangerText]}>Excluir</Text>
                  </Pressable>
                </View>
                <View style={styles.productStockRow}>
                  <Text style={[styles.stockLabel, low && styles.stockLabelLow]}>{low ? 'Estoque baixo' : 'Em estoque'}</Text>
                  <View style={styles.quantityStepper}>
                    <Pressable
                      style={styles.stepButton}
                      onPress={() => changeStock(product.id, -1)}
                      accessibilityLabel={`Remover uma unidade de ${product.name}`}
                    >
                      <Text style={styles.stepText}>−</Text>
                    </Pressable>
                    <Text style={[styles.stockCount, low && styles.stockCountLow]}>{product.stock}</Text>
                    <Pressable
                      style={styles.stepButton}
                      onPress={() => changeStock(product.id, 1)}
                      accessibilityLabel={`Adicionar uma unidade de ${product.name}`}
                    >
                      <Text style={styles.stepText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </View>
      {visibleProducts.length === 0 ? (
        <Text style={styles.emptyState}>Nenhum produto encontrado. Tente outra busca.</Text>
      ) : null}
      <View style={styles.bottomSpacer} />
    </>
  );
}
