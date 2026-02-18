/**
 * Field Masking
 *
 * Replace values of specified fields with a placeholder for logging/auditing.
 */

import type { FIXDefinition, ParsedMessage, MaskConfig, ParsedGroupEntry } from './types';

const SOH = '\x01';

/**
 * Resolve a mask config to a set of tag numbers.
 */
function resolveMaskTags(config: MaskConfig, definition: FIXDefinition): Set<number> {
  const tags = new Set<number>();
  for (const id of config.fields) {
    if (typeof id === 'number') {
      tags.add(id);
    } else {
      // It's a field name
      const fieldDef = definition.fieldsByName.get(id);
      if (fieldDef) {
        tags.add(fieldDef.tag);
      }
    }
  }
  return tags;
}

/**
 * Resolve mask config to a set of field names.
 */
function resolveMaskNames(config: MaskConfig, definition: FIXDefinition): Set<string> {
  const names = new Set<string>();
  for (const id of config.fields) {
    if (typeof id === 'string') {
      names.add(id);
    } else {
      // It's a tag number
      const fieldDef = definition.fieldsByTag.get(id);
      if (fieldDef) {
        names.add(fieldDef.name);
      }
    }
  }
  return names;
}

/**
 * Mask a raw FIX message string.
 * Replaces the values of masked tags with the placeholder.
 */
export function maskRaw(
  raw: string,
  config: MaskConfig,
  definition: FIXDefinition
): string {
  const placeholder = config.placeholder || '***';
  const tagsToMask = resolveMaskTags(config, definition);

  if (tagsToMask.size === 0) return raw;

  const delimiter = raw.includes(SOH) ? SOH : '|';
  const parts = raw.split(delimiter);
  const masked = parts.map((part) => {
    if (!part) return part;
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) return part;
    const tag = parseInt(part.substring(0, eqIdx), 10);
    if (!isNaN(tag) && tagsToMask.has(tag)) {
      return `${tag}=${placeholder}`;
    }
    return part;
  });

  return masked.join(delimiter);
}

/**
 * Deep clone and mask a parsed group entry.
 */
function maskGroupEntries(
  entries: ParsedGroupEntry[],
  namesToMask: Set<string>,
  placeholder: string
): ParsedGroupEntry[] {
  return entries.map((entry) => {
    const masked: ParsedGroupEntry = {};
    for (const [key, value] of Object.entries(entry)) {
      if (value === undefined) {
        masked[key] = undefined;
      } else if (Array.isArray(value)) {
        masked[key] = maskGroupEntries(value, namesToMask, placeholder);
      } else if (namesToMask.has(key)) {
        masked[key] = placeholder;
      } else {
        masked[key] = value;
      }
    }
    return masked;
  });
}

/**
 * Mask a parsed FIX message (JSON).
 * Returns a new object with masked field values replaced by the placeholder.
 */
export function maskParsed(
  msg: ParsedMessage,
  config: MaskConfig,
  definition: FIXDefinition
): ParsedMessage {
  const placeholder = config.placeholder || '***';
  const namesToMask = resolveMaskNames(config, definition);

  if (namesToMask.size === 0) return { ...msg };

  // Deep clone and mask header
  const maskedHeader: Record<string, string> = {};
  for (const [key, value] of Object.entries(msg.header)) {
    maskedHeader[key] = namesToMask.has(key) ? placeholder : value;
  }

  // Deep clone and mask body
  const maskedBody: Record<string, string | ParsedGroupEntry[]> = {};
  for (const [key, value] of Object.entries(msg.body)) {
    if (Array.isArray(value)) {
      maskedBody[key] = maskGroupEntries(value, namesToMask, placeholder);
    } else if (namesToMask.has(key)) {
      maskedBody[key] = placeholder;
    } else {
      maskedBody[key] = value;
    }
  }

  // Deep clone and mask trailer
  const maskedTrailer: Record<string, string> = {};
  for (const [key, value] of Object.entries(msg.trailer)) {
    maskedTrailer[key] = namesToMask.has(key) ? placeholder : value;
  }

  // Mask individual fields
  const maskedFields = msg.fields.map((f) => ({
    ...f,
    value: namesToMask.has(f.name) ? placeholder : f.value,
  }));

  return {
    ...msg,
    header: maskedHeader,
    body: maskedBody,
    trailer: maskedTrailer,
    fields: maskedFields,
  };
}
