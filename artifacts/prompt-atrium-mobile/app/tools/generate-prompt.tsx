import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { Chip } from "@/components/ui";
import {
  enhancePrompt,
  usePresets,
  useTemplates,
  type CharacterPreset,
  type PromptTemplate,
} from "@/lib/api";
import { makeLocalPrompt } from "@/lib/local";
import { useSaved } from "@/lib/saved";
import { useColors } from "@/hooks/useColors";

export default function GeneratePromptScreen() {
  const colors = useColors();
  const { add } = useSaved();
  const templates = useTemplates();
  const presets = usePresets();

  const [idea, setIdea] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [happyTalk, setHappyTalk] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectedTemplate = templates.data?.find((t) => t.id === templateId) ?? null;
  const selectedPreset = presets.data?.find((p) => String(p.id) === presetId) ?? null;

  async function onGenerate() {
    const prompt = idea.trim();
    if (!prompt || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);
    try {
      const character = selectedPreset
        ? {
            name: selectedPreset.name,
            description: selectedPreset.description ?? undefined,
          }
        : undefined;
      const res = await enhancePrompt({
        prompt,
        useHappyTalk: happyTalk,
        customBasePrompt: selectedTemplate?.master_prompt ?? undefined,
        character,
      });
      setResult(res.enhancedPrompt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate a prompt.");
    } finally {
      setLoading(false);
    }
  }

  async function onCopy() {
    if (!result) return;
    await Clipboard.setStringAsync(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function onSave() {
    if (!result) return;
    add(
      makeLocalPrompt({
        name: idea.trim().slice(0, 60) || "Generated prompt",
        promptContent: result,
        description: "Generated with PromptAtrium",
        category: selectedTemplate?.template_type ?? null,
        intendedGenerator: "gemini",
      }),
    );
    setSaved(true);
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.lead, { color: colors.mutedForeground }]}>
        Describe your idea and get a richer, more detailed image prompt. Powered by Gemini.
      </Text>

      <TextInput
        value={idea}
        onChangeText={setIdea}
        placeholder="e.g. a fox reading a book in a cozy library"
        placeholderTextColor={colors.mutedForeground}
        multiline
        style={[
          styles.input,
          {
            backgroundColor: colors.input,
            color: colors.foreground,
            borderColor: colors.border,
            borderRadius: colors.radius + 2,
          },
        ]}
      />

      {templates.data && templates.data.length > 0 ? (
        <View style={styles.group}>
          <Text style={[styles.groupLabel, { color: colors.foreground }]}>Style template</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="None" active={!templateId} onPress={() => setTemplateId(null)} />
            {templates.data.map((t: PromptTemplate) => (
              <Chip
                key={t.id}
                label={t.name}
                active={templateId === t.id}
                onPress={() => setTemplateId(templateId === t.id ? null : t.id)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {presets.data && presets.data.length > 0 ? (
        <View style={styles.group}>
          <Text style={[styles.groupLabel, { color: colors.foreground }]}>Character</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="None" active={!presetId} onPress={() => setPresetId(null)} />
            {presets.data.map((p: CharacterPreset) => (
              <Chip
                key={String(p.id)}
                label={p.name}
                active={presetId === String(p.id)}
                onPress={() => setPresetId(presetId === String(p.id) ? null : String(p.id))}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={[styles.switchRow, { borderColor: colors.border, borderRadius: colors.radius + 2 }]}>
        <View style={styles.switchText}>
          <Text style={[styles.switchTitle, { color: colors.foreground }]}>Happy Talk</Text>
          <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>
            Add enthusiastic, descriptive flourishes
          </Text>
        </View>
        <Switch
          value={happyTalk}
          onValueChange={setHappyTalk}
          trackColor={{ true: colors.primary, false: colors.secondary }}
        />
      </View>

      <Pressable
        onPress={onGenerate}
        disabled={!idea.trim() || loading}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: colors.primary,
            opacity: !idea.trim() || loading ? 0.5 : pressed ? 0.85 : 1,
            borderRadius: colors.radius + 2,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Feather name="zap" size={16} color={colors.primaryForeground} />
            <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
              Generate Prompt
            </Text>
          </>
        )}
      </Pressable>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.muted, borderColor: colors.destructive }]}>
          <Feather name="alert-triangle" size={16} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.secondaryForeground }]}>{error}</Text>
        </View>
      ) : null}

      {result ? (
        <View
          style={[
            styles.resultCard,
            { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius + 4 },
          ]}
        >
          <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>Enhanced prompt</Text>
          <Text style={[styles.resultText, { color: colors.foreground }]} selectable>
            {result}
          </Text>
          <View style={styles.resultActions}>
            <Pressable
              onPress={onCopy}
              style={({ pressed }) => [
                styles.smallBtn,
                { backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Feather name={copied ? "check" : "copy"} size={15} color={colors.secondaryForeground} />
              <Text style={[styles.smallBtnText, { color: colors.secondaryForeground }]}>
                {copied ? "Copied" : "Copy"}
              </Text>
            </Pressable>
            <Pressable
              onPress={onSave}
              disabled={saved}
              style={({ pressed }) => [
                styles.smallBtn,
                { backgroundColor: saved ? colors.muted : colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Feather
                name={saved ? "check" : "bookmark"}
                size={15}
                color={saved ? colors.mutedForeground : colors.primaryForeground}
              />
              <Text
                style={[
                  styles.smallBtnText,
                  { color: saved ? colors.mutedForeground : colors.primaryForeground },
                ]}
              >
                {saved ? "Saved to library" : "Save to library"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 16, paddingBottom: 56 },
  lead: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  input: {
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 96,
    textAlignVertical: "top",
  },
  group: { gap: 8 },
  groupLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  chips: { paddingRight: 8 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  switchText: { flex: 1, gap: 2 },
  switchTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  switchSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  buttonText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  errorBox: { flexDirection: "row", gap: 10, alignItems: "center", borderWidth: 1, borderRadius: 10, padding: 12 },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  resultCard: { borderWidth: 1, padding: 16, gap: 10 },
  resultLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  resultText: { fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular" },
  resultActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  smallBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
