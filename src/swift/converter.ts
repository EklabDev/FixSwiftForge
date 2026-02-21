import type { ParsedMTMessage } from '../mt/types';
import type { ParsedMXMessage, MXAppHeader } from '../mx/types';
import type { ConversionMapping, ConversionResult, ConversionWarning, SupportedConversion } from './types';
import { parseMT } from '../mt/parser';
import { MXBuilder } from '../mx/builder';
import { MTBuilder } from '../mt/builder';
import { parseMX } from '../mx/parser';

let mappings: ConversionMapping[] = [];

export function loadMappings(defs: ConversionMapping[]): void {
  mappings = defs;
}

export function getSupportedConversions(): SupportedConversion[] {
  return mappings.map((m) => ({ mtType: m.mtType, mxType: m.mxType }));
}

export function convertMtToMx(
  mtMsg: ParsedMTMessage | string,
  targetType?: string,
): ConversionResult<ParsedMXMessage> {
  const parsed = typeof mtMsg === 'string' ? parseMT(mtMsg) : mtMsg;
  const mapping = findMapping(parsed.type, targetType, 'mt');
  if (!mapping) {
    throw new Error(`No conversion mapping found for MT${parsed.type}${targetType ? ` → ${targetType}` : ''}`);
  }

  const warnings: ConversionWarning[] = [];
  const builder = new MXBuilder(mapping.mxType);
  builder.setHeader({
    from: parsed.block1.senderLT,
    to: parsed.block2.receiverAddress ?? '',
    messageDefinitionIdentifier: mapping.mxType,
    creationDate: new Date().toISOString(),
  });

  const mappedTags = new Set<string>();
  for (const fm of mapping.fieldMappings) {
    if (fm.direction === 'mx-to-mt') continue;
    const field = parsed.block4.find((f) => f.tag === fm.mtTag);
    if (field) {
      builder.setElement(fm.mxPath, field.value);
      mappedTags.add(fm.mtTag);
    }
  }

  for (const f of parsed.block4) {
    if (!mappedTags.has(f.tag)) {
      warnings.push({ sourceField: `:${f.tag}:`, message: `Unmapped MT field :${f.tag}:` });
    }
  }

  const xml = builder.build();
  return { message: parseMX(xml), warnings };
}

export function convertMxToMt(
  mxMsg: ParsedMXMessage | string,
  targetType?: string,
): ConversionResult<ParsedMTMessage> {
  const parsed = typeof mxMsg === 'string' ? parseMX(mxMsg) : mxMsg;
  const mapping = findMapping(parsed.type, targetType, 'mx');
  if (!mapping) {
    throw new Error(`No conversion mapping found for ${parsed.type}${targetType ? ` → MT${targetType}` : ''}`);
  }

  const warnings: ConversionWarning[] = [];
  const builder = new MTBuilder(mapping.mtType);
  builder.setSender(parsed.header.from).setReceiver(parsed.header.to);

  const mappedPaths = new Set<string>();
  for (const fm of mapping.fieldMappings) {
    if (fm.direction === 'mt-to-mx') continue;
    const value = getByDotPath(parsed.document, fm.mxPath);
    if (value !== undefined) {
      builder.setField(fm.mtTag, String(value));
      mappedPaths.add(fm.mxPath);
    }
  }

  collectUnmappedPaths(parsed.document, '', mappedPaths, warnings);

  const raw = builder.build();
  return { message: parseMT(raw), warnings };
}

function findMapping(type: string, targetType: string | undefined, source: 'mt' | 'mx'): ConversionMapping | undefined {
  if (targetType) {
    return mappings.find((m) =>
      source === 'mt' ? m.mtType === type && m.mxType === targetType : m.mxType === type && m.mtType === targetType,
    );
  }
  return mappings.find((m) => (source === 'mt' ? m.mtType === type : m.mxType === type));
}

function getByDotPath(obj: Record<string, any>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const p of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[p];
  }
  return current;
}

function collectUnmappedPaths(
  obj: Record<string, any>,
  prefix: string,
  mapped: Set<string>,
  warnings: ConversionWarning[],
): void {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (key.startsWith('@_')) continue;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      collectUnmappedPaths(value as Record<string, any>, path, mapped, warnings);
    } else if (!mapped.has(path)) {
      warnings.push({ sourceField: path, message: `Unmapped MX element ${path}` });
    }
  }
}
