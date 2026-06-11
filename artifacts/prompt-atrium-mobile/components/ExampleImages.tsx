import { Image } from "expo-image";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { resolveImageUrl } from "@/lib/api";

const GAP = 10;
const DEFAULT_RATIO = 1; // square until the natural size loads

/**
 * Horizontal, swipeable row of example image thumbnails — the native
 * equivalent of the web app's PromptImageCarousel. Each thumbnail keeps its
 * natural aspect ratio at a fixed height (no cropping), matching the web
 * "Example Images (N)" strip.
 */
export function ExampleImages({
  images,
  height,
  showLabel = false,
  onPressImage,
  style,
}: {
  images?: (string | null | undefined)[] | null;
  height: number;
  showLabel?: boolean;
  onPressImage?: (index: number, uri: string) => void;
  style?: object;
}) {
  const colors = useColors();
  const uris = (images || [])
    .map((u) => resolveImageUrl(u))
    .filter(Boolean) as string[];
  const [ratios, setRatios] = useState<Record<number, number>>({});

  if (uris.length === 0) return null;

  return (
    <View style={[styles.wrap, style]}>
      {showLabel ? (
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Example Images ({uris.length})
        </Text>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        // Let the parent vertical list own vertical pans.
        directionalLockEnabled
      >
        {uris.map((uri, i) => {
          const ratio = ratios[i] ?? DEFAULT_RATIO;
          const width = Math.round(height * ratio);
          const thumbStyle = [
            styles.thumb,
            {
              width,
              height,
              backgroundColor: colors.secondary,
              borderColor: colors.border,
            },
          ];
          const img = (
            <Image
              source={{ uri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
              onLoad={(e: { source?: { width?: number; height?: number } | null }) => {
                const w = e.source?.width;
                const h = e.source?.height;
                if (w && h) {
                  setRatios((prev) =>
                    prev[i] != null ? prev : { ...prev, [i]: w / h },
                  );
                }
              }}
            />
          );
          return onPressImage ? (
            <Pressable key={`${uri}-${i}`} style={thumbStyle} onPress={() => onPressImage(i, uri)}>
              {img}
            </Pressable>
          ) : (
            <View key={`${uri}-${i}`} style={thumbStyle}>
              {img}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium" },
  row: { gap: GAP },
  thumb: { borderRadius: 12, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth },
});
