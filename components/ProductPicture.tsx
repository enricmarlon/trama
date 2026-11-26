import { useContext } from 'react';
import { Image, Text, View } from 'react-native';
import { ThemeContext } from '../theme/ThemeContext';
import type { Product } from '../types';

type ProductPictureProps = {
  product: Product;
  large?: boolean;
};

export default function ProductPicture({ product, large = false }: ProductPictureProps) {
  const { styles } = useContext(ThemeContext);
  return (
    <View style={[styles.productPicture, large && styles.productPictureLarge]}>
      {product.imageUri ? (
        <Image source={{ uri: product.imageUri }} style={styles.productImage} />
      ) : (
        <Text style={styles.picturePlaceholder}>✿</Text>
      )}
    </View>
  );
}
