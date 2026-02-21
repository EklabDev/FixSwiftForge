import { describe, it, expect, beforeEach } from 'vitest';
import { parseMT } from '../src/mt/parser';
import { MTBuilder, createMTBuilder } from '../src/mt/builder';
import { validateMTRaw, validateMTParsed } from '../src/mt/validator';
import {
  getMTDefinition,
  getAllMTDefinitions,
  getMTTypes,
  getMTTypesByCategory,
} from '../src/mt/definition-loader';
import { maskMTRaw, maskMTParsed } from '../src/swift/masking';
import type { ParsedMTMessage } from '../src/mt/types';

const SAMPLE_MT103 =
  '{1:F01BANKBICAAXXX0000000000}{2:I103BANKBICBBXXXN}{3:{108:MT103}{121:174b-38df-1234}}{4:\r\n' +
  ':20:REF123456\r\n' +
  ':23B:CRED\r\n' +
  ':32A:230101USD1000,00\r\n' +
  ':50K:/123456789\r\n' +
  'John Doe\r\n' +
  ':59:/987654321\r\n' +
  'Jane Smith\r\n' +
  '123 Main Street\r\n' +
  ':70:Payment for services\r\n' +
  ':71A:SHA\r\n' +
  '-}{5:{CHK:ABCDEF123456}}';

const SAMPLE_MT202 =
  '{1:F01BANKBICAAXXX0000000000}{2:I202BANKBICBBXXXN}{3:{108:MT202}}{4:\r\n' +
  ':20:REF789012\r\n' +
  ':21:RELREF456\r\n' +
  ':32A:230101EUR5000,00\r\n' +
  ':52A:BANKBICCC\r\n' +
  ':58A:BANKBICDD\r\n' +
  '-}{5:{CHK:123456789012}}';

// ─── MT Parser ───────────────────────────────────────────────────────

