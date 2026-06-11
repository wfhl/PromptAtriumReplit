import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  colors: {
    foreground: string;
    mutedForeground: string;
    background: string;
    secondary: string;
    secondaryForeground: string;
    input: string;
    border: string;
    primary: string;
    destructive: string;
  };
  radius?: number;
}

export function TagInput({
  tags,
  onChange,
  placeholder = "Add a tag…",
  maxTags = 20,
  colors,
  radius = 8,
}: TagInputProps): React.JSX.Element {
  const [draft, setDraft] = useState("");

  const addTag = () => {
    const t = draft.trim();
    if (!t || tags.includes(t) || tags.length >= maxTags) {
      setDraft("");
      return;
    }
    onChange([...tags, t]);
    setDraft("");
  };

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={addTag}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="done"
          style={[
            styles.input,
            {
              color: colors.foreground,
              backgroundColor: colors.input,
              borderColor: colors.border,
              borderRadius: radius,
            },
          ]}
        />
        <Pressable
          onPress={addTag}
          style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: radius }]}
        >
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>
      {tags.length > 0 ? (
        <View style={styles.tagWrap}>
          {tags.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => removeTag(tag)}
              style={[styles.tag, { backgroundColor: colors.secondary, borderRadius: radius }]}
            >
              <Text style={[styles.tagText, { color: colors.secondaryForeground }]}>{tag}</Text>
              <Text style={[styles.tagX, { color: colors.destructive }]}>×</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: { flex: 1, height: 44, paddingHorizontal: 12, borderWidth: 1, fontSize: 15 },
  addBtn: { height: 44, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  addBtnText: { fontSize: 15, fontWeight: "600", color: "#ffffff" },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: { fontSize: 13 },
  tagX: { fontSize: 16, fontWeight: "700" },
});
