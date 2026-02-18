import * as fs from 'fs';
import * as path from 'path';
import type { MXMessageDef, MXElementDef } from './types';

interface RawMXDef {
  businessArea: string;
  businessAreaName: string;
  messages: Array<{
    type: string;
    name: string;
    namespace: string;
    rootElement: string;
    elements: MXElementDef[];
  }>;
}

const definitionsDir = path.resolve(__dirname, '../../definitions/swift/mx');
let cache: Map<string, MXMessageDef> | null = null;

function loadAll(): Map<string, MXMessageDef> {
  if (cache) return cache;
  cache = new Map();
  if (!fs.existsSync(definitionsDir)) return cache;

  const files = fs.readdirSync(definitionsDir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const raw: RawMXDef = JSON.parse(fs.readFileSync(path.join(definitionsDir, file), 'utf-8'));
    for (const msg of raw.messages) {
      cache.set(msg.type, {
        type: msg.type,
        name: msg.name,
        namespace: msg.namespace,
        rootElement: msg.rootElement,
        elements: msg.elements,
      });
    }
  }
  return cache;
}

export function getMXDefinition(type: string): MXMessageDef | undefined {
  return loadAll().get(type);
}

export function getAllMXDefinitions(): MXMessageDef[] {
  return Array.from(loadAll().values());
}

export function getMXTypes(): string[] {
  return Array.from(loadAll().keys());
}

export function getMXTypesByArea(area: string): MXMessageDef[] {
  return getAllMXDefinitions().filter((d) => d.type.startsWith(area + '.'));
}

export function clearMXDefinitionCache(): void {
  cache = null;
}