describe('MT Parser', () => {
  describe('valid MT103', () => {
    let msg: ParsedMTMessage;

    beforeEach(() => {
      msg = parseMT(SAMPLE_MT103);
    });

    it('parses block1 header fields', () => {
      expect(msg.block1.appId).toBe('F');
      expect(msg.block1.serviceId).toBe('01');
      expect(msg.block1.senderLT).toBe('BANKBICAAXXX');
      expect(msg.block1.sessionNumber).toBe('0000');
      expect(msg.block1.sequenceNumber).toBe('000000');
    });

    it('parses block2 application header', () => {
      expect(msg.block2.direction).toBe('I');
      expect(msg.block2.messageType).toBe('103');
      expect(msg.block2.receiverAddress).toBe('BANKBICBBXXX');
      expect(msg.block2.priority).toBe('N');
    });

    it('parses block3 user header', () => {
      expect(msg.block3.fields['108']).toBe('MT103');
      expect(msg.block3.fields['121']).toBe('174b-38df-1234');
    });

    it('parses block4 tag/value pairs', () => {
      const tags = msg.block4.map((f) => f.tag);
      expect(tags).toContain('20');
      expect(tags).toContain('23B');
      expect(tags).toContain('32A');
      expect(tags).toContain('59');
      expect(tags).toContain('70');
      expect(tags).toContain('71A');

      const field20 = msg.block4.find((f) => f.tag === '20');
      expect(field20?.value).toBe('REF123456');

      const field71A = msg.block4.find((f) => f.tag === '71A');
      expect(field71A?.value).toBe('SHA');
    });

    it('parses block5 trailer', () => {
      expect(msg.block5.fields['CHK']).toBe('ABCDEF123456');
    });

    it('sets type to "103"', () => {
      expect(msg.type).toBe('103');
    });

    it('preserves raw input', () => {
      expect(msg.raw).toBe(SAMPLE_MT103);
    });
  });

  describe('valid MT202', () => {
    let msg: ParsedMTMessage;

    beforeEach(() => {
      msg = parseMT(SAMPLE_MT202);
    });

    it('parses block1 and block2', () => {
      expect(msg.block1.senderLT).toBe('BANKBICAAXXX');
      expect(msg.block2.messageType).toBe('202');
      expect(msg.type).toBe('202');
    });

    it('parses block4 fields', () => {
      const field20 = msg.block4.find((f) => f.tag === '20');
      expect(field20?.value).toBe('REF789012');

      const field21 = msg.block4.find((f) => f.tag === '21');
      expect(field21?.value).toBe('RELREF456');

      const field32A = msg.block4.find((f) => f.tag === '32A');
      expect(field32A?.value).toBe('230101EUR5000,00');

      const field52A = msg.block4.find((f) => f.tag === '52A');
      expect(field52A?.value).toBe('BANKBICCC');

      const field58A = msg.block4.find((f) => f.tag === '58A');
      expect(field58A?.value).toBe('BANKBICDD');
    });

    it('parses block5', () => {
      expect(msg.block5.fields['CHK']).toBe('123456789012');
    });
  });

  describe('multi-line field values', () => {
    it('parses :59: with multiple address lines', () => {
      const msg = parseMT(SAMPLE_MT103);
      const field59 = msg.block4.find((f) => f.tag === '59');
      expect(field59).toBeDefined();
      expect(field59!.value).toContain('/987654321');
      expect(field59!.value).toContain('Jane Smith');
      expect(field59!.value).toContain('123 Main Street');
    });

    it('parses :50K: with account and name lines', () => {
      const msg = parseMT(SAMPLE_MT103);
      const field50K = msg.block4.find((f) => f.tag === '50K');
      expect(field50K).toBeDefined();
      expect(field50K!.value).toContain('/123456789');
      expect(field50K!.value).toContain('John Doe');
    });
  });

  describe('missing optional blocks', () => {
    it('defaults block3 and block5 when absent', () => {
      const raw =
        '{1:F01BANKBICAAXXX0000000000}{2:I103BANKBICBBXXXN}{4:\r\n:20:REF1\r\n:71A:SHA\r\n-}';
      const msg = parseMT(raw);
      expect(msg.block3).toEqual({ fields: {} });
      expect(msg.block5).toEqual({ fields: {} });
    });
  });

  describe('error cases', () => {
    it('throws on empty input', () => {
      expect(() => parseMT('')).toThrow('Empty input');
    });

    it('throws on whitespace-only input', () => {
      expect(() => parseMT('   ')).toThrow('Empty input');
    });

    it('throws on missing block1', () => {
      const raw = '{2:I103BANKBICBBXXXN}{4:\r\n:20:REF\r\n-}';
      expect(() => parseMT(raw)).toThrow('Missing Block 1');
    });

    it('throws on missing block2', () => {
      const raw = '{1:F01BANKBICAAXXX0000000000}{4:\r\n:20:REF\r\n-}';
      expect(() => parseMT(raw)).toThrow('Missing Block 2');
    });

    it('throws on missing block4', () => {
      const raw = '{1:F01BANKBICAAXXX0000000000}{2:I103BANKBICBBXXXN}';
      expect(() => parseMT(raw)).toThrow('Missing Block 4');
    });
  });
});

// ─── MT Builder ──────────────────────────────────────────────────────

describe('MT Builder', () => {
  it('builds a complete MT103 message string', () => {
    const builder = new MTBuilder('103');
    builder
      .setSender('BANKBICAA')
      .setReceiver('BANKBICBB')
      .setField('20', 'BUILDREF001')
      .setField('32A', '230615USD2500,00')
      .setField('59', '/111222333\r\nAlice')
      .setField('71A', 'SHA');

    const output = builder.build();

    expect(output).toContain('{1:F01BANKBICAAXXX');
    expect(output).toContain('{2:I103BANKBICBBXXX');
    expect(output).toContain('{3:{108:MT103}}');
    expect(output).toContain(':20:BUILDREF001');
    expect(output).toContain(':32A:230615USD2500,00');
    expect(output).toContain(':59:/111222333');
    expect(output).toContain(':71A:SHA');
    expect(output).toContain('{5:{CHK:');
  });

  it('round-trips build → parse', () => {
    const builder = new MTBuilder('103');
    builder
      .setSender('BANKBICAA')
      .setReceiver('BANKBICBB')
      .setField('20', 'ROUNDTRIP1')
      .setField('23B', 'CRED')
      .setField('71A', 'OUR');

    const raw = builder.build();
    const parsed = parseMT(raw);

    expect(parsed.type).toBe('103');
    expect(parsed.block1.senderLT).toContain('BANKBICAA');
    expect(parsed.block2.receiverAddress).toContain('BANKBICBB');

    const f20 = parsed.block4.find((f) => f.tag === '20');
    expect(f20?.value).toBe('ROUNDTRIP1');

    const f23B = parsed.block4.find((f) => f.tag === '23B');
    expect(f23B?.value).toBe('CRED');
  });

  it('clearField removes a previously set field', () => {
    const builder = new MTBuilder('103');
    builder.setField('20', 'WILLDELETE');
    expect(builder.getField('20')).toBe('WILLDELETE');

    builder.clearField('20');
    expect(builder.getField('20')).toBeUndefined();

    const raw = builder.build();
    expect(raw).not.toContain(':20:');
  });

  it('getField returns the current value for a tag', () => {
    const builder = new MTBuilder('202');
    builder.setField('21', 'RELATED1');
    expect(builder.getField('21')).toBe('RELATED1');
    expect(builder.getField('99')).toBeUndefined();
  });

  it('createMTBuilder factory returns an MTBuilder instance', () => {
    const builder = createMTBuilder('103');
    expect(builder).toBeInstanceOf(MTBuilder);
    builder.setField('20', 'FACTORY');
    expect(builder.getField('20')).toBe('FACTORY');
  });

  it('setPriority changes the priority flag', () => {
    const builder = new MTBuilder('103');
    builder.setSender('AAAA').setReceiver('BBBB').setPriority('U');
    const raw = builder.build();
    expect(raw).toContain('U}');
  });
});

