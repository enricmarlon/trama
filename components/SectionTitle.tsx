import { useContext } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ThemeContext } from '../theme/ThemeContext';

type SectionTitleProps = {
  title: string;
  action?: string;
  onPress?: () => void;
};

export default function SectionTitle({ title, action, onPress }: SectionTitleProps) {
  const { styles } = useContext(ThemeContext);
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button">
          <Text style={styles.linkText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
