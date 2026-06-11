import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Badge } from "@/components/ui";
import {
  extractMetadataFromBase64,
  formatFileSize,
  type ExtractedMetadata,
} from "@/lib/metadata";
import { makeLocalPrompt } from "@/lib/local";
import { useSaved } from "@/lib/saved";
import { useColors } from "@/hooks/useColors";

const GENERATOR_LABELS: Record<string, string> = {
  "stable-diffusion": "Stable Diffusion",
  midjourney: "Midjourney",
  comfyui: "ComfyUI",
  "dall-e": "DALL·E",
  unknown: "Unknown",
};

/** Read a picked file as base64/data-URL without re-encoding (preserves metadata). */
async function readAsBase64(asset: DocumentPicker.DocumentPickerAsset): Promise<string> {
  if (Platform.OS === "web") {
    const file = (asset as unknown as { file?: File }).file;
    const blob = file ?? (await (await fetch(asset.uri)).blob());
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
      reader.readAsDataURL(blob);
    });
  }
  return await FileSystem.readAsStringAsync(asset.uri, { encoding: "base64" });
}

function Row({ label, value }: { label: string; value?: string | number }) {
  const colors = useColors();
  if (value === undefined || value === null || value === "") return null;
  return (
    <View style={[styles.row, { borderTopColor: colors.border }]}>
      <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.foreground }]} selectable>
        {String(value)}
      </Text>
    </View>
  );
}

export default function MetadataAnalyzerScreen() {
  const colors = useColors();
  const { add } = useSaved();

  const [uri, setUri] = useState<string | null>(null);
  const [meta, setMeta] = useState<ExtractedMetadata | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onPick() {
    const res = await DocumentPicker.getDocumentAsync({
      type: ["image/png", "image/jpeg", "image/webp", "image/*"],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setUri(asset.uri);
    setBusy(true);
    setMeta(null);
    setError(null);
    setCopied(false);
    setSaved(false);
    try {
      const base64 = await readAsBase64(asset);
      const extracted = extractMetadataFromBase64({
        base64,
        fileName: asset.name,
        fileSize: asset.size ?? undefined,
        mimeType: asset.mimeType,
      });
      setMeta(extracted);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    } finally {
      setBusy(false);
    }
  }

  async function onCopyPrompt() {
    if (!meta?.prompt) return;
    await Clipboard.setStringAsync(meta.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function onSavePrompt() {
    if (!meta?.prompt) return;
    add(
      makeLocalPrompt({
        name: meta.prompt.slice(0, 60),
        promptContent: meta.prompt,
        negativePrompt: meta.negativePrompt ?? null,
        intendedGenerator: meta.aiGenerator !== "unknown" ? meta.aiGenerator : null,
        sourceUrl: meta.fileName ?? null,
      }),
    );
    setSaved(true);
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.lead, { color: colors.mutedForeground }]}>
        Read the AI generation data embedded in an image — prompt, model, and settings. Reads the
        original file so metadata isn&apos;t stripped.
      </Text>

      <Pressable
        onPress={onPick}
        style={[
          styles.pick,
          { backgroundColor: colors.input, borderColor: colors.border, borderRadius: colors.radius + 2 },
        ]}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.preview} contentFit="cover" />
        ) : (
          <View style={styles.pickEmpty}>
            <Feather name="image" size={24} color={colors.mutedForeground} />
            <Text style={[styles.pickText, { color: colors.mutedForeground }]}>
              Tap to choose an image file
            </Text>
          </View>
        )}
      </Pressable>

      {uri ? (
        <Pressable
          onPress={onPick}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.secondary, opacity: pressed ? 0.85 : 1, borderRadius: colors.radius + 2 },
          ]}
        >
          <Feather name="refresh-ccw" size={15} color={colors.secondaryForeground} />
          <Text style={[styles.buttonText, { color: colors.secondaryForeground }]}>
            Choose another
          </Text>
        </Pressable>
      ) : null}

      {busy ? (
        <Text style={[styles.lead, { color: colors.mutedForeground, textAlign: "center" }]}>
          Reading metadata…
        </Text>
      ) : null}

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.muted, borderColor: colors.destructive }]}>
          <Feather name="alert-triangle" size={16} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.secondaryForeground }]}>{error}</Text>
        </View>
      ) : null}

      {meta ? (
        <>
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: colors.card,
                borderColor: meta.isAIGenerated ? colors.primary : colors.border,
                borderRadius: colors.radius + 4,
              },
            ]}
          >
            <Feather
              name={meta.isAIGenerated ? "cpu" : "help-circle"}
              size={18}
              color={meta.isAIGenerated ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.statusText, { color: colors.foreground }]}>
              {meta.isAIGenerated
                ? `AI generated — ${GENERATOR_LABELS[meta.aiGenerator]}`
                : "No AI generation data detected"}
            </Text>
          </View>

          {meta.prompt ? (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius + 4 },
              ]}
            >
              <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Prompt</Text>
              <Text style={[styles.promptText, { color: colors.foreground }]} selectable>
                {meta.prompt}
              </Text>
              {meta.negativePrompt ? (
                <Text style={[styles.negative, { color: colors.mutedForeground }]} selectable>
                  Negative: {meta.negativePrompt}
                </Text>
              ) : null}
              <View style={styles.actions}>
                <Pressable
                  onPress={onCopyPrompt}
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
                  onPress={onSavePrompt}
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
                    {saved ? "Saved" : "Save to library"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius + 4 },
            ]}
          >
            <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Details</Text>
            <Row label="File" value={meta.fileName} />
            <Row label="Type" value={meta.fileType} />
            <Row label="Size" value={meta.fileSize ? formatFileSize(meta.fileSize) : undefined} />
            <Row label="Dimensions" value={meta.dimensionString} />
            <Row label="Aspect ratio" value={meta.aspectRatio} />
            <Row label="Model" value={meta.model} />
            <Row label="Steps" value={meta.steps} />
            <Row label="CFG scale" value={meta.cfgScale} />
            <Row label="Sampler" value={meta.sampler} />
            <Row label="Scheduler" value={meta.scheduler} />
            <Row label="Seed" value={meta.seed} />
            <Row label="MJ version" value={meta.mjVersion} />
            <Row label="MJ aspect" value={meta.mjAspectRatio} />
            <Row label="MJ chaos" value={meta.mjChaos} />
            <Row label="Job ID" value={meta.mjJobId} />
          </View>

          {meta.warnings.length ? (
            <View style={[styles.warnBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              {meta.warnings.map((w, i) => (
                <View key={i} style={styles.warnRow}>
                  <Feather name="info" size={14} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                  <Text style={[styles.warnText, { color: colors.mutedForeground }]}>{w}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 14, paddingBottom: 56 },
  lead: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  pick: { borderWidth: 1, borderStyle: "dashed", overflow: "hidden", minHeight: 160 },
  pickEmpty: { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 56 },
  pickText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  preview: { width: "100%", height: 240 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
  },
  buttonText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  errorBox: { flexDirection: "row", gap: 10, alignItems: "center", borderWidth: 1, borderRadius: 10, padding: 12 },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, padding: 14 },
  statusText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  card: { borderWidth: 1, padding: 16, gap: 8 },
  cardLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  promptText: { fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular" },
  negative: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  smallBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 16, paddingTop: 8, borderTopWidth: 1 },
  rowLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  rowValue: { fontSize: 13, fontFamily: "Inter_500Medium", flexShrink: 1, textAlign: "right" },
  warnBox: { borderWidth: 1, borderRadius: 10, padding: 14, gap: 8 },
  warnRow: { flexDirection: "row", gap: 8 },
  warnText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
});
