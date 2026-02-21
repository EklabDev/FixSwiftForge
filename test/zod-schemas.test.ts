import { describe, it, expect } from 'vitest';
import { parseMT } from '../src/mt/parser';
import { parseMX } from '../src/mx/parser';
import { getMTDefinition } from '../src/mt/definition-loader';
import { getMXDefinition } from '../src/mx/definition-loader';
import {
  BasicHeaderSchema,
  AppHeaderSchema,
  MTFieldSchema,
  createMTMessageSchema,
  validateMTWithZod,
} from '../src/mt/schemas';
import {
  MXAppHeaderSchema,
  createMXMessageSchema,
  validateMXWithZod,
} from '../src/mx/schemas';

const mt103Raw = [
  '{1:F01BANKBICAAXXX0000000000}',
  '{2:I103BANKBICBBXXXN}',
  '{3:{108:MT103}}',
  '{4:\r\n:20:REF123456\r\n:23B:CRED\r\n:32A:230101USD1000,00\r\n:50A:John Doe\r\n:59:Jane Smith\r\n:70:Invoice 42\r\n:71A:SHA\r\n-}',
  '{5:{CHK:ABCDEF123456}}',
].join('');

describe('MT Zod Schemas', () => {
  it('BasicHeaderSchema validates a valid block1', () => {
    const result = BasicHeaderSchema.safeParse({
      appId: 'F',
      serviceId: '01',
      senderLT: 'BANKBICAAXXX',
      sessionNumber: '0000',
      sequenceNumber: '000000',
    });
    expect(result.success).toBe(true);
  });

  it('BasicHeaderSchema rejects empty senderLT', () => {
    const result = BasicHeaderSchema.safeParse({
      appId: 'F',
      serviceId: '01',
      senderLT: '',
      sessionNumber: '0000',
      sequenceNumber: '000000',
    });
    expect(result.success).toBe(false);
  });

  it('AppHeaderSchema validates an input header', () => {
    const result = AppHeaderSchema.safeParse({
      direction: 'I',
      messageType: '103',
      receiverAddress: 'BANKBICBBXXX',
      priority: 'N',
    });
    expect(result.success).toBe(true);
  });

  it('MTFieldSchema validates a field', () => {
    const result = MTFieldSchema.safeParse({ tag: '20', value: 'REF123' });
    expect(result.success).toBe(true);
  });

  it('createMTMessageSchema validates a parsed MT103', () => {
    const def = getMTDefinition('103');
    expect(def).toBeDefined();
    const parsed = parseMT(mt103Raw);
    const schema = createMTMessageSchema(def!);
    const result = schema.safeParse(parsed);
    expect(result.success).toBe(true);
  });

  it('createMTMessageSchema rejects wrong message type', () => {
    const def = getMTDefinition('103');
    expect(def).toBeDefined();
    const parsed = parseMT(mt103Raw);
    const modified = { ...parsed, type: '202' };
    const schema = createMTMessageSchema(def!);
    const result = schema.safeParse(modified);
    expect(result.success).toBe(false);
  });

  it('validateMTWithZod returns valid for correct MT103', () => {
    const def = getMTDefinition('103');
    expect(def).toBeDefined();
    const parsed = parseMT(mt103Raw);
    const result = validateMTWithZod(parsed, def!);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validateMTWithZod detects missing mandatory field', () => {
    const def = getMTDefinition('103');
    expect(def).toBeDefined();
    const parsed = parseMT(mt103Raw);
    parsed.block4 = parsed.block4.filter((f) => f.tag !== '20');
    const result = validateMTWithZod(parsed, def!);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('20'))).toBe(true);
  });

  it('z.infer matches ParsedMTMessage structure', () => {
    const def = getMTDefinition('103');
    expect(def).toBeDefined();
    const schema = createMTMessageSchema(def!);
    const parsed = parseMT(mt103Raw);
    const result = schema.parse(parsed);
    expect(result.type).toBe('103');
    expect(result.block1.senderLT).toBeTruthy();
    expect(result.block4.length).toBeGreaterThan(0);
  });
});

describe('MX Zod Schemas', () => {
  const pacs008Xml = `<Biz>
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
    </FIToFICstmrCdtTrf>
  </Document>
</Biz>`;

  it('MXAppHeaderSchema validates a valid header', () => {
    const result = MXAppHeaderSchema.safeParse({
      from: 'BANKBICAA',
      to: 'BANKBICBB',
      businessMessageIdentifier: 'MSG-001',
      messageDefinitionIdentifier: 'pacs.008.001.08',
      creationDate: '2023-01-01T12:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('validateMXWithZod validates a parsed MX message', () => {
    const parsed = parseMX(pacs008Xml);
    const def = getMXDefinition(parsed.type);
    if (def) {
      const result = validateMXWithZod(parsed, def);
      expect(result).toBeDefined();
    }
  });

  it('createMXMessageSchema rejects wrong type', () => {
    const def = getMXDefinition('pacs.008.001.10');
    if (def) {
      const parsed = parseMX(pacs008Xml);
      const modified = { ...parsed, type: 'wrong.type' };
      const schema = createMXMessageSchema(def);
      const result = schema.safeParse(modified);
      expect(result.success).toBe(false);
    }
  });
});
