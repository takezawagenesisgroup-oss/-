import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { AI_CHAT_UNLOCK_PRICE_JPY } from '../purchases';

type Props = {
  visible: boolean;
  purchasing: boolean;
  onUnlock: () => void;
  onRestore: () => void;
  onClose: () => void;
};

export function ChatPaywallModal({ visible, purchasing, onUnlock, onRestore, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.eyebrow}>AIと話すモード</Text>
          <Text style={styles.title}>¥{AI_CHAT_UNLOCK_PRICE_JPY}</Text>
          <Text style={styles.body}>
            気配の声を聴きながら、AIと会話できるモードです。話しかけると、選んだキャラの声で返事をします。
          </Text>
          <Text style={styles.note}>
            ※現在はお試し版です。AI応答は簡易的な固定フレーズで返っています。本格的な会話生成には別途サーバー連携が必要なため、今後のアップデートで順次強化していきます。
          </Text>

          <Pressable style={[styles.primaryButton, purchasing && styles.buttonDisabled]} onPress={onUnlock} disabled={purchasing}>
            {purchasing ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.primaryButtonText}>¥{AI_CHAT_UNLOCK_PRICE_JPY} で解放する</Text>}
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
  backdrop: { flex: 1, backgroundColor: 'rgba(10,6,10,0.72)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  sheet: { width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm },
  eyebrow: { color: colors.accent2, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800' },
  body: { color: colors.textMuted, fontSize: 13.5, lineHeight: 20 },
  note: { color: colors.textMuted, fontSize: 11.5, lineHeight: 17, marginBottom: spacing.xs },
  primaryButton: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: spacing.sm + 2, alignItems: 'center', marginTop: spacing.xs },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: colors.bg, fontWeight: '800', fontSize: 15 },
  restoreButton: { alignItems: 'center', paddingVertical: spacing.sm },
  restoreText: { color: colors.accent2, fontSize: 13, fontWeight: '600' },
  closeButton: { alignItems: 'center', paddingTop: spacing.xs },
  closeText: { color: colors.textMuted, fontSize: 13 },
});
