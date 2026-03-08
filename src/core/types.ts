/**
 * GravityClaw — Core Type Definitions
 *
 * Tipos e interfaces centrais usados por todo o framework.
 */

// ─── LLM Provider Types ───────────────────────────────────────

export type LLMProviderName = 'anthropic' | 'openai' | 'google' | 'local' | 'openrouter';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface LLMToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMCompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stopSequences?: string[] | undefined;
  metadata?: Record<string, unknown> | undefined;
  tools?: any[] | undefined;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: LLMProviderName;
  toolCalls?: LLMToolCall[] | undefined;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  } | undefined;
}

export interface LLMProvider {
  name: LLMProviderName;
  isAvailable(): boolean;
  complete(messages: LLMMessage[], options?: LLMCompletionOptions): Promise<LLMResponse>;
  embed?(text: string): Promise<number[]>;
}

// ─── Channel Types ────────────────────────────────────────────

export type ChannelType = 'telegram' | 'discord' | 'whatsapp' | 'web' | 'webhook';

export interface IncomingMessage {
  id: string;
  channel: ChannelType;
  senderId: string;
  senderName?: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'audio' | 'video' | 'document';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface OutgoingMessage {
  channelMessageId?: string;
  text: string;
  mediaUrl?: string;
  buttons?: MessageButton[];
  specialist?: string;
}

export interface MessageButton {
  label: string;
  action: string;
}

export interface Channel {
  type: ChannelType;
  start(): Promise<void>;
  stop(): Promise<void>;
  send(recipientId: string, message: OutgoingMessage): Promise<void>;
}

// ─── Memory Types ──────────────────────────────────────────────

export interface MemoryFact {
  key: string;
  value: string;
  updatedAt: Date;
}

export interface MemoryEntry {
  id: string;
  timestamp: Date;
  role: 'user' | 'assistant';
  content: string;
  channel: ChannelType;
  senderId: string;
  summary?: string;
  vector?: number[];
}

export interface MemorySearchResult {
  entry: MemoryEntry;
  score: number;
}

// ─── Skill Types ───────────────────────────────────────────────

export interface Skill {
  name: string;
  description: string;
  version: string;
  triggers?: string[];
  execute(input: SkillInput): Promise<SkillOutput>;
}

export interface SkillInput {
  command: string;
  args: string[];
  rawText: string;
  context: {
    senderId: string;
    channel: ChannelType;
  };
}

export interface SkillOutput {
  text?: string;
  mediaUrl?: string;
  data?: Record<string, unknown>;
  error?: string;
}

// ─── Agent / Soul Types ────────────────────────────────────────

export interface SoulConfig {
  name: string;
  role: string;
  language: string;
  values: string[];
  tone: string[];
  rules: string[];
  specialAbilities: string[];
}

export interface DynamicRule {
  id: string;
  condition: string;
  behavior: string;
  active: boolean;
  addedAt: Date;
}

// ─── Gateway Types ─────────────────────────────────────────────

export interface GatewayClient {
  id: string;
  channelType: ChannelType;
  authenticated: boolean;
  connectedAt: Date;
}

// ─── Scheduler Types ───────────────────────────────────────────

export interface ScheduledTask {
  id: string;
  cronExpression: string;
  taskName: string;
  handler: () => Promise<void>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

// ─── Security Types ────────────────────────────────────────────

export interface SecurityScanResult {
  isSafe: boolean;
  threats: string[];
  sanitizedContent?: string;
  confidence: number;
}

// ─── Event System ──────────────────────────────────────────────

export type AgentEvent =
  | { type: 'message_received'; payload: IncomingMessage }
  | { type: 'message_sent'; payload: OutgoingMessage & { recipientId: string } }
  | { type: 'skill_executed'; payload: { skill: string; input: SkillInput; output: SkillOutput } }
  | { type: 'error'; payload: { source: string; error: Error } }
  | { type: 'heartbeat'; payload: { timestamp: Date } }
  | { type: 'channel_connected'; payload: { channel: ChannelType } }
  | { type: 'channel_disconnected'; payload: { channel: ChannelType } };

export type EventHandler = (event: AgentEvent) => void | Promise<void>;
