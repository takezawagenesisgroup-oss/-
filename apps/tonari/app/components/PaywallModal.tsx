import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { UNLOCK_PRICE_JPY } from '../personas';

type Props = {
  visible: boolean;
  purchasing: boolean;
  onUnlock: () => void;
  onRestore: () => void;
  onClose: () => void;
};

export function PaywallModal({ visible, purchasing, onUnlock, onRestore, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.eyebrow}>「友人」「恋人」を解放</Text>
          <Text style={styles.title}>買い切り ¥{UNLOCK_PRICE_JPY}</Text>
          <Text style={styles.body}>サブスクなし。一度購入すれば、2つの口調をずっと使えます。声の高さ(女性寄り/男性寄り)はいつでも切り替え可能です。</Text>

          <Pressable style={[styles.primaryButton, purchasing && styles.buttonDisabled]} onPress={onUnlock} disabled={purchasing}>
            {purchasing ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.primaryButtonText}>¥{UNLOCK_PRICE_JPY} で解放する</Text>}
          </Pressable>
          <Pressable onPress={onRestore} disabled={purchasing} style={styles.restoreButton}>
            <Text style={styles.restoreText}>購入を復元</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>閉じる</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,8,6,0.72)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  sheet: { width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm },
  eyebrow: { color: colors.accent, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800' },
  body: { color: colors.textMuted, fontSize: 13.5, lineHeight: 20, marginBottom: spacing.xs },
  primaryButton: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: spacing.sm + 2, alignItems: 'center', marginTop: spacing.xs },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: colors.bg, fontWeight: '800', fontSize: 15 },
  restoreButton: { alignItems: 'center', paddingVertical: spacing.sm },
  restoreText: { color: colors.accent2, fontSize: 13, fontWeight: '600' },
  closeButton: { alignItems: 'center', paddingTop: spacing.xs },
  closeText: { color: colors.textMuted, fontSize: 13 },
});
