/**
 * XML Definition Loader
 *
 * Parses FIX Repository-style XML into an in-memory FIXDefinition model.
 */

import { XMLParser } from 'fast-xml-parser';
import type {
  FIXDefinition,
  FieldDef,
  FieldRef,
  GroupDef,
  ComponentRef,
  ComponentDef,
  MessageDef,
} from './types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => {
    // These elements can appear multiple times, always treat as array
    return ['field', 'group', 'component', 'message', 'value'].includes(name);
  },
});

/** Normalize to array (handles single-element or missing) */
function toArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}

/** Parse field references from a message/component/group element */
function parseFieldRefs(element: any): FieldRef[] {
  return toArray(element?.field).map((f: any) => ({
    name: f['@_name'],
    required: f['@_required'] === 'Y',
  }));
}

/** Parse component references from a message/component/group element */
function parseComponentRefs(element: any): ComponentRef[] {
  return toArray(element?.component).map((c: any) => ({
    name: c['@_name'],
    required: c['@_required'] === 'Y',
  }));
}

/** Parse group definitions recursively */
function parseGroups(element: any): GroupDef[] {
  return toArray(element?.group).map((g: any) => ({
    name: g['@_name'],
    required: g['@_required'] === 'Y',
    counterField: g['@_name'],
    fields: parseFieldRefs(g),
    groups: parseGroups(g),
    components: parseComponentRefs(g),
  }));
}

/**
 * Parse FIX Repository-style XML string into a FIXDefinition.
 * Throws on malformed or unsupported XML.
 */
export function loadDefinitionFromXml(xmlString: string): FIXDefinition {
  let parsed: any;
  try {
    parsed = xmlParser.parse(xmlString);
  } catch (err: any) {
    throw new Error(`Failed to parse FIX XML: ${err.message}`);
  }

  const fix = parsed?.fix;
  if (!fix) {
    throw new Error(
      'Invalid FIX definition XML: missing root <fix> element'
    );
  }

  const major = parseInt(fix['@_major'], 10);
  const minor = parseInt(fix['@_minor'], 10);
  const servicepack = parseInt(fix['@_servicepack'] || '0', 10);

  if (isNaN(major) || isNaN(minor)) {
    throw new Error(
      'Invalid FIX definition XML: <fix> must have major and minor attributes'
    );
  }

  // --- Fields ---
  const fieldsByTag = new Map<number, FieldDef>();
  const fieldsByName = new Map<string, FieldDef>();

  for (const f of toArray(fix.fields?.field)) {
    const tag = parseInt(f['@_number'], 10);
    const name: string = f['@_name'];
    const type: string = f['@_type'];

    if (isNaN(tag) || !name || !type) {
      continue; // skip malformed field
    }

    const values = new Map<string, string>();
    for (const v of toArray(f.value)) {
      values.set(v['@_enum'], v['@_description'] || '');
    }

    const fieldDef: FieldDef = { tag, name, type, values };
    fieldsByTag.set(tag, fieldDef);
    fieldsByName.set(name, fieldDef);
  }

  // --- Components ---
  const components = new Map<string, ComponentDef>();
  for (const c of toArray(fix.components?.component)) {
    const name: string = c['@_name'];
    if (!name) continue;
    components.set(name, {
      name,
      fields: parseFieldRefs(c),
      groups: parseGroups(c),
      components: parseComponentRefs(c),
    });
  }

  // --- Messages ---
  const messagesByType = new Map<string, MessageDef>();
  const messagesByName = new Map<string, MessageDef>();

  for (const m of toArray(fix.messages?.message)) {
    const name: string = m['@_name'];
    const msgtype: string = m['@_msgtype'];
    const msgcat: string = m['@_msgcat'] || 'app';

    if (!name || !msgtype) continue;

    const msgDef: MessageDef = {
      name,
      msgtype,
      msgcat,
      fields: parseFieldRefs(m),
      groups: parseGroups(m),
      components: parseComponentRefs(m),
    };
    messagesByType.set(msgtype, msgDef);
    messagesByName.set(name, msgDef);
  }

  // --- Header ---
  const headerElement = fix.header || {};
  const header = {
    fields: parseFieldRefs(headerElement),
    groups: parseGroups(headerElement),
    components: parseComponentRefs(headerElement),
  };

  // --- Trailer ---
  const trailerElement = fix.trailer || {};
  const trailer = {
    fields: parseFieldRefs(trailerElement),
    groups: parseGroups(trailerElement),
    components: parseComponentRefs(trailerElement),
  };

  return {
    major,
    minor,
    servicepack,
    fieldsByTag,
    fieldsByName,
    messagesByType,
    messagesByName,
    components,
    header,
    trailer,
  };
}
