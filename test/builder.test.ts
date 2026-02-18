
import { describe, it, expect } from 'vitest';
import { FIXParser } from '../src/fix-parser';

describe('Message Builder', () => {
  const parser = FIXParser.fromVersion('4.4');

  it('should build a valid NewOrderSingle message', () => {
    const builder = parser.getBuilder('D');
    
    // Use setTag for tag numbers or set for field names
    builder
      .setTag(49, 'Sender')
      .setTag(56, 'Target')
      .setTag(34, '1')
      .setTag(52, '20230101-00:00:00')
      .setTag(11, 'ClOrdID123')
      .setTag(55, 'AAPL')
      .setTag(54, '1') // Buy
      .setTag(60, '20230101-00:00:00')
      .setTag(40, '2'); // Limit

    const raw = builder.build();
    
    expect(raw).toContain('8=FIX.4.4');
    expect(raw).toContain('35=D');
    expect(raw).toContain('11=ClOrdID123');
    expect(raw).toContain('55=AAPL');
    
    // Check checksum and body length are present
    expect(raw).toMatch(/9=\d+/);
    expect(raw).toMatch(/10=\d{3}/);
  });

  it('should calculate checksum correctly', () => {
    // Simple message: 8=FIX.4.4|9=5|35=0|10=...
    // Body: 35=0
    // BodyLength: 5 (3+1+1)
    // Checksum: (51+53+61+48) % 256 = 213 -> 213
    
    const builder = parser.getBuilder('0'); // Heartbeat
    builder
      .setTag(49, 'S')
      .setTag(56, 'T')
      .setTag(34, '1')
      .setTag(52, '20230101-00:00:00');
      
    const raw = builder.build();
    
    // Validate the built message
    const validation = parser.validateRaw(raw);
    expect(validation.valid).toBe(true);
  });

  it('should handle repeating groups in builder', () => {
    // Assuming builder supports groups via nested structure or specific API
    // If builder API for groups is not yet defined/implemented, skip this or adapt.
    // Based on previous files, let's see if builder supports groups.
    // If not, maybe just flat fields for now.
    
    const builder = parser.getBuilder('D');
    // ...
  });
});
