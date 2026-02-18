/**
 * FIX Message Parser — parse raw FIX messages to JSON.
 */

import type {
  FIXDefinition,
  ParsedMessage,
  ParsedField,
  ParsedGroupEntry,
  GroupDef,
  ComponentRef,
  FieldRef,
} from './types';

/** Standard FIX delimiter (SOH = 0x01). Also accept pipe for testing. */
const SOH = '\x01';

/**
 * Detect the delimiter used in a FIX message string.
 * FIX standard is SOH (0x01), but pipe (|) is common in logs.
 */
function detectDelimiter(raw: string): string {
  if (raw.includes(SOH)) return SOH;
  if (raw.includes('|')) return '|';
  return SOH;
}

/**
 * Split a raw FIX string into tag=value pairs.
 */
function splitFields(raw: string, delimiter: string): Array<[number, string]> {
  const pairs: Array<[number, string]> = [];
  const parts = raw.split(delimiter).filter((s) => s.length > 0);
  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const tag = parseInt(part.substring(0, eqIdx), 10);
    const value = part.substring(eqIdx + 1);
    if (!isNaN(tag)) {
      pairs.push([tag, value]);
    }
  }
  return pairs;
}

/**
 * Collect all field names that belong to header or trailer.
 */
function collectSectionFieldNames(
  section: { fields: FieldRef[]; components: ComponentRef[] },
  definition: FIXDefinition
): Set<string> {
  const names = new Set<string>();
  for (const f of section.fields) {
    names.add(f.name);
  }
  for (const cref of section.components) {
    const comp = definition.components.get(cref.name);
    if (comp) {
      for (const f of comp.fields) {
        names.add(f.name);
      }
    }
  }
  return names;
}

/**
 * Parse repeating group entries from a field list starting at a given index.
 * Returns the parsed entries and the index after the group.
 */
function parseGroup(
  pairs: Array<[number, string]>,
  startIdx: number,
  count: number,
  groupDef: GroupDef,
  definition: FIXDefinition
): { entries: ParsedGroupEntry[]; nextIdx: number } {
  const entries: ParsedGroupEntry[] = [];

  // Collect all field names that belong to this group
  const groupFieldNames = new Set<string>();
  for (const f of groupDef.fields) {
    groupFieldNames.add(f.name);
  }
  for (const cref of groupDef.components) {
    const comp = definition.components.get(cref.name);
    if (comp) {
      for (const f of comp.fields) {
        groupFieldNames.add(f.name);
      }
    }
  }

  // The first field in the group definition is the delimiter field
  const firstFieldName = groupDef.fields.length > 0 ? groupDef.fields[0].name : undefined;

  let idx = startIdx;
  for (let i = 0; i < count && idx < pairs.length; i++) {
    const entry: ParsedGroupEntry = {};
    // First entry field should match the first field of the group def
    let isFirstField = true;

    while (idx < pairs.length) {
      const [tag, value] = pairs[idx];
      const fieldDef = definition.fieldsByTag.get(tag);
      if (!fieldDef) {
        // Unknown field, stop group parsing
        break;
      }

      // If we hit the first field again and it's not the first field of this entry,
      // that means a new group entry is starting
      if (!isFirstField && fieldDef.name === firstFieldName) {
        break;
      }

      // Check if this field belongs to the group
      if (!groupFieldNames.has(fieldDef.name)) {
        break;
      }

      // Check for nested groups
      let isNestedGroup = false;
      for (const nestedGroupDef of groupDef.groups) {
        if (fieldDef.name === nestedGroupDef.counterField) {
          const nestedCount = parseInt(value, 10);
          if (!isNaN(nestedCount) && nestedCount > 0) {
            const result = parseGroup(pairs, idx + 1, nestedCount, nestedGroupDef, definition);
            entry[fieldDef.name] = result.entries;
            idx = result.nextIdx;
            isNestedGroup = true;
          }
          break;
        }
      }

      if (!isNestedGroup) {
        entry[fieldDef.name] = value;
        idx++;
      }
      isFirstField = false;
    }

    entries.push(entry);
  }

  return { entries, nextIdx: idx };
}

