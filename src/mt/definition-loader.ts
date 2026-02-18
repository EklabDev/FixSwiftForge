import * as fs from 'fs';
import * as path from 'path';
import type { MTMessageDef, MTFieldDef } from './types';

interface RawMTDef {
  category: number;
  categoryName: string;
  messages: Array<{
    type: string;
    name: string;
    fields: Array<{
      tag: string;
      name: string;
      format: string;
      mandatory: boolean;
      repeatable: boolean;
    }>;
  }>;
}

const definitionsDir = path.resolve(__dirname, '../../definitions/swift/mt');
let cache: Map<string, MTMessageDef> | null = null;

function loadAll(): Map<string, MTMessageDef> {
  if (cache) return cache;
  cache = new Map();
  if (!fs.existsSync(definitionsDir)) return cache;

  const files = fs.readdirSync(definitionsDir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const raw: RawMTDef = JSON.parse(fs.readFileSync(path.join(definitionsDir, file), 'utf-8'));
    for (const msg of raw.messages) {
      const fields: MTFieldDef[] = msg.fields.map((f) => ({
        tag: f.tag,
        name: f.name,
        format: f.format,
        mandatory: f.mandatory,
        repeatable: f.repeatable,
      }));
      cache.set(msg.type, {
        type: msg.type,
        name: msg.name,
        category: raw.category,
        fields,
      });
    }
  }
  return cache;
}

export function getMTDefinition(type: string): MTMessageDef | undefined {
  return loadAll().get(type);
}

export function getAllMTDefinitions(): MTMessageDef[] {
  return Array.from(loadAll().values());
}

export function getMTTypes(): string[] {
  return Array.from(loadAll().keys());
}

export function getMTTypesByCategory(category: number): MTMessageDef[] {
  return getAllMTDefinitions().filter((d) => d.category === category);
}

export function clearMTDefinitionCache(): void {
  cache = null;
}