// ─── MT Validator ────────────────────────────────────────────────────

describe('MT Validator', () => {
  describe('validateMTRaw', () => {
    it('returns valid for a well-formed MT103', () => {
      const result = validateMTRaw(SAMPLE_MT103);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns invalid with parse error for garbage input', () => {
      const result = validateMTRaw('not a swift message');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Parse error');
    });

    it('returns invalid for empty input', () => {
      const result = validateMTRaw('');
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Parse error');
    });
  });

  describe('validateMTParsed', () => {
    it('returns valid for a correctly parsed message', () => {
      const parsed = parseMT(SAMPLE_MT103);
      const result = validateMTParsed(parsed);
      expect(result.valid).toBe(true);
    });

    it('reports error when senderLT is empty', () => {
      const parsed = parseMT(SAMPLE_MT103);
      parsed.block1.senderLT = '';
      const result = validateMTParsed(parsed);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('sender logical terminal'))).toBe(true);
    });

    it('reports error when block4 is empty', () => {
      const parsed = parseMT(SAMPLE_MT103);
      parsed.block4 = [];
      const result = validateMTParsed(parsed);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Block 4 has no fields'))).toBe(true);
    });

    it('reports missing mandatory fields when definition is provided', () => {
      const definition = getMTDefinition('103');
      if (!definition) {
        throw new Error('Expected MT103 definition to be loaded');
      }

      const parsed = parseMT(SAMPLE_MT103);
      parsed.block4 = parsed.block4.filter((f) => f.tag !== '20');

      const result = validateMTParsed(parsed, definition);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes(':20:'))).toBe(true);
    });
  });
});

// ─── MT Definition Loader ────────────────────────────────────────────

describe('MT Definition Loader', () => {
  it('getMTDefinition returns MT103 with expected shape', () => {
    const def = getMTDefinition('103');
    expect(def).toBeDefined();
    expect(def!.type).toBe('103');
    expect(def!.name).toBeTruthy();
    expect(def!.category).toBe(1);
    expect(Array.isArray(def!.fields)).toBe(true);
    expect(def!.fields.length).toBeGreaterThan(0);

    const f20 = def!.fields.find((f) => f.tag === '20');
    expect(f20).toBeDefined();
    expect(f20!.mandatory).toBe(true);
  });

  it('getMTDefinition returns undefined for unknown type', () => {
    expect(getMTDefinition('XYZ')).toBeUndefined();
  });

  it('getAllMTDefinitions returns more than 200 definitions', () => {
    const defs = getAllMTDefinitions();
    expect(defs.length).toBeGreaterThan(200);
  });

  it('getMTTypes returns an array of type strings', () => {
    const types = getMTTypes();
    expect(types.length).toBeGreaterThan(200);
    expect(types).toContain('103');
    expect(types).toContain('202');
    expect(types.every((t) => typeof t === 'string')).toBe(true);
  });

  it('getMTTypesByCategory(1) returns only category 1 messages', () => {
    const cat1 = getMTTypesByCategory(1);
    expect(cat1.length).toBeGreaterThan(0);
    expect(cat1.every((d) => d.category === 1)).toBe(true);
    expect(cat1.some((d) => d.type === '103')).toBe(true);
  });

  it('getMTTypesByCategory returns empty for non-existent category', () => {
    const cat99 = getMTTypesByCategory(99);
    expect(cat99).toHaveLength(0);
  });
});

