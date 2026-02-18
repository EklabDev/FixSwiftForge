import { describe, it, expect } from 'vitest';
import { parseMX } from '../src/mx/parser';
import { MXBuilder, createMXBuilder } from '../src/mx/builder';
import { validateMXRaw, validateMXParsed } from '../src/mx/validator';
import {
  getMXDefinition,
  getAllMXDefinitions,
  getMXTypes,
  getMXTypesByArea,
} from '../src/mx/definition-loader';
import { maskMXRaw, maskMXParsed } from '../src/swift/masking';

const VALID_PACS008_XML = `<Biz>
  <AppHdr>
    <Fr><FIId><FinInstnId><BICFI>BANKBICAA</BICFI></FinInstnId></FIId></Fr>
    <To><FIId><FinInstnId><BICFI>BANKBICBB</BICFI></FinInstnId></FIId></To>
    <BizMsgIdr>MSG-001</BizMsgIdr>
    <MsgDefIdr>pacs.008.001.08</MsgDefIdr>
    <CreDt>2023-01-01T12:00:00Z</CreDt>
  </AppHdr>
  <Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">
    <FIToFICstmrCdtTrf>
      <GrpHdr>
        <MsgId>MSG-001</MsgId>
        <CreDtTm>2023-01-01T12:00:00Z</CreDtTm>
        <NbOfTxs>1</NbOfTxs>
      </GrpHdr>
      <CdtTrfTxInf>
        <PmtId><InstrId>INSTR-001</InstrId><EndToEndId>E2E-001</EndToEndId></PmtId>
        <IntrBkSttlmAmt Ccy="USD">1000.00</IntrBkSttlmAmt>
      </CdtTrfTxInf>
    </FIToFICstmrCdtTrf>
  </Document>
</Biz>`;

// ─── MX Parser ───────────────────────────────────────────────────────

describe('MX Parser', () => {
  it('parses a valid pacs.008 message', () => {
    const result = parseMX(VALID_PACS008_XML);

    expect(result.type).toBe('pacs.008.001.08');
    expect(result.namespace).toBe(
      'urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08',
    );

    expect(result.header.from).toBe('BANKBICAA');
    expect(result.header.to).toBe('BANKBICBB');
    expect(result.header.businessMessageIdentifier).toBe('MSG-001');
    expect(result.header.messageDefinitionIdentifier).toBe('pacs.008.001.08');
    expect(result.header.creationDate).toBe('2023-01-01T12:00:00Z');

    const doc = result.document;
    expect(doc.FIToFICstmrCdtTrf).toBeDefined();

    const grpHdr = doc.FIToFICstmrCdtTrf?.GrpHdr;
    expect(grpHdr).toBeDefined();
    expect(grpHdr.MsgId).toBe('MSG-001');
    expect(String(grpHdr.NbOfTxs)).toBe('1');
  });

  it('parses MX without AppHdr using empty defaults', () => {
    const xml = `<Biz>
      <Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">
        <FIToFICstmrCdtTrf>
          <GrpHdr><MsgId>NO-HDR</MsgId></GrpHdr>
        </FIToFICstmrCdtTrf>
      </Document>
    </Biz>`;

    const result = parseMX(xml);

    expect(result.header.from).toBe('');
    expect(result.header.to).toBe('');
    expect(result.header.businessMessageIdentifier).toBe('');
    expect(result.header.messageDefinitionIdentifier).toBe('');
    expect(result.header.creationDate).toBe('');
    expect(result.document.FIToFICstmrCdtTrf).toBeDefined();
  });

  it('handles repeating elements as arrays', () => {
    const result = parseMX(VALID_PACS008_XML);

    const txInf = result.document.FIToFICstmrCdtTrf?.CdtTrfTxInf;
    expect(Array.isArray(txInf)).toBe(true);
    expect(txInf).toHaveLength(1);
    expect(txInf[0].PmtId.EndToEndId).toBe('E2E-001');
  });

  it('throws on non-XML input', () => {
    expect(() => parseMX('this is not xml')).toThrow();
  });

  it('throws when Document element is missing', () => {
    const xml = `<Biz><AppHdr><BizMsgIdr>X</BizMsgIdr></AppHdr></Biz>`;
    expect(() => parseMX(xml)).toThrow(/Document/i);
  });

  it('throws when namespace is missing', () => {
    const xml = `<Biz><Document><FIToFICstmrCdtTrf></FIToFICstmrCdtTrf></Document></Biz>`;
    expect(() => parseMX(xml)).toThrow(/namespace/i);
  });
});