/**
 * Find a group definition by counter field name in message/header/component.
 */
function findGroupDef(
  fieldName: string,
  msgDef: { groups: GroupDef[]; components: ComponentRef[] } | undefined,
  definition: FIXDefinition
): GroupDef | undefined {
  if (!msgDef) return undefined;

  for (const g of msgDef.groups) {
    if (g.counterField === fieldName) return g;
  }

  // Check in components
  for (const cref of msgDef.components) {
    const comp = definition.components.get(cref.name);
    if (comp) {
      for (const g of comp.groups) {
        if (g.counterField === fieldName) return g;
      }
    }
  }

  return undefined;
}

/**
 * Parse a raw FIX message string into a ParsedMessage.
 */
export function parseMessage(
  raw: string,
  definition: FIXDefinition
): ParsedMessage {
  const delimiter = detectDelimiter(raw);
  const pairs = splitFields(raw, delimiter);

  if (pairs.length === 0) {
    throw new Error('Empty or unparseable FIX message');
  }

  const headerFieldNames = collectSectionFieldNames(definition.header, definition);
  const trailerFieldNames = collectSectionFieldNames(definition.trailer, definition);

  // Always include standard header/trailer tags
  headerFieldNames.add('BeginString');
  headerFieldNames.add('BodyLength');
  headerFieldNames.add('MsgType');
  headerFieldNames.add('SenderCompID');
  headerFieldNames.add('TargetCompID');
  headerFieldNames.add('MsgSeqNum');
  headerFieldNames.add('SendingTime');
  trailerFieldNames.add('CheckSum');

  const allFields: ParsedField[] = [];
  const header: Record<string, string> = {};
  const body: Record<string, string | ParsedGroupEntry[]> = {};
  const trailer: Record<string, string> = {};

  let beginString = '';
  let bodyLength = 0;
  let checkSum = '';
  let msgType = '';
  let msgTypeName = '';

  // Get the message definition once we know the MsgType
  let msgDef: ReturnType<typeof definition.messagesByType.get> | undefined;

  let idx = 0;
  while (idx < pairs.length) {
    const [tag, value] = pairs[idx];
    const fieldDef = definition.fieldsByTag.get(tag);
    const fieldName = fieldDef?.name || `Tag${tag}`;

    const parsedField: ParsedField = {
      tag,
      name: fieldName,
      value,
    };

    if (fieldDef?.values.has(value)) {
      parsedField.enumDescription = fieldDef.values.get(value);
    }

    allFields.push(parsedField);

    // Extract standard fields
    if (tag === 8) {
      beginString = value;
    } else if (tag === 9) {
      bodyLength = parseInt(value, 10);
    } else if (tag === 10) {
      checkSum = value;
    } else if (tag === 35) {
      msgType = value;
      msgDef = definition.messagesByType.get(msgType);
      if (msgDef) {
        msgTypeName = msgDef.name;
      }
    }

    // Categorize into header/body/trailer
    if (headerFieldNames.has(fieldName)) {
      header[fieldName] = value;
      idx++;
    } else if (trailerFieldNames.has(fieldName)) {
      trailer[fieldName] = value;
      idx++;
    } else {
      // Check if this is a repeating group counter
      const groupDef =
        findGroupDef(fieldName, msgDef, definition) ||
        findGroupDef(fieldName, definition.header, definition);

      if (groupDef && fieldDef?.type === 'NUMINGROUP') {
        const count = parseInt(value, 10);
        if (!isNaN(count) && count > 0) {
          const result = parseGroup(pairs, idx + 1, count, groupDef, definition);
          body[fieldName] = result.entries;
          // Also add the group entries to allFields
          idx = result.nextIdx;
        } else {
          body[fieldName] = value;
          idx++;
        }
      } else {
        body[fieldName] = value;
        idx++;
      }
    }
  }

  return {
    beginString,
    msgType,
    msgTypeName,
    bodyLength,
    checkSum,
    header,
    body,
    trailer,
    fields: allFields,
  };
}
