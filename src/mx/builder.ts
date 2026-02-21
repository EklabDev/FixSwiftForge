import type { MXAppHeader } from './types';
import { XMLBuilder } from 'fast-xml-parser';

const BAH_MAP: Record<keyof MXAppHeader, string> = {
  from: 'Fr',
  to: 'To',
  businessMessageIdentifier: 'BizMsgIdr',
  messageDefinitionIdentifier: 'MsgDefIdr',
  creationDate: 'CreDt',
};

const MSG_ROOT: Record<string, string> = {
  'pacs.008.001.08': 'FIToFICstmrCdtTrf',
  'pacs.009.001.08': 'FICdtTrf',
  'camt.053.001.08': 'BkToCstmrStmt',
  'camt.054.001.08': 'BkToCstmrDbtCdtNtfctn',
};

function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  const lastKey = parts[parts.length - 1];
  if (typeof value === 'object' && value !== null && 'value' in value && 'attrs' in value) {
    const { value: text, attrs } = value as { value: string; attrs: Record<string, string> };
    const node: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(attrs)) node[`@_${k}`] = v;
    if (text !== undefined && text !== '') node['#text'] = text;
    current[lastKey] = Object.keys(node).length === 1 && node['#text'] !== undefined ? text : node;
  } else {
    current[lastKey] = value;
  }
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const key of parts) {
    if (current == null || typeof current !== 'object' || !(key in (current as object))) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function deleteByPath(obj: Record<string, unknown>, path: string): void {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!(key in current)) return;
    const next = current[key];
    if (typeof next !== 'object' || next === null) return;
    current = next as Record<string, unknown>;
  }
  delete current[parts[parts.length - 1]];
}

export class MXBuilder {
  private readonly messageType: string;
  private readonly namespace: string;
  private header: Partial<MXAppHeader> = {};
  private document: Record<string, unknown> = {};
  private readonly xmlBuilder: XMLBuilder;

  constructor(messageType: string) {
    this.messageType = messageType;
    this.namespace = `urn:iso:std:iso:20022:tech:xsd:${messageType}`;
    this.xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true,
      indentBy: '  ',
    });
  }

  setHeader(fields: Partial<MXAppHeader>): this {
    this.header = { ...this.header, ...fields };
    return this;
  }

  setElement(path: string, value: string | Record<string, unknown>): this {
    setByPath(this.document, path, value);
    return this;
  }

  clearElement(path: string): this {
    deleteByPath(this.document, path);
    return this;
  }

  getElement(path: string): unknown {
    return getByPath(this.document, path);
  }

  build(): string {
    const body: Record<string, unknown> = {};
    if (Object.keys(this.header).length > 0) {
      body.AppHdr = {};
      const h = body.AppHdr as Record<string, unknown>;
      for (const [k, v] of Object.entries(this.header)) {
        if (v !== undefined && k in BAH_MAP) h[BAH_MAP[k as keyof MXAppHeader]] = v;
      }
    }
    const docContent = Object.keys(this.document).length > 0 ? this.document : undefined;
    if (docContent) {
      body.Document = {
        '@_xmlns': this.namespace,
        ...(MSG_ROOT[this.messageType]
          ? { [MSG_ROOT[this.messageType]]: docContent }
          : docContent),
      };
    } else if (MSG_ROOT[this.messageType]) {
      body.Document = { '@_xmlns': this.namespace };
    }
    const root = { Biz: body };
    return this.xmlBuilder.build(root);
  }
}

export function createMXBuilder(messageType: string): MXBuilder {
  return new MXBuilder(messageType);
}
