import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import { Alert } from "react-native";

import { PromptForm, usePromptCrud, type PromptCreateInput } from "@workspace/prompt-crud";
import { useColors } from "@/hooks/useColors";
import { useMyPromptsAdapter } from "@/lib/myPromptsAdapter";

export default function CreatePromptScreen() {
  const colors = useColors();
  const router = useRouter();
  const adapter = useMyPromptsAdapter();
  const { create, mutating } = usePromptCrud(adapter);

  const handleSubmit = useCallback(
    async (input: PromptCreateInput) => {
      try {
        await create(input);
        router.back();
      } catch (err) {
        Alert.alert(
          "Error",
          err instanceof Error ? err.message : "Failed to create prompt",
        );
      }
    },
    [create, router],
  );

  return (
    <PromptForm
      onSubmit={handleSubmit}
      submitLabel="Create Prompt"
      loading={mutating}
      colors={colors}
      radius={colors.radius}
    />
  );
}
