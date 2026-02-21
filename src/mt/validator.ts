import type { ValidationResult, ValidationError } from '../types';
import type { ParsedMTMessage, MTMessageDef } from './types';
import { parseMT } from './parser';

export function validateMTRaw(
  raw: string,
  definition?: MTMessageDef,
): ValidationResult {
  let parsed: ParsedMTMessage;
  try {
    parsed = parseMT(raw);
  } catch (err: unknown) {
    return {
      valid: false,
      errors: [{ message: `Parse error: ${err instanceof Error ? err.message : String(err)}`, severity: 'error' }],
      warnings: [],
    };
  }
  return validateMTParsed(parsed, definition);
}

export function validateMTParsed(
  msg: ParsedMTMessage,
  definition?: MTMessageDef,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!msg.block1.senderLT) {
    errors.push({ field: 'block1.senderLT', message: 'Missing sender logical terminal', severity: 'error' });
  }
  if (!msg.block2.messageType) {
    errors.push({ field: 'block2.messageType', message: 'Missing message type', severity: 'error' });
  }
  if (msg.block4.length === 0) {
    errors.push({ field: 'block4', message: 'Block 4 has no fields', severity: 'error' });
  }

  if (definition) {
    const fieldTags = new Set(msg.block4.map((f) => f.tag));
    for (const fd of definition.fields) {
      if (fd.mandatory && !fieldTags.has(fd.tag)) {
        errors.push({
          field: fd.tag,
          message: `Missing mandatory field :${fd.tag}: (${fd.name ?? fd.tag})`,
          severity: 'error',
        });
      }
    }
    for (const fd of definition.fields) {
      if (!fd.mandatory && !fieldTags.has(fd.tag)) continue;
      if (fd.format) {
        const vals = msg.block4.filter((f) => f.tag === fd.tag);
        for (const v of vals) {
          const err = checkFormat(v.value, fd.format);
          if (err) {
            errors.push({
              field: fd.tag,
              message: `Field :${fd.tag}: format error: ${err}`,
              severity: 'error',
            });
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function checkFormat(value: string, format: string): string | null {
  const m = format.match(/^(\d+)([anxd])$/);
  if (!m) return null;
  const len = parseInt(m[1], 10);
  if (value.length > len) {
    return `Value exceeds maximum length ${len}`;
  }
  return null;
}
