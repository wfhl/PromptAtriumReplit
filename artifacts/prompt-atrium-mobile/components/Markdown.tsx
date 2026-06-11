import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

/**
 * Minimal Markdown renderer for the prompting guides.
 *
 * Supports the subset the guide content actually uses: ATX headings
 * (#, ##, ###), fenced code blocks (```), unordered (-, *) and ordered
 * (1.) lists, blockquotes (>), and inline **bold**, *italic* and `code`.
 * It is deliberately small — no third-party dependency — because the
 * content is trusted, authored data rather than arbitrary user input.
 */

type Inline = { text: string; bold?: boolean; italic?: boolean; code?: boolean };

function parseInline(input: string): Inline[] {
  const out: Inline[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(input)) !== null) {
    if (m.index > last) out.push({ text: input.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith("**")) out.push({ text: tok.slice(2, -2), bold: true });
    else if (tok.startsWith("`")) out.push({ text: tok.slice(1, -1), code: true });
    else out.push({ text: tok.slice(1, -1), italic: true });
    last = m.index + tok.length;
  }
  if (last < input.length) out.push({ text: input.slice(last) });
  return out;
}

function InlineText({
  content,
  style,
}: {
  content: string;
  style?: object;
}) {
  const colors = useColors();
  return (
    <Text style={style} selectable>
      {parseInline(content).map((seg, i) => {
        if (seg.code) {
          return (
            <Text
              key={i}
              style={[
                styles.inlineCode,
                { backgroundColor: colors.muted, color: colors.foreground },
              ]}
            >
              {seg.text}
            </Text>
          );
        }
        return (
          <Text
            key={i}
            style={{
              fontFamily: seg.bold
                ? "Inter_700Bold"
                : seg.italic
                  ? "Inter_400Regular"
                  : undefined,
              fontStyle: seg.italic ? "italic" : "normal",
            }}
          >
            {seg.text}
          </Text>
        );
      })}
    </Text>
  );
}

export function Markdown({ content }: { content: string }) {
  const colors = useColors();
  const lines = content.replace(/\r\n/g, "\n").split("\n");

  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++; // closing fence
      blocks.push(
        <View
          key={key++}
          style={[
            styles.codeBlock,
            { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
          <Text style={[styles.codeText, { color: colors.secondaryForeground }]} selectable>
            {code.join("\n")}
          </Text>
        </View>,
      );
      continue;
    }

    // Blank line → spacing
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Headings
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const sizes = [21, 18, 16, 15];
      blocks.push(
        <InlineText
          key={key++}
          content={heading[2]}
          style={[
            styles.heading,
            { color: colors.foreground, fontSize: sizes[level - 1], marginTop: level <= 2 ? 14 : 10 },
          ]}
        />,
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith(">")) {
      blocks.push(
        <View
          key={key++}
          style={[styles.quote, { borderLeftColor: colors.primary, backgroundColor: colors.card }]}
        >
          <InlineText
            content={line.replace(/^\s*>\s?/, "")}
            style={[styles.quoteText, { color: colors.mutedForeground }]}
          />
        </View>,
      );
      i++;
      continue;
    }

    // List item (unordered or ordered)
    const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
    const olMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (ulMatch || olMatch) {
      const marker = ulMatch ? "•" : `${olMatch![1]}.`;
      const text = ulMatch ? ulMatch[1] : olMatch![2];
      blocks.push(
        <View key={key++} style={styles.listItem}>
          <Text style={[styles.bullet, { color: colors.mutedForeground }]}>{marker}</Text>
          <InlineText
            content={text}
            style={[styles.paragraph, { color: colors.secondaryForeground, flex: 1 }]}
          />
        </View>,
      );
      i++;
      continue;
    }

    // Paragraph
    blocks.push(
      <InlineText
        key={key++}
        content={line}
        style={[styles.paragraph, { color: colors.secondaryForeground }]}
      />,
    );
    i++;
  }

  return <View style={styles.container}>{blocks}</View>;
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  heading: { fontFamily: "Inter_700Bold", lineHeight: 26 },
  paragraph: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular" },
  inlineCode: {
    fontFamily: "monospace",
    fontSize: 13,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  codeBlock: { padding: 12, borderWidth: 1, marginVertical: 4 },
  codeText: { fontFamily: "monospace", fontSize: 13, lineHeight: 19 },
  listItem: { flexDirection: "row", gap: 8, paddingRight: 8 },
  bullet: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_600SemiBold", minWidth: 18 },
  quote: { borderLeftWidth: 3, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, marginVertical: 4 },
  quoteText: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", fontStyle: "italic" },
});
