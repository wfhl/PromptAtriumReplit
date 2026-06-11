import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { normalizeToPrompt } from "@/lib/local";
import { useSaved } from "@/lib/saved";
import { useColors } from "@/hooks/useColors";
import type { Prompt } from "@/lib/api";

/** Parse a CSV string into records, handling quoted fields and commas. */
function parseCSV(input: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);
  }
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = (r[i] ?? "").trim()));
    return obj;
  });
}

/** Try to extract an array of prompt-like records from arbitrary text. */
function parsePrompts(raw: string): Prompt[] {
  const text = raw.trim();
  if (!text) return [];
  const records: unknown[] = [];

  // 1. JSON (array, or object with a prompts/data/items array, or single object)
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      records.push(...parsed);
    } else if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      const arr = obj.prompts ?? obj.data ?? obj.items ?? obj.results;
      if (Array.isArray(arr)) records.push(...arr);
      else records.push(parsed);
    }
  } catch {
    // 2. JSONL (one JSON object per line)
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const jsonl: unknown[] = [];
    let jsonlOk = lines.length > 0;
    for (const line of lines) {
      try {
        jsonl.push(JSON.parse(line));
      } catch {
        jsonlOk = false;
        break;
      }
    }
    if (jsonlOk) {
      records.push(...jsonl);
    } else {
      // 3. CSV best-effort
      records.push(...parseCSV(text));
    }
  }

  const prompts: Prompt[] = [];
  for (const rec of records) {
    const p = normalizeToPrompt(rec);
    if (p) prompts.push(p);
  }
  return prompts;
}

export default function ImportPromptsScreen() {
  const colors = useColors();
  const { addMany } = useSaved();

  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<Prompt[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [imported, setImported] = useState(0);

  function handleParse(raw: string, name?: string) {
    setError(null);
    setImported(0);
    setFileName(name ?? null);
    const prompts = parsePrompts(raw);
    if (!prompts.length) {
      setParsed(null);
      setError(
        "Couldn't find any prompts. Supported formats: JSON array, JSONL, or CSV with a name/prompt column.",
      );
      return;
    }
    setParsed(prompts);
  }

  async function onChooseFile() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/csv", "text/plain", "text/*", "*/*"],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      let content = "";
      if (Platform.OS === "web") {
        const file = (asset as unknown as { file?: File }).file;
        content = file ? await file.text() : await (await fetch(asset.uri)).text();
      } else {
        content = await FileSystem.readAsStringAsync(asset.uri);
      }
      setText(content);
      handleParse(content, asset.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    }
  }

  function onImport() {
    if (!parsed?.length) return;
    addMany(parsed);
    setImported(parsed.length);
    setParsed(null);
    setText("");
    setFileName(null);
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.lead, { color: colors.mutedForeground }]}>
        Bring prompts into your local library from a JSON, JSONL, or CSV file — or paste them below.
      </Text>

      <Pressable
        onPress={onChooseFile}
        style={({ pressed }) => [
          styles.fileBtn,
          { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.85 : 1, borderRadius: colors.radius + 2 },
        ]}
      >
        <Feather name="file-plus" size={18} color={colors.secondaryForeground} />
        <Text style={[styles.fileBtnText, { color: colors.secondaryForeground }]}>
          {fileName ?? "Choose a file"}
        </Text>
      </Pressable>

      <Text style={[styles.or, { color: colors.mutedForeground }]}>or paste content</Text>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder='[{"name": "My prompt", "prompt": "a serene mountain lake at dawn"}]'
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

      <Pressable
        onPress={() => handleParse(text)}
        disabled={!text.trim()}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: colors.secondary,
            opacity: !text.trim() ? 0.5 : pressed ? 0.85 : 1,
            borderRadius: colors.radius + 2,
          },
        ]}
      >
        <Feather name="eye" size={16} color={colors.secondaryForeground} />
        <Text style={[styles.buttonText, { color: colors.secondaryForeground }]}>Preview</Text>
      </Pressable>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.muted, borderColor: colors.destructive }]}>
          <Feather name="alert-triangle" size={16} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.secondaryForeground }]}>{error}</Text>
        </View>
      ) : null}

      {imported > 0 ? (
        <View style={[styles.successBox, { backgroundColor: colors.muted, borderColor: colors.primary }]}>
          <Feather name="check-circle" size={16} color={colors.primary} />
          <Text style={[styles.errorText, { color: colors.secondaryForeground }]}>
            Added {imported} {imported === 1 ? "prompt" : "prompts"} to your library.
          </Text>
        </View>
      ) : null}

      {parsed?.length ? (
        <View
          style={[
            styles.previewCard,
            { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius + 4 },
          ]}
        >
          <Text style={[styles.previewTitle, { color: colors.foreground }]}>
            {parsed.length} {parsed.length === 1 ? "prompt" : "prompts"} found
          </Text>
          {parsed.slice(0, 6).map((p) => (
            <View key={p.id} style={[styles.previewRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.previewName, { color: colors.foreground }]} numberOfLines={1}>
                {p.name}
              </Text>
              {p.promptContent ? (
                <Text style={[styles.previewBody, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {p.promptContent}
                </Text>
              ) : null}
            </View>
          ))}
          {parsed.length > 6 ? (
            <Text style={[styles.previewMore, { color: colors.mutedForeground }]}>
              + {parsed.length - 6} more
            </Text>
          ) : null}

          <Pressable
            onPress={onImport}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, borderRadius: colors.radius + 2, marginTop: 6 },
            ]}
          >
            <Feather name="download" size={16} color={colors.primaryForeground} />
            <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
              Add {parsed.length} to library
            </Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 14, paddingBottom: 56 },
  lead: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  fileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    paddingVertical: 18,
  },
  fileBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  or: { fontSize: 12, textAlign: "center", fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 120,
    textAlignVertical: "top",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
  },
  buttonText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  errorBox: { flexDirection: "row", gap: 10, alignItems: "center", borderWidth: 1, borderRadius: 10, padding: 12 },
  successBox: { flexDirection: "row", gap: 10, alignItems: "center", borderWidth: 1, borderRadius: 10, padding: 12 },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  previewCard: { borderWidth: 1, padding: 16, gap: 8 },
  previewTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  previewRow: { paddingTop: 10, borderTopWidth: 1, gap: 3 },
  previewName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  previewBody: { fontSize: 13, lineHeight: 18, fontFamily: "Inter_400Regular" },
  previewMore: { fontSize: 12, fontFamily: "Inter_500Medium", paddingTop: 4 },
});
