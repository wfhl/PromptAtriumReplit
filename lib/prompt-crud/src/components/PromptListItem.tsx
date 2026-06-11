import React from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
}: PromptListItemProps) {
  const tags = (item.tags ?? []).slice(0, 3);

  function handleDelete() {
    Alert.alert(
      "Delete Prompt",
      `Are you sure you want to delete "${item.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(item),
        },
      ],
    );
  }

  return (
    <Pressable
      onPress={onPress ? () => onPress(item) : undefined}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius + 4,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.body}>
        <View style={styles.meta}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.badges}>
            {item.promptType ? (
              <View style={[styles.typeBadge, { backgroundColor: colors.secondary, borderRadius: radius }]}>
                <Text style={[styles.badgeText, { color: colors.secondaryForeground }]}>
                  {item.promptType}
                </Text>
              </View>
            ) : null}
            <View
              style={[
                styles.visibilityBadge,
                {
                  backgroundColor: item.isPublic ? "rgba(20,110,255,0.1)" : colors.secondary,
                  borderRadius: radius,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: item.isPublic ? colors.primary : colors.mutedForeground },
                ]}
              >
                {item.isPublic ? "Public" : "Private"}
              </Text>
            </View>
          </View>
        </View>

        {item.promptContent ? (
          <Text style={[styles.preview, { color: colors.mutedForeground }]} numberOfLines={2}>
            {item.promptContent}
          </Text>
        ) : null}

        {tags.length > 0 ? (
          <View style={styles.tags}>
            {tags.map((t) => (
              <View key={t} style={[styles.tag, { backgroundColor: colors.secondary, borderRadius: 4 }]}>
                <Text style={[styles.tagText, { color: colors.secondaryForeground }]}>
                  {t}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <Pressable
          onPress={() => onEdit(item)}
          hitSlop={8}
          style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          {EditIcon ?? (
            <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
          )}
        </Pressable>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Pressable
          onPress={handleDelete}
          hitSlop={8}
          style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          {DeleteIcon ?? (
            <Text style={[styles.actionText, { color: colors.destructive }]}>Delete</Text>
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, overflow: "hidden", marginBottom: 12 },
  body: { padding: 14, gap: 8 },
  meta: { gap: 6 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  badges: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3 },
  visibilityBadge: { paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  preview: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  tags: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  tag: { paddingHorizontal: 7, paddingVertical: 3 },
  tagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  actions: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
  },
  actionText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  divider: { width: 1 },
});
