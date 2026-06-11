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

import type { PromptCreateInput, PromptCrudItem } from "../types";
import { TagInput } from "./TagInput";

const PROMPT_TYPES = [
  "Image",
  "Text",
  "Video",
  "Audio",
  "System",
  "Chat",
  "Writing",
  "Code",
  "Other",
];

export interface PromptFormColors {
  foreground: string;
  mutedForeground: string;
  background: string;
  card: string;
  secondary: string;
  secondaryForeground: string;
  primary: string;
  primaryForeground: string;
  input: string;
  border: string;
  muted: string;
  destructive: string;
}

export interface PromptFormProps {
  initial?: Partial<PromptCrudItem>;
  onSubmit: (input: PromptCreateInput) => Promise<void>;
  submitLabel?: string;
  loading?: boolean;
  colors: PromptFormColors;
  radius?: number;
}

export function PromptForm({
  initial,
  onSubmit,
  submitLabel = "Save",
  loading = false,
  colors,
  radius = 8,
}: PromptFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [content, setContent] = useState(initial?.promptContent ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [promptType, setPromptType] = useState<string>(initial?.promptType ?? "");
  const [isPublic, setIsPublic] = useState<boolean>(initial?.isPublic ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!content.trim()) e.content = "Prompt content is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    await onSubmit({
      name: name.trim(),
      promptContent: content.trim(),
      description: description.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      promptType: promptType || undefined,
      isPublic,
    });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Field
        label="Name *"
        error={errors.name}
        colors={colors}
      >
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Cinematic Portrait"
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.textInput,
            {
              color: colors.foreground,
              backgroundColor: colors.input,
              borderColor: errors.name ? colors.destructive : colors.border,
              borderRadius: radius,
            },
          ]}
          autoCapitalize="words"
          returnKeyType="next"
          maxLength={200}
        />
      </Field>

      <Field
        label="Prompt Content *"
        error={errors.content}
        colors={colors}
      >
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Enter your prompt text…"
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.textArea,
            {
              color: colors.foreground,
              backgroundColor: colors.input,
              borderColor: errors.content ? colors.destructive : colors.border,
              borderRadius: radius,
            },
          ]}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={10000}
        />
      </Field>

      <Field label="Description" colors={colors}>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Optional short description…"
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.textArea,
            {
              color: colors.foreground,
              backgroundColor: colors.input,
              borderColor: colors.border,
              borderRadius: radius,
            },
          ]}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={500}
        />
      </Field>

      <Field label="Type" colors={colors}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.typeRow}>
            <TypeChip
              label="None"
              active={promptType === ""}
              onPress={() => setPromptType("")}
              colors={colors}
              radius={radius}
            />
            {PROMPT_TYPES.map((t) => (
              <TypeChip
                key={t}
                label={t}
                active={promptType === t}
                onPress={() => setPromptType(t)}
                colors={colors}
                radius={radius}
              />
            ))}
          </View>
        </ScrollView>
      </Field>

      <Field label="Tags" colors={colors}>
        <TagInput
          tags={tags}
          onChange={setTags}
          placeholder="Type a tag and press enter…"
          colors={colors}
          radius={radius}
        />
      </Field>

      <View style={[styles.visibilityRow, { borderColor: colors.border }]}>
        <View style={styles.visibilityText}>
          <Text style={[styles.visibilityLabel, { color: colors.foreground }]}>
            Public
          </Text>
          <Text style={[styles.visibilityHint, { color: colors.mutedForeground }]}>
            Visible to all users on the community platform
          </Text>
        </View>
        <Switch
          value={isPublic}
          onValueChange={setIsPublic}
          trackColor={{ false: colors.muted, true: colors.primary }}
          thumbColor={colors.primaryForeground}
        />
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={loading}
        style={({ pressed }) => [
          styles.submitBtn,
          {
            backgroundColor: colors.primary,
            borderRadius: radius,
            opacity: pressed || loading ? 0.7 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
            {submitLabel}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  children,
  error,
  colors,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  colors: PromptFormColors;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
      {error ? (
        <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
      ) : null}
    </View>
  );
}

function TypeChip({
  label,
  active,
  onPress,
  colors,
  radius,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: PromptFormColors;
  radius: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.typeChip,
        {
          backgroundColor: active ? colors.primary : colors.secondary,
          borderColor: active ? colors.primary : colors.border,
          borderRadius: radius,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.typeChipText,
          { color: active ? colors.primaryForeground : colors.secondaryForeground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 20 },
  field: { gap: 6 },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  textInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  textArea: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 90,
  },
  typeRow: { flexDirection: "row", gap: 8 },
  typeChip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  typeChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  visibilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 16,
    gap: 12,
  },
  visibilityText: { flex: 1, gap: 2 },
  visibilityLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  visibilityHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  submitBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  submitText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
