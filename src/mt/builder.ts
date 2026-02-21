import type { MTField, ParsedMTMessage } from './types';

function padBIC(bic: string, len: number): string {
  return bic.padEnd(len, 'X').slice(0, len);
}

export class MTBuilder {
  private readonly messageType: string;
  private senderBIC: string = '';
  private receiverBIC: string = '';
  private priority: string = 'N';
  private block4: Map<string, string> = new Map();

  constructor(messageType: string) {
    this.messageType = messageType;
  }

  setSender(bic: string): this {
    this.senderBIC = bic;
    return this;
  }

  setReceiver(bic: string): this {
    this.receiverBIC = bic;
    return this;
  }

  setPriority(priority: string): this {
    this.priority = priority;
    return this;
  }

  setField(tag: string, value: string): this {
    this.block4.set(tag, value);
    return this;
  }

  clearField(tag: string): this {
    this.block4.delete(tag);
    return this;
  }

  getField(tag: string): string | undefined {
    return this.block4.get(tag);
  }

  build(): string {
    const b1 = `{1:F01${padBIC(this.senderBIC, 12)}0000000000}`;
    const b2 = `{2:I${this.messageType}${padBIC(this.receiverBIC, 12)}${this.priority}}`;
    const b3 = `{3:{108:MT${this.messageType}}}`;
    const fields: string[] = [];
    for (const [tag, value] of this.block4.entries()) {
      fields.push(`:${tag}:${value}`);
    }
    const b4 = `{4:\r\n${fields.join('\r\n')}\r\n-}`;
    const b5 = `{5:{CHK:000000000000}}`;
    return `${b1}${b2}${b3}${b4}${b5}`;
  }
}

export function createMTBuilder(messageType: string): MTBuilder {
  return new MTBuilder(messageType);
}
