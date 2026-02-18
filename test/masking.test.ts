
import { describe, it, expect } from 'vitest';
import { FIXParser } from '../src/fix-parser';

describe('Field Masking', () => {
  const parser = FIXParser.fromVersion('4.4');
  const raw = '8=FIX.4.4\x019=55\x0135=D\x0149=Sender\x0156=Target\x0134=1\x0152=20230101-00:00:00\x0111=ClOrdID123\x0155=AAPL\x0154=1\x0110=123\x01';

  it('should mask specific fields by tag', () => {
    const masked = parser.maskRaw(raw, {
      fields: [11, 55],
      placeholder: '***'
    });

    expect(masked).toContain('11=***');
    expect(masked).toContain('55=***');
    expect(masked).toContain('49=Sender'); // Not masked
  });

  it('should mask specific fields by name', () => {
    const masked = parser.maskRaw(raw, {
      fields: ['ClOrdID', 'Symbol'],
      placeholder: 'XXX'
    });

    expect(masked).toContain('11=XXX');
    expect(masked).toContain('55=XXX');
  });

  it('should mask parsed message fields', () => {
    const parsed = parser.parse(raw);
    const masked = parser.maskParsed(parsed, {
      fields: [11],
      placeholder: '***'
    });

    // Check body fields by name
    expect(masked.body['ClOrdID']).toBe('***');
    expect(masked.body['Symbol']).toBe('AAPL'); // Not masked
  });
});
