import { useContext } from 'react';
import { Pressable, Text } from 'react-native';
import { ThemeContext } from '../theme/ThemeContext';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  compact?: boolean;
};

export default function ActionButton({
  label,
  onPress,
  secondary = false,
  compact = false,
}: ActionButtonProps) {
  const { styles } = useContext(ThemeContext);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.actionButton, secondary && styles.actionButtonSecondary, compact && styles.actionButtonCompact]}
    >
      <Text style={[styles.actionButtonText, secondary && styles.actionButtonTextSecondary, compact && styles.actionButtonTextCompact]}>
        {label}
      </Text>
    </Pressable>
  );
}
