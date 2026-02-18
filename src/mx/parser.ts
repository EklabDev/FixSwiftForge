import type { ParsedMXMessage, MXAppHeader } from './types';
import { XMLParser } from 'fast-xml-parser';

const REPEATING = new Set([
  'CdtTrfTxInf', 'TxInf', 'Ntry', 'NtryDtls', 'Stmt', 'RmtInf', 'AddtlTxInf',
  'OrgnlTxRef', 'ChrgsInf', 'SplmtryData', 'DrctDbtTx', 'CdtTrfTx',
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => REPEATING.has(name),
});

const ISO20022_NS = /^urn:iso:std:iso:20022:tech:xsd:(.+)$/;

function extractBic(node: unknown): string {
  if (typeof node === 'string') return node.trim();
  if (node == null || typeof node !== 'object') return '';
  const o = node as Record<string, unknown>;
  const bic = o.BICFI ?? o.BIC ?? o.FinInstnId;
  if (typeof bic === 'string') return bic.trim();
  if (bic != null && typeof bic === 'object') {
    const b = bic as Record<string, unknown>;
    if (typeof b.BICFI === 'string') return b.BICFI.trim();
  }
  const fin = o.FinInstnId ?? o.FIId;
  if (fin != null && typeof fin === 'object') return extractBic(fin);
  const text = o['#text'];
  return typeof text === 'string' ? text.trim() : '';
}

function extractHeader(appHdr: Record<string, unknown>): MXAppHeader {
  const getStr = (v: unknown): string => {
    if (typeof v === 'string') return v.trim();
    if (v != null && typeof v === 'object' && typeof (v as Record<string, unknown>)['#text'] === 'string') {
      return String((v as Record<string, unknown>)['#text']).trim();
    }
    return '';
  };
  return {
    from: extractBic(appHdr.Fr ?? appHdr.FrOrg),
    to: extractBic(appHdr.To ?? appHdr.ToOrg),
    businessMessageIdentifier: getStr(appHdr.BizMsgIdr ?? appHdr.BizMsgIdr_Id),
    messageDefinitionIdentifier: getStr(appHdr.MsgDefIdr ?? appHdr.MsgDefIdr_Id),
    creationDate: getStr(appHdr.CreDt ?? appHdr.CreDt_Tm),
  };
}

function findDocAndNs(obj: unknown): { ns: string; type: string; doc: Record<string, any> } | null {
  if (obj == null || typeof obj !== 'object') return null;
  const root = obj as Record<string, unknown>;
  const docEl = root.Document ?? root.document;
  if (!docEl || typeof docEl !== 'object') return null;
  const doc = docEl as Record<string, unknown>;
  const xmlns = (doc['@_xmlns'] ?? root['@_xmlns']) as string | undefined;
  const m = xmlns && ISO20022_NS.exec(xmlns);
  if (!m) return null;
  const body: Record<string, any> = {};
  for (const [k, v] of Object.entries(doc)) {
    if (!k.startsWith('@_')) body[k] = v;
  }
  return { ns: xmlns, type: m[1], doc: body };
}

function getRoot(parsed: unknown): Record<string, unknown> | null {
  if (parsed == null || typeof parsed !== 'object') return null;
  const o = parsed as Record<string, unknown>;
  if (o.Document ?? o.document) return o;
  const keys = Object.keys(o).filter((k) => !k.startsWith('@_'));
  if (keys.length === 1) {
    const v = o[keys[0]];
    if (v != null && typeof v === 'object') {
      const c = v as Record<string, unknown>;
      if (c.Document ?? c.document) return c;
    }
  }
  return o;
}

export function parseMX(raw: string): ParsedMXMessage {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('<')) {
    throw new Error('Invalid input: expected XML, got non-XML content');
  }
  let parsed: unknown;
  try {
    parsed = parser.parse(trimmed);
  } catch (err: unknown) {
    throw new Error(`XML parse failure: ${err instanceof Error ? err.message : String(err)}`);
  }
  const root = getRoot(parsed);
  if (!root) throw new Error('Invalid MX XML: could not locate root structure');
  const found = findDocAndNs(root);
  if (!found) throw new Error('Invalid MX XML: missing Document element or unrecognizable ISO 20022 namespace');
  const { ns, type, doc } = found;
  let header: MXAppHeader = {
    from: '',
    to: '',
    businessMessageIdentifier: '',
    messageDefinitionIdentifier: '',
    creationDate: '',
  };
  const appHdr = root.AppHdr ?? root.BizAppHdr ?? root.appHdr ?? root.bizAppHdr;
  if (appHdr != null && typeof appHdr === 'object') {
    header = extractHeader(appHdr as Record<string, unknown>);
  }
  return {
    type,
    namespace: ns,
    header,
    document: doc,
    raw,
  };
}
