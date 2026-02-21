import { z } from 'zod';
import type {
  MTMessageDef,
  ParsedMTMessage,
  BasicHeader,
  AppHeader,
  UserHeader,
  TrailerBlock,
  MTField,
} from './types';

export const BasicHeaderSchema = z.object({
  appId: z.string(),
  serviceId: z.string(),
  senderLT: z.string().min(1, 'Sender LT required'),
  sessionNumber: z.string(),
  sequenceNumber: z.string(),
});

export const AppHeaderSchema = z.object({
  direction: z.enum(['I', 'O']),
  messageType: z.string().min(1, 'Message type required'),
  receiverAddress: z.string().optional(),
  senderAddress: z.string().optional(),
  priority: z.string().optional(),
  deliveryMonitor: z.string().optional(),
  obsolescencePeriod: z.string().optional(),
  inputTime: z.string().optional(),
  messageInputReference: z.string().optional(),
  outputDate: z.string().optional(),
  outputTime: z.string().optional(),
});

export const UserHeaderSchema = z.object({
  fields: z.record(z.string(), z.string()),
});

export const TrailerBlockSchema = z.object({
  fields: z.record(z.string(), z.string()),
});

export const MTFieldSchema = z.object({
  tag: z.string(),
  value: z.string(),
});

const FORMAT_PATTERNS: Record<string, RegExp> = {
  '16x': /^.{1,16}$/,
  '35x': /^.{1,35}$/,
  '50x': /^.{1,50}$/,
  '65x': /^.{1,65}$/,
  '3!a': /^[A-Z]{3}$/,
  '4!a': /^[A-Z]{4}$/,
  '3!c': /^[A-Za-z0-9]{3}$/,
  '4!c': /^[A-Za-z0-9]{4}$/,
  '6!n': /^\d{6}$/,
  '8!n': /^\d{8}$/,
  '15d': /^\d{1,15}(,\d+)?$/,
  '11!n': /^\d{11}$/,
  '34x': /^.{1,34}$/,
};

function matchesFormat(value: string, format: string): boolean {
  const pattern = FORMAT_PATTERNS[format];
  if (!pattern) return true;
  const lines = value.split('\n');
  return lines.every((line) => pattern.test(line));
}

export function createMTMessageSchema(definition: MTMessageDef) {
  return z
    .object({
      type: z.literal(definition.type),
      block1: BasicHeaderSchema,
      block2: AppHeaderSchema.refine(
        (h) => h.messageType === definition.type,
        {
          message: `Block2 messageType must be ${definition.type}`,
          path: ['messageType'],
        },
      ),
      block3: UserHeaderSchema,
      block4: z.array(MTFieldSchema),
      block5: TrailerBlockSchema,
      raw: z.string(),
    })
    .superRefine((msg, ctx) => {
      const presentTags = new Set(msg.block4.map((f) => f.tag));

      for (const fieldDef of definition.fields) {
        if (fieldDef.mandatory && !presentTags.has(fieldDef.tag)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['block4', fieldDef.tag],
            message: `Mandatory field ${fieldDef.tag} is missing`,
          });
        }
      }

      for (const field of msg.block4) {
        const fieldDef = definition.fields.find((d) => d.tag === field.tag);
        if (!fieldDef) continue;

        if (!matchesFormat(field.value, fieldDef.format)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['block4', field.tag],
            message: `Field ${field.tag} does not match format ${fieldDef.format}`,
          });
        }
      }
    });
}

export function validateMTWithZod(
  msg: ParsedMTMessage,
  definition: MTMessageDef,
): { valid: boolean; errors: Array<{ path: string; message: string }> } {
  const result = createMTMessageSchema(definition).safeParse(msg);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));

  return { valid: false, errors };
}
