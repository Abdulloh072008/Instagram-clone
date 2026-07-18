// Темы чата (как в Instagram): фон треда + цвет исходящих пузырей. Выбор хранится
// локально по chatId. Применяется через CSS-переменную --chat-out (пузыри) и
// background у контейнера треда.
export type ChatTheme = { id: string; name: string; bg: string; bubble: string };

export const CHAT_THEMES: ChatTheme[] = [
  { id: "default", name: "Default", bg: "", bubble: "#0095f6" },
  { id: "purple", name: "Purple", bg: "linear-gradient(160deg,#2b1055,#6d4aff)", bubble: "#8b5cf6" },
  { id: "sunset", name: "Sunset", bg: "linear-gradient(160deg,#3a1c40,#8a3b52)", bubble: "#fb7185" },
  { id: "ocean", name: "Ocean", bg: "linear-gradient(160deg,#0f2027,#203a43,#2c5364)", bubble: "#06b6d4" },
  { id: "forest", name: "Forest", bg: "linear-gradient(160deg,#0b2b26,#1d4e45)", bubble: "#10b981" },
  { id: "night", name: "Night", bg: "linear-gradient(160deg,#0b1020,#1b2244)", bubble: "#6366f1" },
];

export function chatThemeById(id: string): ChatTheme {
  return CHAT_THEMES.find((t) => t.id === id) ?? CHAT_THEMES[0];
}

export function getChatThemeId(chatId: number): string {
  if (typeof window === "undefined") return "default";
  try {
    return localStorage.getItem("chatTheme:" + chatId) || "default";
  } catch {
    return "default";
  }
}

export function setChatThemeId(chatId: number, id: string): void {
  try {
    localStorage.setItem("chatTheme:" + chatId, id);
  } catch {}
}
