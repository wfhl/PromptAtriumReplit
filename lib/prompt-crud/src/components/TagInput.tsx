import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

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
  placeholder = "Add tag…",
  maxTags = 20,
  colors,
  radius = 8,
}: TagInputProps) {
  const [value, setValue] = useState("");

  function commit() {
    const trimmed = value.trim().replace(/^#/, "");
    if (!trimmed || tags.includes(trimmed) || tags.length >= maxTags) {
      setValue("");
      return;
    }
    onChange([...tags, trimmed]);
    setValue("");
  }

  function remove(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.tagRow}>
          {tags.map((tag) => (
            <View
              key={tag}
              style={[styles.tag, { backgroundColor: colors.secondary, borderRadius: radius }]}
            >
              <Text style={[styles.tagText, { color: colors.secondaryForeground }]}>{tag}</Text>
              <Pressable onPress={() => remove(tag)} hitSlop={6} style={styles.removeBtn}>
                <Text style={[styles.removeText, { color: colors.mutedForeground }]}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
      {tags.length < maxTags && (
        <TextInput
          value={value}
          onChangeText={setValue}
          onSubmitEditing={commit}
          onBlur={commit}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.input,
            {
              color: colors.foreground,
              backgroundColor: colors.input,
              borderColor: colors.border,
              borderRadius: radius,
            },
          ]}
          returnKeyType="done"
          autoCapitalize="none"
          autoCorrect={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  scroll: { flexGrow: 0 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  tagText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  removeBtn: { padding: 1 },
  removeText: { fontSize: 16, lineHeight: 18 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
