import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ExampleImages } from "@/components/ExampleImages";
import { gradients } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { displayName, initials, resolveImageUrl, type Prompt } from "@/lib/api";
import { useSaved } from "@/lib/saved";

function typeIcon(type?: string | null): keyof typeof Feather.glyphMap {
  const t = (type || "").toLowerCase();
  if (t.includes("image")) return "image";
  if (t.includes("video")) return "video";
  if (t.includes("writing") || t.includes("text")) return "edit-3";
  if (t.includes("system")) return "cpu";
  if (t.includes("audio") || t.includes("music")) return "music";
  return "zap";
}

export const PromptCard = React.memo(function PromptCard({
  prompt,
  compact,
}: {
  prompt: Prompt;
  compact?: boolean;
}) {
  const colors = useColors();
  const router = useRouter();
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(prompt.id);
  const r = colors.radius;

  const cover = resolveImageUrl(prompt.exampleImagesUrl?.[0]);
  const hasImages = (prompt.exampleImagesUrl?.filter(Boolean).length ?? 0) > 0;
  const avatar = resolveImageUrl(prompt.user?.profileImageUrl);
  const tags = (prompt.tags || []).filter(Boolean).slice(0, compact ? 2 : 3);

  function onSave(e: { stopPropagation?: () => void }) {
    e.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggle(prompt);
  }

  return (
    <Pressable
      onPress={() => router.push(`/prompt/${prompt.id}`)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: r + 4,
          width: compact ? 240 : undefined,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      {compact ? (
        <View style={[styles.media, { borderTopLeftRadius: r + 4, borderTopRightRadius: r + 4 }]}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.mediaImg} contentFit="cover" transition={200} />
          ) : (
            <LinearGradient
              colors={gradients.library as unknown as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.mediaImg}
            >
              <Feather name={typeIcon(prompt.promptType)} size={28} color="rgba(255,255,255,0.92)" />
            </LinearGradient>
          )}

          {prompt.isFeatured ? (
            <View style={[styles.featured, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
              <Feather name="star" size={11} color="#ffd24a" />
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          ) : null}

          <Pressable onPress={onSave} hitSlop={10} style={[styles.saveBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
            <Feather
              name="bookmark"
              size={16}
              color={saved ? colors.primary : "#ffffff"}
              style={saved ? undefined : { opacity: 0.95 }}
            />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.body}>
        <View style={styles.metaRow}>
          <View style={styles.metaLeft}>
            {!compact && prompt.isFeatured ? (
              <View style={[styles.featuredPill, { backgroundColor: colors.secondary }]}>
                <Feather name="star" size={10} color="#f5a623" />
                <Text style={[styles.featuredPillText, { color: colors.secondaryForeground }]}>
                  Featured
                </Text>
              </View>
            ) : null}
            {prompt.category ? (
              <Text style={[styles.category, { color: colors.primary }]} numberOfLines={1}>
                {prompt.category}
              </Text>
            ) : null}
            {prompt.category && prompt.promptType ? (
              <Text style={[styles.dot, { color: colors.mutedForeground }]}>·</Text>
            ) : null}
            {prompt.promptType ? (
              <Text style={[styles.typeText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {prompt.promptType}
              </Text>
            ) : null}
          </View>
          {!compact ? (
            <Pressable onPress={onSave} hitSlop={10} style={styles.saveInline}>
              <Feather
                name="bookmark"
                size={18}
                color={saved ? colors.primary : colors.mutedForeground}
              />
            </Pressable>
          ) : null}
        </View>

        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
          {prompt.name}
        </Text>

        {!compact ? (
          hasImages ? (
            <ExampleImages
              images={prompt.exampleImagesUrl}
              height={150}
              showLabel
              onPressImage={() => router.push(`/prompt/${prompt.id}`)}
            />
          ) : (
            <LinearGradient
              colors={gradients.library as unknown as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.fallback, { borderRadius: r + 2 }]}
            >
              <Feather name={typeIcon(prompt.promptType)} size={30} color="rgba(255,255,255,0.92)" />
            </LinearGradient>
          )
        ) : null}

        {!compact && prompt.description ? (
          <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
            {prompt.description}
          </Text>
        ) : null}

        {tags.length > 0 ? (
          <View style={styles.tags}>
            {tags.map((t) => (
              <View key={t} style={[styles.tag, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.tagText, { color: colors.secondaryForeground }]} numberOfLines={1}>
                  {t}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <View style={styles.author}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.avatarText, { color: colors.secondaryForeground }]}>
                  {initials(prompt.user)}
                </Text>
              </View>
            )}
            <Text style={[styles.authorName, { color: colors.mutedForeground }]} numberOfLines={1}>
              {displayName(prompt.user)}
            </Text>
          </View>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Feather name="heart" size={13} color={colors.mutedForeground} />
              <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                {prompt.likes ?? 0}
              </Text>
            </View>
            <View style={styles.stat}>
              <Feather name="trending-up" size={13} color={colors.mutedForeground} />
              <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                {prompt.usageCount ?? 0}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { borderWidth: 1, overflow: "hidden", marginBottom: 14 },
  media: { height: 132, overflow: "hidden" },
  mediaImg: { flex: 1, alignItems: "center", justifyContent: "center" },
  featured: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  featuredText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  saveBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: 14, gap: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  metaLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  saveInline: { padding: 2 },
  featuredPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  featuredPillText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  fallback: { height: 150, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  category: { fontSize: 12, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  dot: { fontSize: 12 },
  typeText: { fontSize: 12, fontFamily: "Inter_400Regular", flexShrink: 1 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold", lineHeight: 21 },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, maxWidth: 120 },
  tagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 2,
  },
  author: { flexDirection: "row", alignItems: "center", gap: 7, flex: 1, marginRight: 8 },
  avatar: { width: 22, height: 22, borderRadius: 11 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  authorName: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  stats: { flexDirection: "row", gap: 12 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
