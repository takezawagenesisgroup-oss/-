import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { getAIResponse, type ChatMessage } from '../aiChat';
import { useSpeechInput } from '../useSpeechInput';

type Props = {
  visible: boolean;
  personaLabel: string;
  onClose: () => void;
  onSpeak: (text: string) => void;
};

export function ChatModal({ visible, personaLabel, onClose, onSpeak }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);

  const speech = useSpeechInput((text) => {
    setDraft(text);
  });

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    const nextHistory = [...messages, { role: 'user' as const, text: trimmed }];
    setMessages(nextHistory);
    setDraft('');
    setThinking(true);
    try {
      const reply = await getAIResponse(trimmed, nextHistory);
      setMessages((prev) => [...prev, { role: 'ai', text: reply }]);
      onSpeak(reply);
    } finally {
      setThinking(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{personaLabel}と話す</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>閉じる</Text>
            </Pressable>
          </View>
          <Text style={styles.betaNote}>お試し版: 応答は簡易的な固定フレーズです</Text>

          <ScrollView style={styles.history} contentContainerStyle={styles.historyContent}>
            {messages.length === 0 ? (
              <Text style={styles.emptyHint}>下のボックスに話しかけたいことを入力してみてください。</Text>
            ) : null}
            {messages.map((m, i) => (
              <View key={i} style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAi]}>
                <Text style={styles.bubbleText}>{m.text}</Text>
              </View>
            ))}
            {thinking ? (
              <View style={[styles.bubble, styles.bubbleAi]}>
                <ActivityIndicator color={colors.accent2} />
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.inputRow}>
            {speech.isSupported ? (
              <Pressable
                onPress={() => (speech.listening ? speech.stop() : speech.start())}
                style={[styles.micButton, speech.listening && styles.micButtonActive]}
              >
                <Text style={styles.micButtonText}>{speech.listening ? '⏹' : '🎤'}</Text>
              </Pressable>
            ) : null}
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="話しかけてみる..."
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={() => send(draft)}
              editable={!thinking}
            />
            <Pressable onPress={() => send(draft)} disabled={thinking || !draft.trim()} style={[styles.sendButton, (thinking || !draft.trim()) && styles.sendButtonDisabled]}>
              <Text style={styles.sendButtonText}>送信</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,6,10,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  closeButton: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  closeText: { color: colors.textMuted, fontSize: 13 },
  betaNote: { color: colors.accent2, fontSize: 11, fontWeight: '600' },
  history: { minHeight: 160 },
  historyContent: { gap: spacing.sm, paddingVertical: spacing.sm },
  emptyHint: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: spacing.lg },
  bubble: { maxWidth: '85%', borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: colors.surfaceActive },
  bubbleAi: { alignSelf: 'flex-start', backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.borderActive },
  bubbleText: { color: colors.text, fontSize: 14.5, lineHeight: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  micButton: { width: 40, height: 40, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  micButtonActive: { borderColor: colors.danger, backgroundColor: colors.surfaceActive },
  micButtonText: { fontSize: 18 },
  input: { flex: 1, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, fontSize: 14 },
  sendButton: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { color: colors.bg, fontWeight: '800', fontSize: 13.5 },
});
