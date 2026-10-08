// Ephemeral conversation intents — shown on the map and in connection
// prompts so strangers can decide before connecting. Never persisted
// beyond the live presence row.

export const INTENTS = [
  {
    id: "curious",
    label: "Curious",
    blurb: "Open to whatever comes up",
    color: "#34d399", // emerald
    emoji: "🔍",
    icebreakers: [
      "What's something you're curious about right now?",
      "What's the most interesting thing you learned recently?",
      "If you could ask anyone one question, what would it be?",
    ],
  },
  {
    id: "chill",
    label: "Chill",
    blurb: "Light talk, no pressure",
    color: "#38bdf8", // sky
    emoji: "😌",
    icebreakers: [
      "How do you usually unwind after a long day?",
      "What's a show or song you've had on repeat?",
      "What's your ideal lazy Sunday?",
    ],
  },
  {
    id: "deep",
    label: "Deep",
    blurb: "Something real",
    color: "#a78bfa", // violet
    emoji: "💭",
    icebreakers: [
      "What's something you've changed your mind about?",
      "What's a belief you hold that most people don't?",
      "What's the most meaningful conversation you've had?",
    ],
  },
  {
    id: "quick",
    label: "Quick hello",
    blurb: "A short moment, then gone",
    color: "#fbbf24", // amber
    emoji: "⚡",
    icebreakers: [
      "Say hi in one word — go!",
      "What's your vibe right now, in one emoji?",
      "Quick: best thing that happened today?",
    ],
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
