import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback } from "react";
import { Alert, View, ActivityIndicator } from "react-native";

import {
  PromptForm,
  usePromptCrud,
  type PromptCreateInput,
  type PromptCrudItem,
} from "@workspace/prompt-crud";
import { useColors } from "@/hooks/useColors";
import { useMyPromptsAdapter } from "@/lib/myPromptsAdapter";

export default function EditPromptScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const adapter = useMyPromptsAdapter();
  const { items, loading, update, mutating } = usePromptCrud(adapter);

  const prompt: PromptCrudItem | undefined = items.find((p) => p.id === id);

  const handleSubmit = useCallback(
    async (input: PromptCreateInput) => {
      if (!id) return;
      try {
        await update(id, input);
        router.back();
      } catch (err) {
        Alert.alert(
          "Error",
          err instanceof Error ? err.message : "Failed to update prompt",
        );
      }
    },
    [id, update, router],
  );

  if (loading && !prompt) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <PromptForm
      initial={prompt}
      onSubmit={handleSubmit}
      submitLabel="Save Changes"
      loading={mutating}
      colors={colors}
      radius={colors.radius}
    />
  );
}
