"use client";

import { useMemo } from "react";
import { useUsers } from "@/lib/hooks";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Update text with highlighted @mentions and clickable links. */
export function RichText({ text }: { text: string }) {
  const users = useUsers();
  const parts = useMemo(() => {
    const names = users
      .map((u) => u.name)
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp);
    const mention = names.length ? `@(?:${names.join("|")})` : "(?!)";
    const pattern = new RegExp(`(${mention})|(https?:\\/\\/[^\\s<]+[^\\s<.,:;"')\\]])`, "g");
    const out: Array<{ kind: "text" | "mention" | "link"; value: string }> = [];
    let last = 0;
    for (const match of text.matchAll(pattern)) {
      const index = match.index ?? 0;
      if (index > last) out.push({ kind: "text", value: text.slice(last, index) });
      out.push({ kind: match[1] ? "mention" : "link", value: match[0] });
      last = index + match[0].length;
    }
    if (last < text.length) out.push({ kind: "text", value: text.slice(last) });
    return out;
  }, [text, users]);

  return (
    <p className="whitespace-pre-wrap break-words" dir="auto">
      {parts.map((part, i) =>
        part.kind === "mention" ? (
          <span key={i} className="rounded bg-primary-soft px-0.5 font-medium text-primary">
            {part.value}
          </span>
        ) : part.kind === "link" ? (
          <a key={i} href={part.value} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
            {part.value}
          </a>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </p>
  );
}
