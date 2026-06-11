import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PromptListItem, SearchBar, usePromptCrud } from "@workspace/prompt-crud";
import type { PromptCrudItem } from "@workspace/prompt-crud";
import { Header } from "@/components/Header";
import { EmptyState, ErrorState } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/authContext";
import { useMyPromptsAdapter } from "@/lib/myPromptsAdapter";

function AuthGate() {
  const colors = useColors();
  const { login, loading } = useAuth();
  return (
    <View style={[styles.gateContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.gateIcon, { backgroundColor: colors.secondary }]}>
        <Feather name="lock" size={32} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.gateTitle, { color: colors.foreground }]}>
        Sign in to manage your prompts
      </Text>
      <Text style={[styles.gateSub, { color: colors.mutedForeground }]}>
        Create, edit, and organise your own prompt library across all your devices.
      </Text>
      <Pressable
        onPress={login}
        disabled={loading}
        style={({ pressed }) => [
          styles.signInBtn,
          {
            backgroundColor: colors.primary,
            borderRadius: colors.radius,
            opacity: pressed || loading ? 0.7 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.signInText, { color: colors.primaryForeground }]}>
            Sign In
          </Text>
        )}
      </Pressable>
    </View>
  );
}

export default function MineScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const adapter = useMyPromptsAdapter();
  const { items, loading, error, refresh, remove } = usePromptCrud(adapter);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => refresh(search.trim() || undefined), 300);
    return () => clearTimeout(t);
  }, [search, refresh]);

  const handleEdit = useCallback(
    (item: PromptCrudItem) => {
      router.push(`/my-prompts/edit/${item.id}` as never);
    },
    [router],
  );

  const handleDelete = useCallback(
    async (item: PromptCrudItem) => {
      await remove(item.id);
    },
    [remove],
  );

  const handleCreate = useCallback(() => {
    router.push("/my-prompts/create" as never);
  }, [router]);

  if (!user) {
    return <AuthGate />;
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Header
        title="My Prompts"
        subtitle={items.length > 0 ? `${items.length} prompt${items.length === 1 ? "" : "s"}` : "Your prompt library"}
      />

      <View style={styles.controls}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search your prompts…"
          colors={colors}
          radius={colors.radius}
          SearchIcon={<Feather name="search" size={18} color={colors.mutedForeground} />}
          ClearIcon={<Feather name="x" size={18} color={colors.mutedForeground} />}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <PromptListItem
            item={item}
            onEdit={handleEdit}
            onDelete={handleDelete}
            colors={colors}
            radius={colors.radius}
            EditIcon={<Feather name="edit-2" size={16} color={colors.primary} />}
            DeleteIcon={<Feather name="trash-2" size={16} color={colors.destructive} />}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : error ? (
            <ErrorState message={error} onRetry={() => refresh()} />
          ) : (
            <EmptyState
              icon="file-text"
              title="No prompts yet"
              subtitle="Tap the + button to create your first prompt."
            />
          )
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => refresh(search.trim() || undefined)}
            tintColor={colors.primary}
          />
        }
      />

      <Pressable
        onPress={handleCreate}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Feather name="plus" size={24} color={colors.primaryForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  controls: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8 },
  listContent: { paddingHorizontal: 18, paddingTop: 8, flexGrow: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  fab: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  gateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  gateIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  gateTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  gateSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  signInBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 8,
    minWidth: 180,
    alignItems: "center",
  },
  signInText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