// ─── MT Masking ──────────────────────────────────────────────────────

describe('MT Masking', () => {
  describe('maskMTRaw', () => {
    it('masks tag :20: with default placeholder', () => {
      const masked = maskMTRaw(SAMPLE_MT103, { fields: ['20'] });
      expect(masked).toContain(':20:***');
      expect(masked).not.toContain(':20:REF123456');
    });

    it('preserves other fields when masking :20:', () => {
      const masked = maskMTRaw(SAMPLE_MT103, { fields: ['20'] });
      expect(masked).toContain(':71A:SHA');
      expect(masked).toContain(':23B:CRED');
    });

    it('masks multiple tags at once', () => {
      const masked = maskMTRaw(SAMPLE_MT103, { fields: ['20', '70'] });
      expect(masked).toContain(':20:***');
      expect(masked).toContain(':70:***');
      expect(masked).not.toContain(':20:REF123456');
      expect(masked).not.toContain(':70:Payment for services');
    });

    it('uses a custom placeholder string', () => {
      const masked = maskMTRaw(SAMPLE_MT103, {
        fields: ['20'],
        placeholder: 'REDACTED',
      });
      expect(masked).toContain(':20:REDACTED');
    });
  });

  describe('maskMTParsed', () => {
    it('masks tag "20" value in block4', () => {
      const parsed = parseMT(SAMPLE_MT103);
      const masked = maskMTParsed(parsed, { fields: ['20'] });

      const f20 = masked.block4.find((f) => f.tag === '20');
      expect(f20?.value).toBe('***');
    });

    it('does not mutate the original parsed message', () => {
      const parsed = parseMT(SAMPLE_MT103);
      maskMTParsed(parsed, { fields: ['20'] });

      const f20 = parsed.block4.find((f) => f.tag === '20');
      expect(f20?.value).toBe('REF123456');
    });

    it('preserves unmasked fields', () => {
      const parsed = parseMT(SAMPLE_MT103);
      const masked = maskMTParsed(parsed, { fields: ['20'] });

      const f71A = masked.block4.find((f) => f.tag === '71A');
      expect(f71A?.value).toBe('SHA');
    });

    it('uses a custom placeholder string', () => {
      const parsed = parseMT(SAMPLE_MT103);
      const masked = maskMTParsed(parsed, {
        fields: ['20'],
        placeholder: 'HIDDEN',
      });

      const f20 = masked.block4.find((f) => f.tag === '20');
      expect(f20?.value).toBe('HIDDEN');
    });
  });
});

// ─── MT message types: positive and negative (2 tests per type) ───────

const MT_CATEGORIES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

describe('MT message types — positive and negative', () => {
  for (const category of MT_CATEGORIES) {
    const defs = getMTTypesByCategory(category);
    const typesToTest = defs.slice(0, 2).map((d) => d.type);

    for (const messageType of typesToTest) {
      describe(`MT${messageType} (category ${category})`, () => {
        it('positive: build, parse and validate structure', () => {
          const builder = new MTBuilder(messageType);
          builder
            .setSender('BANKBICAA')
            .setReceiver('BANKBICBB')
            .setField('20', `REF-${messageType}`);

          const raw = builder.build();
          const parsed = parseMT(raw);

          expect(parsed.type).toBe(messageType);
          expect(parsed.block1.senderLT).toContain('BANKBICAA');
          expect(parsed.block2.messageType).toBe(messageType);
          expect(parsed.block4.length).toBeGreaterThan(0);

          const f20 = parsed.block4.find((f) => f.tag === '20');
          expect(f20?.value).toBe(`REF-${messageType}`);
        });

        it('negative: malformed raw (missing block4) throws', () => {
          const badRaw = `{1:F01BANKBICAAXXX0000000000}{2:I${messageType}BANKBICBBXXXN}`;
          expect(() => parseMT(badRaw)).toThrow(/Missing Block 4/);
        });
      });
    }
  }
});
