import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useNavigation } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useLayoutEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ExampleImages } from "@/components/ExampleImages";
import { Badge, EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { gradients } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { displayName, initials, resolveImageUrl, usePrompt } from "@/lib/api";
import { useSaved } from "@/lib/saved";

const { width: SCREEN_W } = Dimensions.get("window");

export default function PromptDetailScreen() {
  const colors = useColors();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  // Locally-created prompts (generated / mined / imported) live only in the
  // saved store and have no server record, so we read them from there and
  // skip the network query entirely.
  const isLocal = !!id && id.startsWith("local-");
  const { isSaved, toggle, saved: savedList } = useSaved();
  const query = usePrompt(isLocal ? undefined : id);
  const localPrompt = isLocal ? savedList.find((p) => p.id === id) : undefined;
  const prompt = isLocal ? localPrompt : query.data;
  const isLoading = isLocal ? false : query.isLoading;
  const isError = isLocal ? !localPrompt : query.isError;
  const error = query.error;
  const refetch = isLocal ? undefined : query.refetch;
  const saved = prompt ? isSaved(prompt.id) : false;

  const [copied, setCopied] = useState<string | null>(null);

  const blocked = !!prompt?.isNsfw;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: blocked ? "Not available" : prompt?.name ?? "Prompt",
      headerRight: () =>
        prompt && !blocked ? (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (isLocal && saved) {
                const msg =
                  "This prompt was created in the app and isn't stored anywhere else. Removing it deletes it permanently.";
                if (Platform.OS === "web") {
                  if (typeof window !== "undefined" && window.confirm(msg)) toggle(prompt);
                } else {
                  Alert.alert("Remove from library?", msg, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Remove", style: "destructive", onPress: () => toggle(prompt) },
                  ]);
                }
              } else {
                toggle(prompt);
              }
            }}
            hitSlop={10}
          >
            <Feather name="bookmark" size={22} color={saved ? colors.primary : colors.foreground} />
          </Pressable>
        ) : null,
    });
  }, [navigation, prompt, blocked, saved, colors, toggle]);

  if (isLoading) return <LoadingState label="Loading prompt…" />;
  if (isError || !prompt)
    return (
      <ErrorState
        message={isLocal ? "This prompt is no longer in your library." : (error as Error)?.message}
        onRetry={refetch ? () => refetch() : undefined}
      />
    );
  if (blocked)
    return (
      <EmptyState
        icon="eye-off"
        title="Not available"
        subtitle="This prompt isn't available in the app."
      />
    );

  const images = (prompt.exampleImagesUrl || [])
    .map((u) => resolveImageUrl(u))
    .filter(Boolean) as string[];
  const avatar = resolveImageUrl(prompt.user?.profileImageUrl);

  async function copy(text: string, key: string) {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
  }

  const badges = [prompt.category, prompt.promptType, prompt.promptStyle, prompt.intendedGenerator].filter(
    Boolean,
  ) as string[];
  const tags = (prompt.tags || []).filter(Boolean);
  const models = (prompt.recommendedModels || []).filter(Boolean);
  const r = colors.radius;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Media — natural-aspect gallery mirroring the web "Example Images" strip */}
      {images.length > 0 ? (
        <ExampleImages
          images={prompt.exampleImagesUrl}
          height={300}
          showLabel
          style={styles.gallery}
          onPressImage={(_, uri) => WebBrowser.openBrowserAsync(uri)}
        />
      ) : (
        <LinearGradient
          colors={gradients.library as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroPlaceholder, { width: SCREEN_W }]}
        >
          <Feather name="image" size={40} color="rgba(255,255,255,0.85)" />
        </LinearGradient>
      )}

      <View style={styles.section}>
        <Text style={[styles.title, { color: colors.foreground }]}>{prompt.name}</Text>

        {/* Author + stats */}
        <View style={styles.authorRow}>
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
            <Text style={[styles.authorName, { color: colors.mutedForeground }]}>
              {displayName(prompt.user)}
            </Text>
          </View>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Feather name="heart" size={15} color={colors.mutedForeground} />
              <Text style={[styles.statText, { color: colors.mutedForeground }]}>{prompt.likes ?? 0}</Text>
            </View>
            <View style={styles.stat}>
              <Feather name="trending-up" size={15} color={colors.mutedForeground} />
              <Text style={[styles.statText, { color: colors.mutedForeground }]}>{prompt.usageCount ?? 0}</Text>
            </View>
          </View>
        </View>

        {badges.length > 0 ? (
          <View style={styles.badges}>
            {badges.map((b, i) => (
              <Badge key={`${b}-${i}`} label={b} />
            ))}
          </View>
        ) : null}

        {prompt.description ? (
          <Text style={[styles.description, { color: colors.secondaryForeground }]}>
            {prompt.description}
          </Text>
        ) : null}

        {/* Prompt content */}
        {prompt.promptContent ? (
          <View style={[styles.block, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: r + 2 }]}>
            <View style={styles.blockHead}>
              <Text style={[styles.blockTitle, { color: colors.foreground }]}>Prompt</Text>
              <Pressable
                onPress={() => copy(prompt.promptContent!, "prompt")}
                style={({ pressed }) => [
                  styles.copyBtn,
                  { backgroundColor: colors.primary, borderRadius: r, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Feather name={copied === "prompt" ? "check" : "copy"} size={14} color={colors.primaryForeground} />
                <Text style={[styles.copyText, { color: colors.primaryForeground }]}>
                  {copied === "prompt" ? "Copied" : "Copy"}
                </Text>
              </Pressable>
            </View>
            <Text style={[styles.code, { color: colors.secondaryForeground }]} selectable>
              {prompt.promptContent}
            </Text>
          </View>
        ) : null}

        {/* Negative prompt */}
        {prompt.negativePrompt ? (
          <View style={[styles.block, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: r + 2 }]}>
            <View style={styles.blockHead}>
              <Text style={[styles.blockTitle, { color: colors.foreground }]}>Negative prompt</Text>
              <Pressable
                onPress={() => copy(prompt.negativePrompt!, "neg")}
                style={({ pressed }) => [
                  styles.copyBtn,
                  { backgroundColor: colors.secondary, borderRadius: r, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Feather name={copied === "neg" ? "check" : "copy"} size={14} color={colors.foreground} />
                <Text style={[styles.copyText, { color: colors.foreground }]}>
                  {copied === "neg" ? "Copied" : "Copy"}
                </Text>
              </Pressable>
            </View>
            <Text style={[styles.code, { color: colors.secondaryForeground }]} selectable>
              {prompt.negativePrompt}
            </Text>
          </View>
        ) : null}

        {/* Models */}
        {models.length > 0 ? (
          <View style={styles.metaSection}>
            <Text style={[styles.metaHead, { color: colors.mutedForeground }]}>Recommended models</Text>
            <View style={styles.badges}>
              {models.map((m, i) => (
                <Badge key={`${m}-${i}`} label={m} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Tags */}
        {tags.length > 0 ? (
          <View style={styles.metaSection}>
            <Text style={[styles.metaHead, { color: colors.mutedForeground }]}>Tags</Text>
            <View style={styles.badges}>
              {tags.map((t, i) => (
                <View key={`${t}-${i}`} style={[styles.tag, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.tagText, { color: colors.secondaryForeground }]}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Source */}
        {prompt.sourceUrl ? (
          <Pressable
            onPress={() => WebBrowser.openBrowserAsync(prompt.sourceUrl!)}
            style={({ pressed }) => [styles.sourceLink, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="external-link" size={15} color={colors.primary} />
            <Text style={[styles.sourceText, { color: colors.primary }]} numberOfLines={1}>
              View source
            </Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 48 },
  gallery: { paddingHorizontal: 18, paddingTop: 18 },
  heroPlaceholder: { height: 180, alignItems: "center", justifyContent: "center" },
  section: { padding: 18, gap: 14 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", lineHeight: 30, letterSpacing: -0.4 },
  authorRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  author: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  authorName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  stats: { flexDirection: "row", gap: 14 },
  stat: { flexDirection: "row", alignItems: "center", gap: 5 },
  statText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  description: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  block: { borderWidth: 1, padding: 14, gap: 10 },
  blockHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  blockTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7 },
  copyText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  code: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular" },
  metaSection: { gap: 9 },
  metaHead: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7 },
  tagText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sourceLink: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 6 },
  sourceText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
