/**
 * FIX Message Validator
 *
 * Validates raw FIX strings and parsed JSON against the loaded definition.
 */

import type {
  FIXDefinition,
  ParsedMessage,
  ValidationResult,
  ValidationError,
  FieldRef,
  ComponentRef,
  GroupDef,
  ParsedGroupEntry,
} from './types';
import { parseMessage } from './parser';

const SOH = '\x01';

/**
 * Compute the FIX checksum for a message string.
 * The checksum is the sum of all bytes in the message up to (but not including) the "10=" tag,
 * modulo 256, zero-padded to 3 digits.
 */
export function computeChecksum(raw: string): string {
  // Find the 10= tag
  const delimiter = raw.includes(SOH) ? SOH : '|';
  const checksumTagStart = raw.lastIndexOf(`${delimiter}10=`);
  const content = checksumTagStart !== -1 ? raw.substring(0, checksumTagStart + 1) : raw;

  let sum = 0;
  for (let i = 0; i < content.length; i++) {
    sum += content.charCodeAt(i);
  }
  return String(sum % 256).padStart(3, '0');
}

/**
 * Compute body length: count of characters from after Tag 9's delimiter
 * to the delimiter before Tag 10.
 */
export function computeBodyLength(raw: string): number {
  const delimiter = raw.includes(SOH) ? SOH : '|';

  // Find end of tag 9 value (after "9=xxx|")
  const tag9Match = raw.match(/9=\d+/);
  if (!tag9Match) return 0;
  const bodyStart = raw.indexOf(tag9Match[0]) + tag9Match[0].length + 1; // +1 for delimiter

  // Find start of tag 10
  const tag10Str = `${delimiter}10=`;
  const bodyEnd = raw.lastIndexOf(tag10Str);
  if (bodyEnd === -1) return 0;

  return bodyEnd - bodyStart + 1; // +1 to include the delimiter before 10=
}

/**
 * Collect all required field names for a section (message, header, trailer).
 */
function collectRequiredFields(
  section: { fields: FieldRef[]; components: ComponentRef[]; groups: GroupDef[] },
  definition: FIXDefinition
): string[] {
  const required: string[] = [];
  for (const f of section.fields) {
    if (f.required) required.push(f.name);
  }
  for (const cref of section.components) {
    if (cref.required) {
      const comp = definition.components.get(cref.name);
      if (comp) {
        for (const f of comp.fields) {
          if (f.required) required.push(f.name);
        }
      }
    }
  }
  return required;
}

/**
 * Validate field type against definition.
 */
function validateFieldType(
  value: string,
  type: string
): string | null {
  switch (type) {
    case 'INT':
    case 'SEQNUM':
    case 'NUMINGROUP':
    case 'LENGTH':
      if (!/^-?\d+$/.test(value)) return `expected integer, got "${value}"`;
      break;
    case 'PRICE':
    case 'QTY':
    case 'AMT':
    case 'FLOAT':
    case 'PERCENTAGE':
    case 'PRICEOFFSET':
      if (!/^-?\d+(\.\d+)?$/.test(value)) return `expected numeric, got "${value}"`;
      break;
    case 'BOOLEAN':
      if (value !== 'Y' && value !== 'N') return `expected Y or N, got "${value}"`;
      break;
    case 'CHAR':
      if (value.length !== 1) return `expected single char, got "${value}"`;
      break;
  }
  return null;
}

/**
 * Validate field enum value.
 */
function validateFieldEnum(
  value: string,
  fieldName: string,
  definition: FIXDefinition
): string | null {
  const fieldDef = definition.fieldsByName.get(fieldName);
  if (!fieldDef || fieldDef.values.size === 0) return null;
  if (!fieldDef.values.has(value)) {
    const allowed = Array.from(fieldDef.values.keys()).join(', ');
    return `value "${value}" not in allowed values: [${allowed}]`;
  }
  return null;
}

/**
 * Validate a parsed message JSON against the definition.
 */
export function validateParsed(
  msg: ParsedMessage,
  definition: FIXDefinition
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check MsgType is defined
  const msgDef = definition.messagesByType.get(msg.msgType);
  if (!msgDef) {
    errors.push({
      field: 'MsgType',
      tag: 35,
      message: `Unknown message type "${msg.msgType}"`,
      severity: 'error',
    });
    return { valid: false, errors, warnings };
  }

  // Check required header fields
  const requiredHeader = collectRequiredFields(definition.header, definition);
  for (const fieldName of requiredHeader) {
    // Skip BeginString, BodyLength, MsgType — always present if parsed
    if (['BeginString', 'BodyLength', 'MsgType'].includes(fieldName)) continue;
    if (!msg.header[fieldName]) {
      const fieldDef = definition.fieldsByName.get(fieldName);
      errors.push({
        field: fieldName,
        tag: fieldDef?.tag,
        message: `Required header field "${fieldName}" is missing`,
        severity: 'error',
      });
    }
  }

  // Check required body fields
  const requiredBody = collectRequiredFields(msgDef, definition);
  for (const fieldName of requiredBody) {
    if (msg.body[fieldName] === undefined) {
      const fieldDef = definition.fieldsByName.get(fieldName);
      errors.push({
        field: fieldName,
        tag: fieldDef?.tag,
        message: `Required field "${fieldName}" is missing for message type ${msgDef.name} (${msg.msgType})`,
        severity: 'error',
      });
    }
  }

  // Validate field types and enum values for all fields
  for (const field of msg.fields) {
    const fieldDef = definition.fieldsByTag.get(field.tag);
    if (!fieldDef) {
      warnings.push({
        tag: field.tag,
        field: field.name,
        message: `Unknown field tag ${field.tag}`,
        severity: 'warning',
      });
      continue;
    }

    // Type validation
    const typeError = validateFieldType(field.value, fieldDef.type);
    if (typeError) {
      errors.push({
        tag: field.tag,
        field: fieldDef.name,
        message: `Field "${fieldDef.name}" (tag ${field.tag}): ${typeError}`,
        severity: 'error',
      });
    }

    // Enum validation
    const enumError = validateFieldEnum(field.value, fieldDef.name, definition);
    if (enumError) {
      warnings.push({
        tag: field.tag,
        field: fieldDef.name,
        message: `Field "${fieldDef.name}" (tag ${field.tag}): ${enumError}`,
        severity: 'warning',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a raw FIX message string against the definition.
 */
export function validateRaw(
  raw: string,
  definition: FIXDefinition
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // First, parse the message
  let parsed: ParsedMessage;
  try {
    parsed = parseMessage(raw, definition);
  } catch (err: any) {
    errors.push({
      message: `Failed to parse message: ${err.message}`,
      severity: 'error',
    });
    return { valid: false, errors, warnings };
  }

  // Validate checksum
  const expectedChecksum = computeChecksum(raw);
  if (parsed.checkSum && parsed.checkSum !== expectedChecksum) {
    errors.push({
      tag: 10,
      field: 'CheckSum',
      message: `Invalid checksum: expected ${expectedChecksum}, got ${parsed.checkSum}`,
      severity: 'error',
    });
  }

  // Validate body length
  const expectedBodyLength = computeBodyLength(raw);
  if (parsed.bodyLength && parsed.bodyLength !== expectedBodyLength) {
    warnings.push({
      tag: 9,
      field: 'BodyLength',
      message: `BodyLength mismatch: expected ${expectedBodyLength}, got ${parsed.bodyLength}`,
      severity: 'warning',
    });
  }

  // Delegate to parsed validation
  const parsedResult = validateParsed(parsed, definition);
  errors.push(...parsedResult.errors);
  warnings.push(...parsedResult.warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
