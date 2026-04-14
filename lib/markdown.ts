import React from "react";

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      React.createElement(
        "strong",
        { key: `${keyPrefix}-b${i}`, className: "font-bold text-foreground" },
        match[1],
      ),
    );
    lastIndex = match.index + match[0].length;
    i += 1;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

export function renderSimpleMarkdown(source: string): React.ReactNode {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];
  let blockIndex = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join(" ").trim();
    if (text) {
      const idx = blockIndex++;
      blocks.push(
        React.createElement(
          "p",
          {
            key: `p-${idx}`,
            className: "text-sm leading-6 text-foreground",
          },
          renderInline(text, `p${idx}`),
        ),
      );
    }
    paragraph = [];
  };

  const flushBullets = () => {
    if (bullets.length === 0) return;
    const idx = blockIndex++;
    blocks.push(
      React.createElement(
        "ul",
        {
          key: `ul-${idx}`,
          className: "space-y-1.5 text-sm leading-6 text-foreground",
        },
        bullets.map((b, i) =>
          React.createElement(
            "li",
            {
              key: `li-${idx}-${i}`,
              className: "flex gap-2",
            },
            React.createElement(
              "span",
              { className: "text-muted-foreground", "aria-hidden": true },
              "\u2022",
            ),
            React.createElement(
              "span",
              { className: "flex-1" },
              renderInline(b, `li${idx}-${i}`),
            ),
          ),
        ),
      ),
    );
    bullets = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "") {
      flushParagraph();
      flushBullets();
      continue;
    }
    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      bullets.push(bulletMatch[1]);
      continue;
    }
    flushBullets();
    paragraph.push(line);
  }
  flushParagraph();
  flushBullets();

  return React.createElement(
    "div",
    { className: "space-y-3" },
    ...blocks,
  );
}
