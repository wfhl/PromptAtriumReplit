import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

function looksLikeMarkdown(content: string): boolean {
  const text = content.trim();
  if (!text) return false;

  const patterns: RegExp[] = [
    /^#{1,6}\s+\S/m, // ATX headings
    /^\s*>\s+\S/m, // blockquotes
    /^\s*[-*+]\s+\S/m, // bullet lists
    /^\s*\d+\.\s+\S/m, // numbered lists
    /^\s*```/m, // fenced code blocks
    /^\s*\|.+\|.*$/m, // tables
    /\*\*[^*\n]+\*\*/, // bold
    /__[^_\n]+__/, // bold (underscore)
    /\*[^*\n]+\*/, // italic
    /\[[^\]\n]+\]\([^)\n]+\)/, // links
    /`[^`\n]+`/, // inline code
    /~~[^~\n]+~~/, // strikethrough
  ];

  return patterns.some((pattern) => pattern.test(text));
}

interface PromptContentProps {
  content: string;
  className?: string;
}

export function PromptContent({ content, className }: PromptContentProps) {
  try {
    const parsed = JSON.parse(content);
    return (
      <pre
        className={cn(
          "text-xs sm:text-sm whitespace-pre-wrap break-words text-slate-300 font-mono",
          className,
        )}
      >
        {JSON.stringify(parsed, null, 2)}
      </pre>
    );
  } catch {
    // not JSON, continue
  }

  if (looksLikeMarkdown(content)) {
    return (
      <div
        className={cn(
          "prose prose-invert prose-sm max-w-none font-sans break-words",
          "prose-pre:bg-slate-900/70 prose-pre:border prose-pre:border-border/50",
          "prose-code:text-emerald-300 prose-code:before:content-none prose-code:after:content-none",
          "prose-a:text-emerald-400 prose-headings:text-slate-100",
          className,
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }

  return (
    <span className={cn("text-slate-300 whitespace-pre-wrap break-words", className)}>
      {content}
    </span>
  );
}
