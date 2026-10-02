/**
 * Email Markdown & Rich Text Formatter
 * Formats plain text and markdown into clean, email-client-compatible HTML.
 */

export function parseInlineMarkdown(text: string): string {
  if (!text) return "";
  let res = text;

  // 1. Bold: **text** or __text__
  res = res.replace(/\*\*([^*\n]+?)\*\*/g, '<strong style="font-weight: 700; color: #0f172a;">$1</strong>');
  res = res.replace(/__([^_ \n]+?)__/g, '<strong style="font-weight: 700; color: #0f172a;">$1</strong>');

  // 2. Italic: *text* (single asterisk not flanked by another asterisk) or _text_
  res = res.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em style="font-style: italic;">$1</em>');
  res = res.replace(/(?<!_)_([^_ \n]+?)_(?!_)/g, '<em style="font-style: italic;">$1</em>');

  // 3. Strikethrough: ~~text~~
  res = res.replace(/~~(.+?)~~/g, '<del style="text-decoration: line-through; opacity: 0.7;">$1</del>');

  // 4. Code pill: `code`
  res = res.replace(
    /`([^`]+)`/g,
    '<code style="background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; color: #0f172a;">$1</code>'
  );

  // 5. Links: [text](url)
  res = res.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #0277bd; text-decoration: underline; font-weight: 600;">$1</a>'
  );

  return res;
}

export function formatEmailMarkdownToHtml(rawText: string): string {
  if (!rawText) return "";

  // Normalize line endings
  const text = rawText.replace(/\r\n/g, "\n").trim();

  // If already full HTML document, return as is
  if (/<(html|body|table)[\s\S]*>/i.test(text)) {
    return text;
  }

  // Split into raw lines
  const lines = text.split("\n");
  const output: string[] = [];

  let currentPara: string[] = [];
  let currentListType: "ul" | "ol" | null = null;
  let currentListItems: string[] = [];

  const flushPara = () => {
    if (currentPara.length > 0) {
      const content = currentPara.map((line) => parseInlineMarkdown(line)).join("<br/>");
      output.push(
        `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">${content}</p>`
      );
      currentPara = [];
    }
  };

  const flushList = () => {
    if (currentListType && currentListItems.length > 0) {
      const tag = currentListType;
      const listStyle = tag === "ul" ? "disc" : "decimal";
      const itemsHtml = currentListItems
        .map(
          (item) =>
            `<li style="margin-bottom: 6px; font-size: 15px; line-height: 1.6; color: #334155;">${parseInlineMarkdown(
              item
            )}</li>`
        )
        .join("");
      output.push(
        `<${tag} style="margin: 0 0 16px 0; padding-left: 24px; list-style-type: ${listStyle};">${itemsHtml}</${tag}>`
      );
      currentListType = null;
      currentListItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Blank line -> break paragraph and list
    if (!trimmed) {
      flushPara();
      flushList();
      continue;
    }

    // Heading: # Heading, ## Heading, ### Heading
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushPara();
      flushList();
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const fontSize = level === 1 ? "20px" : level === 2 ? "17px" : "15px";
      output.push(
        `<h3 style="margin: 22px 0 10px 0; font-size: ${fontSize}; font-weight: 800; color: #0f172a; line-height: 1.35;">${parseInlineMarkdown(
          headingText
        )}</h3>`
      );
      continue;
    }

    // Standalone bold line header: **Header Title**
    const boldHeaderMatch = trimmed.match(/^\*\*([^*\n]+)\*\*$/);
    if (boldHeaderMatch) {
      flushPara();
      flushList();
      const headerText = boldHeaderMatch[1];
      output.push(
        `<h3 style="margin: 22px 0 8px 0; font-size: 16px; font-weight: 800; color: #0f172a; line-height: 1.35;">${headerText}</h3>`
      );
      continue;
    }

    // Unordered list item: - Item, * Item, • Item
    const ulMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (ulMatch) {
      flushPara();
      if (currentListType && currentListType !== "ul") {
        flushList();
      }
      currentListType = "ul";
      currentListItems.push(ulMatch[1]);
      continue;
    }

    // Ordered list item: 1. Item, 2) Item
    const olMatch = trimmed.match(/^\d+[\.)]\s+(.*)$/);
    if (olMatch) {
      flushPara();
      if (currentListType && currentListType !== "ol") {
        flushList();
      }
      currentListType = "ol";
      currentListItems.push(olMatch[1]);
      continue;
    }

    // Normal text line
    flushList();
    currentPara.push(rawLine);
  }

  flushPara();
  flushList();

  return output.join("");
}
