import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseMT } from '../src/mt/parser';
import { parseMX } from '../src/mx/parser';
import {
  loadMappings,
  convertMtToMx,
  convertMxToMt,
  getSupportedConversions,
} from '../src/swift/converter';
import type { ConversionMapping } from '../src/swift/types';

const mappingsPath = path.resolve(__dirname, '../definitions/swift/mappings/mt-mx-mappings.json');
const mappings: ConversionMapping[] = JSON.parse(fs.readFileSync(mappingsPath, 'utf-8'));

beforeAll(() => {
  loadMappings(mappings);
});

const mt103Raw = [
  '{1:F01BANKBICAAXXX0000000000}',
  '{2:I103BANKBICBBXXXN}',
  '{3:{108:MT103}}',
  '{4:\r\n:20:REF123456\r\n:23B:CRED\r\n:32A:230101USD1000,00\r\n:59:Jane Smith\r\n:70:Invoice 42\r\n:71A:SHA\r\n-}',
  '{5:{CHK:ABCDEF123456}}',
].join('');

const mt202Raw = [
  '{1:F01BANKBICAAXXX0000000000}',
  '{2:I202BANKBICBBXXXN}',
  '{3:{108:MT202}}',
  '{4:\r\n:20:REF789\r\n:21:RELREF\r\n:32A:230101EUR5000,00\r\n:52A:BANKBICC\r\n:58A:BANKBICD\r\n-}',
  '{5:{CHK:123456789012}}',
].join('');

describe('getSupportedConversions', () => {
  it('returns all loaded conversion pairs', () => {
    const pairs = getSupportedConversions();
    expect(pairs.length).toBeGreaterThanOrEqual(8);
    expect(pairs.some((p) => p.mtType === '103' && p.mxType === 'pacs.008.001.08')).toBe(true);
    expect(pairs.some((p) => p.mtType === '202' && p.mxType === 'pacs.009.001.08')).toBe(true);
  });
});

describe('convertMtToMx', () => {
  it('converts MT103 to pacs.008', () => {
    const result = convertMtToMx(mt103Raw);
    expect(result.message.type).toBe('pacs.008.001.08');
    expect(result.message.namespace).toContain('pacs.008');
    expect(result.warnings).toBeDefined();
  });

  it('converts parsed MT message', () => {
    const parsed = parseMT(mt103Raw);
    const result = convertMtToMx(parsed);
    expect(result.message.type).toBe('pacs.008.001.08');
  });

  it('converts MT202 to pacs.009', () => {
    const result = convertMtToMx(mt202Raw);
    expect(result.message.type).toBe('pacs.009.001.08');
  });

  it('includes warnings for unmapped fields', () => {
    const result = convertMtToMx(mt103Raw);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('throws for unsupported MT type', () => {
    const raw = '{1:F01BANKBICAAXXX0000000000}{2:I999BANKBICBBXXXN}{3:{108:MT999}}{4:\r\n:20:TEST\r\n-}{5:{CHK:000000000000}}';
    expect(() => convertMtToMx(raw)).toThrow(/No conversion mapping/);
  });

  it('converts with explicit target type', () => {
    const result = convertMtToMx(mt103Raw, 'pacs.008.001.08');
    expect(result.message.type).toBe('pacs.008.001.08');
  });
});

describe('convertMxToMt', () => {
  it('converts a pacs.008 MX message to MT103', () => {
    const fakeMx = {
      type: 'pacs.008.001.08',
      namespace: 'urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08',
      header: { from: 'BANKBICAA', to: 'BANKBICBB', businessMessageIdentifier: 'MSG-001', messageDefinitionIdentifier: 'pacs.008.001.08', creationDate: '2023-01-01' },
      document: {
        CdtTrfTxInf: {
          PmtId: { InstrId: 'INSTR-001' },
          PmtTpInf: { SvcLvl: { Cd: 'CRED' } },
          IntrBkSttlmAmt: '1000.00',
          Cdtr: { Nm: 'Jane Smith' },
          Dbtr: { Nm: 'John Doe' },
          RmtInf: { Ustrd: 'Invoice 42' },
          ChrgBr: 'SHA',
        },
      },
      raw: '<xml/>',
    };
    const result = convertMxToMt(fakeMx, '103');
    expect(result.message.type).toBe('103');
    expect(result.message.block4.length).toBeGreaterThan(0);
    expect(result.message.block4.some((f) => f.tag === '20')).toBe(true);
  });

  it('throws for unsupported MX type', () => {
    const fakeMx = {
      type: 'unknown.001.001.01',
      namespace: 'urn:iso:std:iso:20022:tech:xsd:unknown.001.001.01',
      header: { from: '', to: '', businessMessageIdentifier: '', messageDefinitionIdentifier: '', creationDate: '' },
      document: {},
      raw: '<xml/>',
    };
    expect(() => convertMxToMt(fakeMx)).toThrow(/No conversion mapping/);
  });
});
