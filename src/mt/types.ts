/**
 * Types for SWIFT MT messages
 */

import type {
  MaskConfig,
  ValidationError,
  ValidationResult,
} from '../types';

// Re-export shared types for MT usage
export type { MaskConfig, ValidationError, ValidationResult };

// --- Block headers ---

/** SWIFT Basic Header (Block 1) */
export interface BasicHeader {
  appId: string;
  serviceId: string;
  senderLT: string; // logical terminal / BIC
  sessionNumber: string;
  sequenceNumber: string;
}

/** SWIFT Application Header (Block 2) */
export interface AppHeader {
  direction: 'I' | 'O';
  messageType: string; // e.g. "103"
  receiverAddress?: string;
  senderAddress?: string;
  priority?: string;
  deliveryMonitor?: string;
  obsolescencePeriod?: string;
  inputTime?: string;
  messageInputReference?: string;
  outputDate?: string;
  outputTime?: string;
}

/** SWIFT User Header (Block 3) - key-value pairs */
export interface UserHeader {
  fields: Record<string, string>;
}

/** SWIFT Trailer (Block 5) - key-value pairs e.g. CHK, MAC */
export interface TrailerBlock {
  fields: Record<string, string>;
}

// --- Field types ---

/** Parsed MT field (tag/value pair) */
export interface MTField {
  tag: string;
  value: string;
}

/** MT field definition for schema/model */
export interface MTFieldDef {
  tag: string;
  name?: string;
  format: string; // e.g. "16x"
  mandatory: boolean;
  repeatable: boolean;
}

/** Complete MT message definition */
export interface MTMessageDef {
  type: string; // e.g. "103"
  name: string; // e.g. "Customer Credit Transfer"
  category: number;
  fields: MTFieldDef[];
}

/** Fully parsed MT message */
export interface ParsedMTMessage {
  type: string;
  block1: BasicHeader;
  block2: AppHeader;
  block3: UserHeader;
  block4: MTField[];
  block5: TrailerBlock;
  raw: string;
}
