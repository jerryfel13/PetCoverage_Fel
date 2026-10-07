// Ephemeral conversation intents — shown on the map and in connection
// prompts so strangers can decide before connecting. Never persisted
// beyond the live presence row.

export const INTENTS = [
  {
    id: "curious",
    label: "Curious",
    blurb: "Open to whatever comes up",
    color: "#34d399", // emerald
  },
  {
    id: "chill",
    label: "Chill",
    blurb: "Light talk, no pressure",
    color: "#38bdf8", // sky
  },
  {
    id: "deep",
    label: "Deep",
    blurb: "Something real",
    color: "#a78bfa", // violet
  },
  {
    id: "quick",
    label: "Quick hello",
    blurb: "A short moment, then gone",
    color: "#fbbf24", // amber
  },
] as const;

export type IntentId = (typeof INTENTS)[number]["id"];

export function isValidIntent(value: unknown): value is IntentId {
  return (
    typeof value === "string" && INTENTS.some((intent) => intent.id === value)
  );
}

export function intentMeta(id: IntentId | string | undefined) {
  return INTENTS.find((intent) => intent.id === id) ?? INTENTS[0];
}
