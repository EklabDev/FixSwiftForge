import type { ValidationResult, ValidationError } from '../types';
import type { ParsedMXMessage, MXMessageDef, MXElementDef } from './types';
import { parseMX } from './parser';

export function validateMXRaw(
  raw: string,
  definition?: MXMessageDef,
): ValidationResult {
  let parsed: ParsedMXMessage;
  try {
    parsed = parseMX(raw);
  } catch (err: unknown) {
    return {
      valid: false,
      errors: [{ message: `Parse error: ${err instanceof Error ? err.message : String(err)}`, severity: 'error' }],
      warnings: [],
    };
  }
  return validateMXParsed(parsed, definition);
}

export function validateMXParsed(
  msg: ParsedMXMessage,
  definition?: MXMessageDef,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!msg.type) {
    errors.push({ field: 'type', message: 'Missing message type', severity: 'error' });
  }
  if (!msg.namespace) {
    errors.push({ field: 'namespace', message: 'Missing namespace', severity: 'error' });
  }
  if (!msg.document || Object.keys(msg.document).length === 0) {
    errors.push({ field: 'document', message: 'Empty document body', severity: 'error' });
  }

  if (definition) {
    validateElements(msg.document, definition.elements, '', errors);
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateElements(
  obj: Record<string, unknown>,
  defs: MXElementDef[],
  parentPath: string,
  errors: ValidationError[],
): void {
  for (const def of defs) {
    const path = parentPath ? `${parentPath}.${def.name}` : def.name;
    const value = obj[def.name];

    if (value === undefined) {
      if (def.minOccurs > 0) {
        errors.push({
          field: path,
          message: `Missing mandatory element: ${path}`,
          severity: 'error',
        });
      }
      continue;
    }

    if (def.children && def.children.length > 0 && typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          if (typeof value[i] === 'object' && value[i] !== null) {
            validateElements(value[i] as Record<string, unknown>, def.children, `${path}[${i}]`, errors);
          }
        }
      } else {
        validateElements(value as Record<string, unknown>, def.children, path, errors);
      }
    }
  }
}
