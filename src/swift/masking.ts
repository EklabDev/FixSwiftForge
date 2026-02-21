import type { MaskConfig } from '../types';
import type { ParsedMTMessage, MTField } from '../mt/types';
import type { ParsedMXMessage } from '../mx/types';

const DEFAULT_PLACEHOLDER = '***';

export function maskMTRaw(raw: string, config: MaskConfig): string {
  const placeholder = config.placeholder ?? DEFAULT_PLACEHOLDER;
  let masked = raw;
  for (const tag of config.fields) {
    const tagStr = String(tag);
    const re = new RegExp(`:${tagStr}:([^\\r\\n}]+)`, 'g');
    masked = masked.replace(re, `:${tagStr}:${placeholder}`);
  }
  return masked;
}

export function maskMTParsed(msg: ParsedMTMessage, config: MaskConfig): ParsedMTMessage {
  const placeholder = config.placeholder ?? DEFAULT_PLACEHOLDER;
  const tagsToMask = new Set(config.fields.map(String));
  const maskedBlock4: MTField[] = msg.block4.map((f) =>
    tagsToMask.has(f.tag) ? { ...f, value: placeholder } : { ...f },
  );
  return { ...msg, block4: maskedBlock4 };
}

export function maskMXRaw(raw: string, config: MaskConfig): string {
  const placeholder = config.placeholder ?? DEFAULT_PLACEHOLDER;
  let masked = raw;
  for (const path of config.fields) {
    const elementName = String(path).split('.').pop() ?? String(path);
    const re = new RegExp(`(<${elementName}[^>]*>)[^<]*(</\\s*${elementName}\\s*>)`, 'g');
    masked = masked.replace(re, `$1${placeholder}$2`);
  }
  return masked;
}

export function maskMXParsed(msg: ParsedMXMessage, config: MaskConfig): ParsedMXMessage {
  const placeholder = config.placeholder ?? DEFAULT_PLACEHOLDER;
  const document = deepMask(msg.document, config.fields.map(String), placeholder);
  return { ...msg, document };
}

function deepMask(
  obj: Record<string, unknown>,
  paths: string[],
  placeholder: string,
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (paths.some((p) => p === key || p.endsWith(`.${key}`))) {
      result[key] = typeof value === 'string' ? placeholder : value;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = deepMask(value as Record<string, unknown>, paths, placeholder);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? deepMask(item as Record<string, unknown>, paths, placeholder)
          : item,
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}
