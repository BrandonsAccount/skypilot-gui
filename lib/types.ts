/**
 * Shared types across client and server.
 * WHAT: Defines the structure of chat messages.
 * WHY: Single source of truth for payload validation and rendering.
 */
export type Role = "user" | "assistant" | "system";
export interface Message {
  role: Role;
  content: string;
}