// ─── MX Builder ──────────────────────────────────────────────────────

describe('MX Builder', () => {
  it('builds a pacs.008 with header and body elements', () => {
    const builder = new MXBuilder('pacs.008.001.08');
    builder
      .setHeader({
        from: 'BANKAAAA',
        to: 'BANKBBBB',
        businessMessageIdentifier: 'BUILD-001',
        messageDefinitionIdentifier: 'pacs.008.001.08',
        creationDate: '2024-06-01T00:00:00Z',
      })
      .setElement('GrpHdr.MsgId', 'BUILD-001')
      .setElement('GrpHdr.CreDtTm', '2024-06-01T00:00:00Z')
      .setElement('GrpHdr.NbOfTxs', '1');

    const xml = builder.build();

    expect(xml).toContain('AppHdr');
    expect(xml).toContain('BANKAAAA');
    expect(xml).toContain('BANKBBBB');
    expect(xml).toContain('BUILD-001');
    expect(xml).toContain('Document');
    expect(xml).toContain('FIToFICstmrCdtTrf');
    expect(xml).toContain('<MsgId>BUILD-001</MsgId>');
    expect(xml).toContain('<NbOfTxs>1</NbOfTxs>');
  });

  it('creates nested structure from dot-path', () => {
    const builder = new MXBuilder('pacs.008.001.08');
    builder.setElement('A.B.C', 'deep-value');

    expect(builder.getElement('A.B.C')).toBe('deep-value');
    expect(builder.getElement('A.B')).toEqual({ C: 'deep-value' });
    expect(builder.getElement('A')).toEqual({ B: { C: 'deep-value' } });
  });

  it('clearElement removes an element', () => {
    const builder = new MXBuilder('pacs.008.001.08');
    builder.setElement('GrpHdr.MsgId', 'TO-REMOVE');
    expect(builder.getElement('GrpHdr.MsgId')).toBe('TO-REMOVE');

    builder.clearElement('GrpHdr.MsgId');
    expect(builder.getElement('GrpHdr.MsgId')).toBeUndefined();
  });

  it('getElement retrieves a set value', () => {
    const builder = new MXBuilder('pacs.008.001.08');
    builder.setElement('GrpHdr.NbOfTxs', '5');
    expect(builder.getElement('GrpHdr.NbOfTxs')).toBe('5');
  });

  it('round-trips build → parse', () => {
    const builder = new MXBuilder('pacs.008.001.08');
    builder
      .setHeader({ from: 'SRCBIC', to: 'DSTBIC' })
      .setElement('GrpHdr.MsgId', 'RT-001')
      .setElement('GrpHdr.CreDtTm', '2024-01-01T00:00:00Z')
      .setElement('GrpHdr.NbOfTxs', '2');

    const xml = builder.build();
    const parsed = parseMX(xml);

    expect(parsed.type).toBe('pacs.008.001.08');
    expect(parsed.namespace).toBe(
      'urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08',
    );

    const grpHdr = parsed.document.FIToFICstmrCdtTrf?.GrpHdr;
    expect(grpHdr).toBeDefined();
    expect(grpHdr.MsgId).toBe('RT-001');
    expect(String(grpHdr.NbOfTxs)).toBe('2');
  });

  it('createMXBuilder factory returns an MXBuilder instance', () => {
    const builder = createMXBuilder('pacs.008.001.08');
    expect(builder).toBeInstanceOf(MXBuilder);

    builder.setElement('GrpHdr.MsgId', 'FACTORY-001');
    expect(builder.getElement('GrpHdr.MsgId')).toBe('FACTORY-001');
  });
});

// ─── MX Validator ────────────────────────────────────────────────────

describe('MX Validator', () => {
  it('validateMXRaw returns valid for a well-formed pacs.008', () => {
    const result = validateMXRaw(VALID_PACS008_XML);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validateMXRaw returns invalid with parse error for non-XML', () => {
    const result = validateMXRaw('not xml at all');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toMatch(/parse/i);
  });

  it('validateMXParsed returns valid for a correct message', () => {
    const parsed = parseMX(VALID_PACS008_XML);
    const result = validateMXParsed(parsed);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validateMXParsed reports error when type is missing', () => {
    const parsed = parseMX(VALID_PACS008_XML);
    const noType = { ...parsed, type: '' };
    const result = validateMXParsed(noType);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /type/i.test(e.message))).toBe(true);
  });

  it('validateMXParsed reports error when document is empty', () => {
    const parsed = parseMX(VALID_PACS008_XML);
    const emptyDoc = { ...parsed, document: {} };
    const result = validateMXParsed(emptyDoc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /document/i.test(e.message))).toBe(true);
  });
});

