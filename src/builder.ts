/**
 * FIX Message Builder
 *
 * Fluent API to construct FIX messages with automatic BodyLength and CheckSum.
 */

import type { FIXDefinition, MessageDef } from './types';

const SOH = '\x01';

/**
 * Compute the FIX checksum from a message string.
 */
function computeChecksum(content: string): string {
  let sum = 0;
  for (let i = 0; i < content.length; i++) {
    sum += content.charCodeAt(i);
  }
  return String(sum % 256).padStart(3, '0');
}

export class MessageBuilder {
  private definition: FIXDefinition;
  private msgDef: MessageDef;
  private fieldValues: Map<number, string> = new Map();
  private beginString: string;

  constructor(definition: FIXDefinition, msgType: string) {
    this.definition = definition;
    const msgDef = definition.messagesByType.get(msgType);
    if (!msgDef) {
      throw new Error(
        `Unknown message type "${msgType}". Available types: ${Array.from(definition.messagesByType.keys()).join(', ')}`
      );
    }
    this.msgDef = msgDef;

    // Determine BeginString from the definition version
    if (definition.major === 5) {
      this.beginString = 'FIXT.1.1';
    } else {
      this.beginString = `FIX.${definition.major}.${definition.minor}`;
    }

    // Set MsgType automatically
    this.fieldValues.set(35, msgType);
  }

  /**
   * Set a field by tag number.
   */
  setTag(tag: number, value: string | number): this {
    if (tag === 8 || tag === 9 || tag === 10) {
      throw new Error(
        `Tag ${tag} (${tag === 8 ? 'BeginString' : tag === 9 ? 'BodyLength' : 'CheckSum'}) is managed automatically and cannot be set manually`
      );
    }
    this.fieldValues.set(tag, String(value));
    return this;
  }

  /**
   * Set a field by name.
   */
  set(name: string, value: string | number): this {
    const fieldDef = this.definition.fieldsByName.get(name);
    if (!fieldDef) {
      throw new Error(
        `Unknown field name "${name}"`
      );
    }
    return this.setTag(fieldDef.tag, value);
  }

  /**
   * Update a field (alias for set).
   */
  update(name: string, value: string | number): this {
    return this.set(name, value);
  }

  /**
   * Clear a field by name.
   */
  clear(name: string): this {
    const fieldDef = this.definition.fieldsByName.get(name);
    if (!fieldDef) {
      throw new Error(`Unknown field name "${name}"`);
    }
    this.fieldValues.delete(fieldDef.tag);
    return this;
  }

  /**
   * Clear a field by tag number.
   */
  clearTag(tag: number): this {
    this.fieldValues.delete(tag);
    return this;
  }

  /**
   * Get current field value by name.
   */
  get(name: string): string | undefined {
    const fieldDef = this.definition.fieldsByName.get(name);
    if (!fieldDef) return undefined;
    return this.fieldValues.get(fieldDef.tag);
  }

  /**
   * Get current field value by tag.
   */
  getTag(tag: number): string | undefined {
    return this.fieldValues.get(tag);
  }

  /**
   * Build the FIX message string with correct BodyLength and CheckSum.
   *
   * The message format is:
   *   8=BeginString|9=BodyLength|<body fields>|10=CheckSum|
   *
   * Where BodyLength = byte count from after 9=xxx| to before 10=
   * And CheckSum = sum of all bytes before 10= field, mod 256
   */
  build(): string {
    // Collect body fields (everything except 8, 9, 10)
    // Tag 35 (MsgType) should come first in the body
    const bodyParts: string[] = [];

    // MsgType first
    const msgType = this.fieldValues.get(35);
    if (msgType) {
      bodyParts.push(`35=${msgType}`);
    }

    // Then other fields in tag-number order
    const sortedTags = Array.from(this.fieldValues.keys())
      .filter((t) => t !== 35 && t !== 8 && t !== 9 && t !== 10)
      .sort((a, b) => a - b);

    for (const tag of sortedTags) {
      bodyParts.push(`${tag}=${this.fieldValues.get(tag)}`);
    }

    const bodyStr = bodyParts.join(SOH) + SOH;

    // Compute BodyLength (byte count of bodyStr)
    const bodyLength = Buffer.byteLength(bodyStr, 'ascii');

    // Build the full message (without checksum)
    const prefix = `8=${this.beginString}${SOH}9=${bodyLength}${SOH}`;
    const withoutChecksum = prefix + bodyStr;

    // Compute checksum
    const checksum = computeChecksum(withoutChecksum);

    return withoutChecksum + `10=${checksum}${SOH}`;
  }
}

/**
 * Create a MessageBuilder for a given message type.
 */
export function createBuilder(
  definition: FIXDefinition,
  msgType: string
): MessageBuilder {
  return new MessageBuilder(definition, msgType);
}
