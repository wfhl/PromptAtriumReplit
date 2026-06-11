import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PromptCrudItem } from "../types";

export interface PromptListItemColors {
  foreground: string;
  mutedForeground: string;
  card: string;
  secondary: string;
  secondaryForeground: string;
  primary: string;
  border: string;
  destructive: string;
}

export interface PromptListItemProps {
  item: PromptCrudItem;
  onEdit: (item: PromptCrudItem) => void;
  onDelete: (item: PromptCrudItem) => void;
  onPress?: (item: PromptCrudItem) => void;
  colors: PromptListItemColors;
  radius?: number;
  EditIcon?: React.ReactNode;
  DeleteIcon?: React.ReactNode;
}

export function PromptListItem({
  item,
  onEdit,
  onDelete,
  onPress,
  colors,
  radius = 8,
  EditIcon,
  DeleteIcon,
}: PromptListItemProps): React.JSX.Element {
  const tags = item.tags ?? [];
  return (
    <Pressable
      onPress={onPress ? () => onPress(item) : undefined}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius },
      ]}
    >
      <View style={styles.header}>
        <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>
          {item.name}
        </Text>
        <View style={styles.actions}>
          <Pressable onPress={() => onEdit(item)} hitSlop={8} style={styles.actionBtn}>
            {EditIcon ?? <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>}
          </Pressable>
          <Pressable onPress={() => onDelete(item)} hitSlop={8} style={styles.actionBtn}>
            {DeleteIcon ?? (
              <Text style={[styles.actionText, { color: colors.destructive }]}>Delete</Text>
            )}
          </Pressable>
        </View>
      </View>
      {item.promptContent ? (
        <Text numberOfLines={2} style={[styles.body, { color: colors.mutedForeground }]}>
          {item.promptContent}
        </Text>
      ) : null}
      {tags.length > 0 ? (
        <View style={styles.tagRow}>
          {tags.slice(0, 6).map((tag) => (
            <View
              key={tag}
              style={[styles.tag, { backgroundColor: colors.secondary, borderRadius: radius }]}
            >
              <Text style={[styles.tagText, { color: colors.secondaryForeground }]}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 14, gap: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: { flex: 1, fontSize: 16, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 12 },
  actionBtn: { paddingVertical: 2 },
  actionText: { fontSize: 14, fontWeight: "500" },
  body: { fontSize: 14, lineHeight: 20 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { fontSize: 12 },
});
