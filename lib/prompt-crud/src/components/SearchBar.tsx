import React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  colors: {
    foreground: string;
    mutedForeground: string;
    input: string;
    border: string;
  };
  radius?: number;
  ClearIcon?: React.ReactNode;
  SearchIcon?: React.ReactNode;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search prompts…",
  colors,
  radius = 8,
  ClearIcon,
  SearchIcon,
}: SearchBarProps): React.JSX.Element {
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.input, borderColor: colors.border, borderRadius: radius },
      ]}
    >
      {SearchIcon ? <View style={styles.icon}>{SearchIcon}</View> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={[styles.input, { color: colors.foreground }]}
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={8} style={styles.icon}>
          {ClearIcon ?? null}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  input: { flex: 1, fontSize: 15, height: "100%" },
  icon: { alignItems: "center", justifyContent: "center" },
});
