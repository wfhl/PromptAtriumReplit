import React, { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import type { PromptCreateInput, PromptCrudItem } from "../types";
import { TagInput } from "./TagInput";

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

function Field({
  label,
  colors,
  children,
}: {
  label: string;
  colors: PromptFormColors;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
    </View>
  );
}

export function PromptForm({
  initial,
  onSubmit,
  submitLabel = "Save prompt",
  loading = false,
  colors,
  radius = 8,
}: PromptFormProps): React.JSX.Element {
  const [name, setName] = useState(initial?.name ?? "");
  const [promptContent, setPromptContent] = useState(initial?.promptContent ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [promptType, setPromptType] = useState(initial?.promptType ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [isPublic, setIsPublic] = useState<boolean>(initial?.isPublic ?? false);
  const [localError, setLocalError] = useState<string | null>(null);

  const fieldStyle = [
    styles.input,
    {
      color: colors.foreground,
      backgroundColor: colors.input,
      borderColor: colors.border,
      borderRadius: radius,
    },
  ];

  const handleSubmit = async () => {
    if (!name.trim()) {
      setLocalError("Name is required.");
      return;
    }
    if (!promptContent.trim()) {
      setLocalError("Prompt content is required.");
      return;
    }
    setLocalError(null);
    await onSubmit({
      name: name.trim(),
      promptContent: promptContent.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      promptType: promptType.trim() || undefined,
      tags,
      isPublic,
    });
  };

  return (
    <View style={styles.container}>
      <Field label="Name" colors={colors}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="My prompt"
          placeholderTextColor={colors.mutedForeground}
          style={fieldStyle}
        />
      </Field>
      <Field label="Prompt" colors={colors}>
        <TextInput
          value={promptContent}
          onChangeText={setPromptContent}
          placeholder="Write the prompt…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={[fieldStyle, styles.multiline]}
        />
      </Field>
      <Field label="Description" colors={colors}>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Optional description"
          placeholderTextColor={colors.mutedForeground}
          style={fieldStyle}
        />
      </Field>
      <Field label="Category" colors={colors}>
        <TextInput
          value={category}
          onChangeText={setCategory}
          placeholder="e.g. Marketing"
          placeholderTextColor={colors.mutedForeground}
          style={fieldStyle}
        />
      </Field>
      <Field label="Type" colors={colors}>
        <TextInput
          value={promptType}
          onChangeText={setPromptType}
          placeholder="e.g. Text to Image"
          placeholderTextColor={colors.mutedForeground}
          style={fieldStyle}
        />
      </Field>
      <Field label="Tags" colors={colors}>
        <TagInput
          tags={tags}
          onChange={setTags}
          radius={radius}
          colors={{
            foreground: colors.foreground,
            mutedForeground: colors.mutedForeground,
            background: colors.background,
            secondary: colors.secondary,
            secondaryForeground: colors.secondaryForeground,
            input: colors.input,
            border: colors.border,
            primary: colors.primary,
            destructive: colors.destructive,
          }}
        />
      </Field>
      <View style={styles.switchRow}>
        <Text style={[styles.label, { color: colors.foreground }]}>Public</Text>
        <Switch value={isPublic} onValueChange={setIsPublic} />
      </View>
      {localError ? (
        <Text style={[styles.error, { color: colors.destructive }]}>{localError}</Text>
      ) : null}
      <Pressable
        onPress={handleSubmit}
        disabled={loading}
        style={[
          styles.submit,
          { backgroundColor: colors.primary, borderRadius: radius, opacity: loading ? 0.6 : 1 },
        ]}
      >
        <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
          {loading ? "Saving…" : submitLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "500" },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, minHeight: 44 },
  multiline: { minHeight: 120, textAlignVertical: "top" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  error: { fontSize: 13 },
  submit: { height: 48, alignItems: "center", justifyContent: "center" },
  submitText: { fontSize: 16, fontWeight: "600" },
});
