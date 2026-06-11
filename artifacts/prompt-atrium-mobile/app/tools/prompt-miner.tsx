import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Badge } from "@/components/ui";
import { minerAnalyze, type MinedPrompt } from "@/lib/api";
import { makeLocalPrompt } from "@/lib/local";
import { useSaved } from "@/lib/saved";
import { useColors } from "@/hooks/useColors";

type Mode = "text" | "image";

export default function PromptMinerScreen() {
  const colors = useColors();
  const { add } = useSaved();

  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [image, setImage] = useState<{ uri: string; base64: string; mimeType?: string } | null>(
    null,
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MinedPrompt[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function onPickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.7,
    });
    if (res.canceled || !res.assets?.[0]?.base64) return;
    const asset = res.assets[0];
    setImage({ uri: asset.uri, base64: asset.base64!, mimeType: asset.mimeType });
    setResults([]);
    setError(null);
  }

  async function onAnalyze() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setSavedIds(new Set());
    try {
      const res =
        mode === "text"
          ? await minerAnalyze({ taskType: "text", name: "Pasted text", data: text.trim() })
          : await minerAnalyze({
              taskType: "image",
              name: "Picked image",
              base64: image!.base64,
              mimeType: image!.mimeType ?? "image/jpeg",
            });
      if (!res.prompts?.length) {
        setError("No prompts could be extracted from that input.");
      } else {
        setResults(res.prompts);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  async function onCopy(p: MinedPrompt) {
    await Clipboard.setStringAsync(p.content);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId((c) => (c === p.id ? null : c)), 1600);
  }

  function onSave(p: MinedPrompt) {
    add(
      makeLocalPrompt({
        name: p.title || p.content.slice(0, 60) || "Mined prompt",
        promptContent: p.content,
        negativePrompt: p.negativePrompt ?? null,
        tags: p.tags && p.tags.length ? p.tags : null,
        intendedGenerator: p.model ?? null,
        sourceUrl: p.source ?? null,
        exampleImagesUrl: p.images && p.images.length ? p.images : null,
      }),
    );
    setSavedIds((prev) => new Set(prev).add(p.id));
  }

  const canAnalyze = mode === "text" ? text.trim().length > 0 : !!image;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.lead, { color: colors.mutedForeground }]}>
        Extract clean, structured prompts from messy text or an image.
      </Text>

      <View style={[styles.tabs, { backgroundColor: colors.secondary, borderRadius: colors.radius + 2 }]}>
        {(["text", "image"] as Mode[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => {
              setMode(m);
              setResults([]);
              setError(null);
            }}
            style={[
              styles.tab,
              {
                backgroundColor: mode === m ? colors.primary : "transparent",
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather
              name={m === "text" ? "type" : "image"}
              size={15}
              color={mode === m ? colors.primaryForeground : colors.secondaryForeground}
            />
            <Text
              style={[
                styles.tabText,
                { color: mode === m ? colors.primaryForeground : colors.secondaryForeground },
              ]}
            >
              {m === "text" ? "Text" : "Image"}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === "text" ? (
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Paste an article, post, or any text that mentions prompts…"
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
      ) : (
        <Pressable
          onPress={onPickImage}
          style={[
            styles.imagePick,
            { backgroundColor: colors.input, borderColor: colors.border, borderRadius: colors.radius + 2 },
          ]}
        >
          {image ? (
            <Image source={{ uri: image.uri }} style={styles.preview} contentFit="cover" />
          ) : (
            <View style={styles.imagePickEmpty}>
              <Feather name="upload" size={22} color={colors.mutedForeground} />
              <Text style={[styles.imagePickText, { color: colors.mutedForeground }]}>
                Tap to choose an image
              </Text>
            </View>
          )}
        </Pressable>
      )}

      <Pressable
        onPress={onAnalyze}
        disabled={!canAnalyze || loading}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: colors.primary,
            opacity: !canAnalyze || loading ? 0.5 : pressed ? 0.85 : 1,
            borderRadius: colors.radius + 2,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Feather name="search" size={16} color={colors.primaryForeground} />
            <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Analyze</Text>
          </>
        )}
      </Pressable>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.muted, borderColor: colors.destructive }]}>
          <Feather name="alert-triangle" size={16} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.secondaryForeground }]}>{error}</Text>
        </View>
      ) : null}

      {results.map((p) => {
        const isSaved = savedIds.has(p.id);
        return (
          <View
            key={p.id}
            style={[
              styles.resultCard,
              { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius + 4 },
            ]}
          >
            <Text style={[styles.resultTitle, { color: colors.foreground }]}>{p.title}</Text>
            <Text style={[styles.resultText, { color: colors.secondaryForeground }]} selectable>
              {p.content}
            </Text>
            {p.negativePrompt ? (
              <Text style={[styles.negative, { color: colors.mutedForeground }]} selectable>
                Negative: {p.negativePrompt}
              </Text>
            ) : null}
            {(p.model || (p.tags && p.tags.length)) ? (
              <View style={styles.badges}>
                {p.model ? <Badge label={p.model} /> : null}
                {(p.tags ?? []).slice(0, 4).map((t) => (
                  <Badge key={t} label={t} />
                ))}
              </View>
            ) : null}
            <View style={styles.resultActions}>
              <Pressable
                onPress={() => onCopy(p)}
                style={({ pressed }) => [
                  styles.smallBtn,
                  { backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Feather
                  name={copiedId === p.id ? "check" : "copy"}
                  size={15}
                  color={colors.secondaryForeground}
                />
                <Text style={[styles.smallBtnText, { color: colors.secondaryForeground }]}>
                  {copiedId === p.id ? "Copied" : "Copy"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onSave(p)}
                disabled={isSaved}
                style={({ pressed }) => [
                  styles.smallBtn,
                  { backgroundColor: isSaved ? colors.muted : colors.primary, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Feather
                  name={isSaved ? "check" : "bookmark"}
                  size={15}
                  color={isSaved ? colors.mutedForeground : colors.primaryForeground}
                />
                <Text
                  style={[
                    styles.smallBtnText,
                    { color: isSaved ? colors.mutedForeground : colors.primaryForeground },
                  ]}
                >
                  {isSaved ? "Saved" : "Save"}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 16, paddingBottom: 56 },
  lead: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  tabs: { flexDirection: "row", padding: 4, gap: 4 },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
  },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  input: {
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 130,
    textAlignVertical: "top",
  },
  imagePick: { borderWidth: 1, borderStyle: "dashed", overflow: "hidden", minHeight: 160 },
  imagePickEmpty: { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 56 },
  imagePickText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  preview: { width: "100%", height: 220 },
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
  resultTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  resultText: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular" },
  negative: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  resultActions: { flexDirection: "row", gap: 10, marginTop: 2 },
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
