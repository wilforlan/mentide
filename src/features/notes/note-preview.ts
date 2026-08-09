export const previewFromContent = (contentJson: string): string => {
  try {
    const doc = JSON.parse(contentJson) as {
      content?: Array<{
        content?: Array<{ text?: string }>;
      }>;
    };
    const parts: string[] = [];
    for (const block of doc.content ?? []) {
      for (const child of block.content ?? []) {
        if (child.text) {
          parts.push(child.text);
        }
      }
      if (parts.join(" ").trim().length > 120) {
        break;
      }
    }
    const text = parts.join(" ").replace(/\s+/g, " ").trim();
    if (!text) {
      return "Empty canvas — waiting for your next thought.";
    }
    return text.length > 140 ? `${text.slice(0, 140)}…` : text;
  } catch {
    return "Open to continue writing.";
  }
};

export const extractPlainText = (contentJson: string): string => {
  try {
    const doc = JSON.parse(contentJson) as {
      content?: Array<{
        content?: Array<{ text?: string }>;
      }>;
    };
    const parts: string[] = [];
    for (const block of doc.content ?? []) {
      for (const child of block.content ?? []) {
        if (child.text) {
          parts.push(child.text);
        }
      }
    }
    return parts.join(" ").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
};
