// Input validation utilities for security hardening

export function isValidSessionId(id: unknown): id is string {
  return (
    typeof id === "string" &&
    id.length >= 32 &&
    id.length <= 64 &&
    /^[a-zA-Z0-9_-]+$/.test(id) // Base64url characters only
  );
}

export function sanitizeChatMessage(text: unknown): string | null {
  if (typeof text !== "string") return null;
  if (text.length > 5000) return null; // Prevent huge messages
  if (text.length === 0) return null;

  // Strip any HTML tags as defense-in-depth
  return text.replace(/<[^>]*>/g, "").trim();
}

export function validateSignalPayload(
  payload: string | null | undefined,
): boolean {
  if (payload === null || payload === undefined) return true;
  if (typeof payload !== "string") return false;
  if (payload.length > 64 * 1024) return false;

  try {
    const parsed = JSON.parse(payload);
    // Limit nesting depth to prevent JSON bombs
    const depth = getObjectDepth(parsed);
    if (depth > 5) return false;

    // Limit array sizes
    if (!validateArraySizes(parsed, 100)) return false;

    return true;
  } catch {
    return false;
  }
}

function getObjectDepth(obj: unknown, currentDepth = 0): number {
  if (currentDepth > 10) return currentDepth; // Safety limit
  if (obj === null || typeof obj !== "object") return currentDepth;

  let maxDepth = currentDepth;
  for (const value of Object.values(obj as Record<string, unknown>)) {
    const depth = getObjectDepth(value, currentDepth + 1);
    maxDepth = Math.max(maxDepth, depth);
  }
  return maxDepth;
}

function validateArraySizes(obj: unknown, maxSize: number): boolean {
  if (Array.isArray(obj)) {
    if (obj.length > maxSize) return false;
    return obj.every((item) => validateArraySizes(item, maxSize));
  }
  if (obj && typeof obj === "object") {
    return Object.values(obj).every((val) => validateArraySizes(val, maxSize));
  }
  return true;
}
