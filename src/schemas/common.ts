/**
 * لبنات مشتركة لكل الـ schemas.
 *
 * ⚠️ قاعدة الحقول الثلاثة (CLAUDE.md القسم 2.3):
 * لكل كيان **schema واحد** تُشتقّ منه تهيئة النموذج وقائمة الإضافة وقائمة التحديث.
 * لا قوائم يدوية — فلا يمكن نسيان واحدة.
 */

import { z } from 'zod';

import { RESERVED_SLUGS, SAUDI_COUNTRY_CODE, SLUG_PATTERN } from '@/config/constants';
import { STRINGS } from '@/config/strings';

const v = STRINGS.validation;

/** معرّف UUID من Postgres. */
export const uuid = z.uuid();

/** طابع زمني ISO من Postgres. */
export const timestamp = z.iso.datetime({ offset: true });

/** نص مطلوب بحد أقصى للطول. */
export function requiredText(max: number) {
  return z.string().trim().min(1, v.required).max(max, v.tooLong);
}

/** نص اختياري — الفراغ يصير `null` حتى لا نخزّن سلاسل فارغة. */
export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, v.tooLong)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .default(null);
}

/**
 * سعر بالريال السعودي.
 * يقبل النص القادم من `<input>` ويحوّله رقماً — لأن النموذج يعطي نصاً دائماً.
 */
export const price = z
  .union([z.number(), z.string()])
  .transform((value, ctx) => {
    const parsed = typeof value === 'number' ? value : Number(value.trim());

    if (Number.isNaN(parsed)) {
      ctx.addIssue({ code: 'custom', message: v.priceInvalid });
      return z.NEVER;
    }

    return parsed;
  })
  .pipe(z.number().nonnegative(v.priceNegative).finite(v.priceInvalid));

/** رابط اختياري. */
export const optionalUrl = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .default(null)
  .refine(
    (value) => value === null || z.url().safeParse(value).success,
    v.invalidUrl,
  );

/**
 * slug المنيو العام: `/m/<slug>`.
 * يرفض الكلمات المحجوزة التي تتعارض مع مسارات التطبيق.
 */
export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, v.required)
  .regex(SLUG_PATTERN, v.invalidSlug)
  .refine(
    (value) => !(RESERVED_SLUGS as readonly string[]).includes(value),
    v.reservedSlug,
  );

/**
 * رقم جوال سعودي — يُخزَّن دائماً بصيغة `9665xxxxxxxx`.
 *
 * منطق التطبيع منقول من المشروع القديم (كان الجزء السليم فيه):
 * يتعامل مع `05…` و `5…` و `00966…` و `+966…`.
 */
export const saudiPhone = z
  .string()
  .trim()
  .transform((value, ctx) => {
    let digits = value.replace(/\D/g, '');

    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.startsWith('0')) digits = digits.slice(1);
    if (!digits.startsWith(SAUDI_COUNTRY_CODE)) digits = SAUDI_COUNTRY_CODE + digits;

    // بعد التطبيع: 966 + 9 أرقام تبدأ بـ 5
    if (!/^9665\d{8}$/.test(digits)) {
      ctx.addIssue({ code: 'custom', message: v.invalidPhone });
      return z.NEVER;
    }

    return digits;
  });

/** رقم جوال اختياري. */
export const optionalSaudiPhone = z
  .union([z.literal(''), saudiPhone])
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .default(null);

/** الأعمدة التي تولّدها قاعدة البيانات — تُحذف دائماً من مخطط الإضافة. */
export const GENERATED_COLUMNS = {
  id: true,
  created_at: true,
  updated_at: true,
} as const;
