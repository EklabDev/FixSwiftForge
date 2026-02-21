import { z } from 'zod';
import type {
  MXMessageDef,
  MXElementDef,
  ParsedMXMessage,
  MXAppHeader,
} from './types';

export const MXAppHeaderSchema = z.object({
  from: z.string(),
  to: z.string(),
  businessMessageIdentifier: z.string(),
  messageDefinitionIdentifier: z.string(),
  creationDate: z.string(),
});

function leafSchema(typeName: string): z.ZodTypeAny {
  switch (typeName) {
    case 'boolean':
      return z.boolean();
    case 'decimal':
      return z.union([z.string(), z.number()]);
    case 'integer':
      return z.number().int();
    default:
      return z.string();
  }
}

export function createElementSchema(def: MXElementDef): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  if (def.children && def.children.length > 0) {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const child of def.children) {
      shape[child.name] = createElementSchema(child);
    }
    schema = z.object(shape);
  } else {
    schema = leafSchema(def.type);
  }

  if (def.maxOccurs === 'unbounded' || def.maxOccurs > 1) {
    schema = z.array(schema);
  }

  if (def.minOccurs === 0) {
    schema = schema.optional();
  }

  return schema;
}

export function createMXMessageSchema(definition: MXMessageDef) {
  const docShape: Record<string, z.ZodTypeAny> = {};
  for (const el of definition.elements) {
    docShape[el.name] = createElementSchema(el);
  }

  return z.object({
    type: z.literal(definition.type),
    namespace: z.string(),
    header: MXAppHeaderSchema,
    document: z.object(docShape),
    raw: z.string(),
  });
}

export function validateMXWithZod(
  msg: ParsedMXMessage,
  definition: MXMessageDef,
): { valid: boolean; errors: Array<{ path: string; message: string }> } {
  const result = createMXMessageSchema(definition).safeParse(msg);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));

  return { valid: false, errors };
}
