import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Markdown } from "@/components/Markdown";
import { Chip } from "@/components/ui";
import { ALL_GUIDES, QUICK_TIPS, type Guide } from "@/data/promptingGuides";
import { useColors } from "@/hooks/useColors";

const CATEGORY_LABELS: Record<string, string> = {
  syntax: "Syntax",
  anatomy: "Anatomy",
  "nano-banana": "Nano Banana",
};

function categoryLabel(category: string): string {
  return (
    CATEGORY_LABELS[category] ??
    category.replace(/(^|[-_])(\w)/g, (_, __, c) => " " + c.toUpperCase()).trim()
  );
}

export default function PromptingGuidesScreen() {
  const colors = useColors();
  const [category, setCategory] = useState<string>("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  const categories = useMemo(() => {
    const set: string[] = [];
    for (const g of ALL_GUIDES) if (!set.includes(g.category)) set.push(g.category);
    return set;
  }, []);

  const guides = useMemo<Guide[]>(() => {
    const list = category === "all" ? ALL_GUIDES : ALL_GUIDES.filter((g) => g.category === category);
    return [...list].sort((a, b) => a.order - b.order);
  }, [category]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.lead, { color: colors.mutedForeground }]}>
        Learn the syntax, anatomy, and model-specific techniques behind great prompts.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        <Chip label="All" active={category === "all"} onPress={() => setCategory("all")} />
        {categories.map((c) => (
          <Chip
            key={c}
            label={categoryLabel(c)}
            active={category === c}
            onPress={() => setCategory(c)}
          />
        ))}
      </ScrollView>

      {guides.map((guide) => {
        const open = expanded === guide.id;
        return (
          <View
            key={guide.id}
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius + 4 },
            ]}
          >
            <Pressable
              onPress={() => setExpanded(open ? null : guide.id)}
              style={styles.cardHeader}
            >
              <View style={styles.cardHeaderText}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{guide.title}</Text>
                <Text style={[styles.cardCategory, { color: colors.mutedForeground }]}>
                  {categoryLabel(guide.category)}
                </Text>
              </View>
              <Feather
                name={open ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.mutedForeground}
              />
            </Pressable>
            {open ? (
              <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
                <Markdown content={guide.content} />
              </View>
            ) : null}
          </View>
        );
      })}

      <View
        style={[
          styles.tips,
          { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: colors.radius + 4 },
        ]}
      >
        <Text style={[styles.tipsTitle, { color: colors.foreground }]}>Quick Tips</Text>
        {QUICK_TIPS.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Feather name="zap" size={14} color={colors.primary} style={{ marginTop: 3 }} />
            <Text style={[styles.tipText, { color: colors.secondaryForeground }]}>{tip}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 12, paddingBottom: 48 },
  lead: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  chips: { paddingVertical: 2, paddingRight: 8 },
  card: { borderWidth: 1, overflow: "hidden" },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    gap: 12,
  },
  cardHeaderText: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  cardCategory: { fontSize: 12, fontFamily: "Inter_500Medium" },
  cardBody: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 14, borderTopWidth: 1 },
  tips: { borderWidth: 1, padding: 16, gap: 10, marginTop: 4 },
  tipsTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  tipRow: { flexDirection: "row", gap: 10, paddingRight: 4 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
});