// ─── MX Definition Loader ────────────────────────────────────────────

describe('MX Definition Loader', () => {
  it('getMXDefinition returns a definition for pacs.008.001.10', () => {
    const def = getMXDefinition('pacs.008.001.10');
    expect(def).toBeDefined();
    expect(def!.type).toBe('pacs.008.001.10');
    expect(def!.name).toBeTruthy();
    expect(def!.namespace).toContain('pacs.008');
    expect(def!.rootElement).toBeTruthy();
    expect(Array.isArray(def!.elements)).toBe(true);
    expect(def!.elements.length).toBeGreaterThan(0);
  });

  it('getMXDefinition returns undefined for an unknown type', () => {
    expect(getMXDefinition('fake.999.001.01')).toBeUndefined();
  });

  it('getAllMXDefinitions returns more than 100 definitions', () => {
    const all = getAllMXDefinitions();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(100);
  });

  it('getMXTypes returns an array of type strings', () => {
    const types = getMXTypes();
    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBeGreaterThan(0);
    expect(types).toContain('pacs.008.001.10');
    types.forEach((t) => expect(typeof t).toBe('string'));
  });

  it('getMXTypesByArea returns only messages for the given area', () => {
    const pacsDefs = getMXTypesByArea('pacs');
    expect(pacsDefs.length).toBeGreaterThan(0);
    pacsDefs.forEach((d) => {
      expect(d.type.startsWith('pacs.')).toBe(true);
    });
  });
});

// ─── MX Masking ──────────────────────────────────────────────────────

describe('MX Masking', () => {
  it('maskMXRaw replaces element content in XML', () => {
    const masked = maskMXRaw(VALID_PACS008_XML, { fields: ['MsgId'] });

    expect(masked).toContain('<MsgId>***</MsgId>');
    expect(masked).not.toContain('<MsgId>MSG-001</MsgId>');
  });

  it('maskMXParsed replaces values in the parsed document', () => {
    const parsed = parseMX(VALID_PACS008_XML);
    const masked = maskMXParsed(parsed, { fields: ['MsgId'] });

    const grpHdr = masked.document.FIToFICstmrCdtTrf?.GrpHdr;
    expect(grpHdr.MsgId).toBe('***');
  });

  it('custom placeholder is used', () => {
    const masked = maskMXRaw(VALID_PACS008_XML, {
      fields: ['MsgId'],
      placeholder: 'REDACTED',
    });

    expect(masked).toContain('<MsgId>REDACTED</MsgId>');
    expect(masked).not.toContain('<MsgId>MSG-001</MsgId>');
  });
});

// ─── MX message types: positive and negative (2 tests per type) ───────

function buildMinimalMXXml(messageType: string): string {
  const def = getMXDefinition(messageType);
  if (!def) throw new Error(`No MX definition for ${messageType}`);
  const root = def.rootElement;
  const ns = def.namespace;
  return `<Biz><Document xmlns="${ns}"><${root}></${root}></Document></Biz>`;
}

const MX_AREAS = ['pacs', 'camt', 'pain', 'sese', 'semt', 'seev', 'acmt', 'setr'] as const;

describe('MX message types — positive and negative', () => {
  for (const area of MX_AREAS) {
    const defs = getMXTypesByArea(area);
    const typesToTest = defs.slice(0, 2).map((d) => d.type);

    for (const messageType of typesToTest) {
      describe(`${messageType} (${area})`, () => {
        it('positive: parse minimal valid XML and validate structure', () => {
          const xml = buildMinimalMXXml(messageType);
          const parsed = parseMX(xml);

          expect(parsed.type).toBe(messageType);
          expect(parsed.namespace).toContain(area);
          expect(parsed.document).toBeDefined();
          expect(typeof parsed.document).toBe('object');
        });

        it('negative: non-XML input throws', () => {
          expect(() => parseMX(`not xml for ${messageType}`)).toThrow();
        });
      });
    }
  }
});
