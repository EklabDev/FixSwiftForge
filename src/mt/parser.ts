import type {
  ParsedMTMessage,
  BasicHeader,
  AppHeader,
  UserHeader,
  TrailerBlock,
  MTField,
} from './types';

function extractBlocks(raw: string): Record<number, string> {
  const blocks: Record<number, string> = {};
  const re = /\{(\d):/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const num = parseInt(m[1], 10);
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    while (i < raw.length && depth > 0) {
      if (raw[i] === '{') depth++;
      else if (raw[i] === '}') depth--;
      i++;
    }
    blocks[num] = raw.slice(start, i - 1);
  }
  return blocks;
}

function parseBlock1(content: string): BasicHeader {
  if (content.length < 25) {
    throw new Error('Block 1: invalid format (expected at least 25 characters)');
  }
  return {
    appId: content.slice(0, 1),
    serviceId: content.slice(1, 3),
    senderLT: content.slice(3, 15),
    sessionNumber: content.slice(15, 19),
    sequenceNumber: content.slice(19, 25),
  };
}

function parseBlock2(content: string): AppHeader {
  const direction = content[0] as 'I' | 'O';
  const messageType = content.slice(1, 4);
  const result: AppHeader = { direction, messageType };
  if (direction === 'I') {
    result.receiverAddress = content.slice(4, 16);
    result.priority = content[16] ?? undefined;
  } else {
    result.senderAddress = content.slice(4, 16);
    result.messageInputReference = content.slice(16, 28);
    result.deliveryMonitor = content.slice(28, 31);
    result.obsolescencePeriod = content.slice(31, 33);
    result.outputDate = content.slice(33, 39);
    result.outputTime = content.slice(39, 43);
    result.priority = content[43] ?? undefined;
  }
  return result;
}

function parseBlock3(content: string): UserHeader {
  const fields: Record<string, string> = {};
  const subBlockRegex = /\{(\d+):([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = subBlockRegex.exec(content)) !== null) {
    fields[m[1]] = m[2];
  }
  return { fields };
}

function parseBlock4(content: string): MTField[] {
  const fields: MTField[] = [];
  const fieldRegex = /:([A-Z0-9]{2,3}):([\s\S]*?)(?=:[A-Z0-9]{2,3}:|$)/g;
  let m: RegExpExecArray | null;
  while ((m = fieldRegex.exec(content)) !== null) {
    let value = m[2].trimEnd();
    if (value.endsWith('-') && (content[m.index + m[0].length] === '}' || !content[m.index + m[0].length])) {
      value = value.slice(0, -1).trimEnd();
    }
    fields.push({ tag: m[1], value });
  }
  return fields;
}

function parseBlock5(content: string): TrailerBlock {
  const fields: Record<string, string> = {};
  const subBlockRegex = /\{([A-Z]+):([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = subBlockRegex.exec(content)) !== null) {
    fields[m[1]] = m[2];
  }
  return { fields };
}

export function parseMT(raw: string): ParsedMTMessage {
  if (!raw || !raw.trim()) {
    throw new Error('Empty input');
  }
  const blocks = extractBlocks(raw);
  if (!blocks[1]) throw new Error('Missing Block 1 (Basic Header)');
  if (!blocks[2]) throw new Error('Missing Block 2 (Application Header)');
  if (!blocks[4]) throw new Error('Missing Block 4 (User Message)');
  return {
    type: parseBlock2(blocks[2]).messageType,
    block1: parseBlock1(blocks[1]),
    block2: parseBlock2(blocks[2]),
    block3: blocks[3] ? parseBlock3(blocks[3]) : { fields: {} },
    block4: parseBlock4(blocks[4]),
    block5: blocks[5] ? parseBlock5(blocks[5]) : { fields: {} },
    raw,
  };
}
