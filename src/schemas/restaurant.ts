/**
 * سعد — الإعدادات العامة: schema المطعم.
 *
 * ⚠️ AUDIT.md — C4: المشروع القديم خزّن `payment_gateway` و `payment_key`
 * في هذا الجدول ويقرأهما العميل. **العمودان محذوفان بالكامل** —
 * لا بوابة دفع داخل المنيو (CLAUDE.md القسم 5).
 */

import { z } from 'zod';

import { FIELD_LIMITS, WEEKDAYS } from '@/config/constants';
import {
  GENERATED_COLUMNS,
  optionalSaudiPhone,
  optionalText,
  optionalUrl,
  requiredText,
  timestamp,
  uuid,
} from './common';

/** ساعات عمل يوم واحد. `closed` تعني مغلق ذلك اليوم. */
export const workingDaySchema = z.object({
  closed: z.boolean().default(false),
  /** بصيغة 24 ساعة `HH:MM` */
  open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('09:00'),
  close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('23:00'),
});

/** ساعات العمل الأسبوعية — مفتاح لكل يوم. */
export const workingHoursSchema = z
  .object(Object.fromEntries(WEEKDAYS.map((day) => [day, workingDaySchema])) as Record<
    (typeof WEEKDAYS)[number],
    typeof workingDaySchema
  >)
  .nullable()
  .default(null);

/** كل حقول المطعم — المصدر الوحيد. */
export const restaurantSchema = z.object({
  id: uuid,
  /** مالك الحساب في Supabase Auth */
  owner_id: uuid,
  name: requiredText(FIELD_LIMITS.restaurantName),
  /** نوع المطبخ — نص حر يساعد ماجد في توليد الأوصاف */
  cuisine: optionalText(60),
  logo_url: optionalUrl,
  banner_url: optionalUrl,

  /** رقم واتساب لاستقبال الطلبات — المسار الوحيد المسموح للسلة (القسم 5) */
  whatsapp: optionalSaudiPhone,
  phone: optionalSaudiPhone,
  address: optionalText(200),

  /** سعد — الحساسية وساعات العمل و Google */
  allergens_note: optionalText(500),
  working_hours: workingHoursSchema,
  google_review_url: optionalUrl,
  google_maps_url: optionalUrl,

  /** روابط التواصل */
  instagram_url: optionalUrl,
  x_url: optionalUrl,
  tiktok_url: optionalUrl,
  snapchat_url: optionalUrl,

  created_at: timestamp,
  updated_at: timestamp,
});

/** الثلاثة تُشتقّ — لا قوائم يدوية. */
export const restaurantInsertSchema = restaurantSchema.omit(GENERATED_COLUMNS);
export const restaurantUpdateSchema = restaurantInsertSchema.partial();

/** قيَم التهيئة لنموذج مطعم جديد. */
export function makeRestaurantDefaults(ownerId: string): RestaurantInsert {
  return restaurantInsertSchema.parse({
    owner_id: ownerId,
    name: '',
  });
}

export type Restaurant = z.infer<typeof restaurantSchema>;
export type RestaurantInsert = z.infer<typeof restaurantInsertSchema>;
export type RestaurantUpdate = z.infer<typeof restaurantUpdateSchema>;
export type WorkingHours = z.infer<typeof workingHoursSchema>;
