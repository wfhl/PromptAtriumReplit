import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Header } from "@/components/Header";
import { gradients } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";

function ToolCard({
  icon,
  title,
  description,
  colorsGradient,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  colorsGradient: [string, string];
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius + 4, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <LinearGradient
        colors={colorsGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconBox}
      >
        <Feather name={icon} size={24} color="#fff" />
      </LinearGradient>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{description}</Text>
      </View>
      <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function ToolsScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Header title="Tools" subtitle="Utilities for crafting prompts" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ToolCard
          icon="zap"
          title="Generate Prompt"
          description="Turn a quick idea into a rich, detailed AI image prompt."
          colorsGradient={gradients.library as [string, string]}
          onPress={() => router.push("/tools/generate-prompt")}
        />
        <ToolCard
          icon="search"
          title="PromptMiner"
          description="Extract structured prompts from pasted text or an image."
          colorsGradient={gradients.community as [string, string]}
          onPress={() => router.push("/tools/prompt-miner")}
        />
        <ToolCard
          icon="image"
          title="Image Metadata Analyzer"
          description="Read AI generation data embedded in an image."
          colorsGradient={gradients.tools as [string, string]}
          onPress={() => router.push("/tools/metadata-analyzer")}
        />
        <ToolCard
          icon="book"
          title="Prompting Guides"
          description="Learn syntax, anatomy, and model-specific techniques."
          colorsGradient={gradients.codex as [string, string]}
          onPress={() => router.push("/tools/prompting-guides")}
        />
        <ToolCard
          icon="download"
          title="Import Prompts"
          description="Bring in prompts from JSON, JSONL, or CSV into your library."
          colorsGradient={gradients.library as [string, string]}
          onPress={() => router.push("/tools/import-prompts")}
        />
        <ToolCard
          icon="maximize"
          title="Aspect Ratio Calculator"
          description="Find exact pixel dimensions for any ratio and resolution."
          colorsGradient={gradients.tools as [string, string]}
          onPress={() => router.push("/tools/aspect-ratio")}
        />
        <ToolCard
          icon="book-open"
          title="Codex Glossary"
          description="Browse thousands of aesthetic, style, and subject terms."
          colorsGradient={gradients.codex as [string, string]}
          onPress={() => router.push("/codex")}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 18, gap: 14, paddingBottom: 120 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderWidth: 1,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  cardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
