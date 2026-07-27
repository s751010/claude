/**
 * خالد — الدفع: schema الاشتراك.
 *
 * ⚠️ AUDIT.md — C2: المشروع القديم سمح للعميل بإدراج صف اشتراك بنفسه،
 * فكان أي مستخدم يمنح نفسه أعلى باقة مجاناً.
 *
 * في هذا المشروع:
 *   - RLS تمنع `INSERT` و `UPDATE` على `subscriptions` من **أي** دور عميل
 *   - الكتابة حصراً بصلاحية service role، من مصدرين فقط:
 *       1. webhook بيلينك مُتحقَّق منه  (CLAUDE.md القسم 5، بند 3)
 *       2. التفعيل اليدوي من لوحة المؤسس (طارق)
 *   - لذلك **لا يوجد `subscriptionInsertSchema` مُصدَّر للعميل**
 */

import { z } from 'zod';

import { BILLING_CYCLES, PLAN_IDS } from '@/config/pricing';
import { GENERATED_COLUMNS, timestamp, uuid } from './common';

/** كيف فُعِّل هذا الاشتراك — للتدقيق ولتمييز الإيراد اليدوي. */
export const SUBSCRIPTION_SOURCES = ['paylink_webhook', 'manual_founder'] as const;

export type SubscriptionSource = (typeof SUBSCRIPTION_SOURCES)[number];

/** كل حقول الاشتراك — المصدر الوحيد. */
export const subscriptionSchema = z.object({
  id: uuid,
  restaurant_id: uuid,
  plan_id: z.enum(PLAN_IDS),
  cycle: z.enum(BILLING_CYCLES),
  source: z.enum(SUBSCRIPTION_SOURCES),
  /** معرّف الاشتراك المتكرر لدى بيلينك — يُخزَّن للإلغاء والتجديد */
  paylink_recurring_id: z.string().nullable().default(null),
  /** مرجع العملية. للتفعيل اليدوي يبدأ بـ `MANUAL-` */
  payment_ref: z.string().nullable().default(null),
  starts_at: timestamp,
  ends_at: timestamp,
  active: z.boolean(),
  cancelled_at: timestamp.nullable().default(null),
  created_at: timestamp,
  updated_at: timestamp,
});

/**
 * مخطط الكتابة — **للاستخدام على السيرفر فقط**.
 * لا يُستورد في أي مكوّن عميل. RLS تمنع هذا المسار من دور العميل أصلاً.
 */
export const subscriptionServerInsertSchema = subscriptionSchema.omit(GENERATED_COLUMNS);

/** مدخلات التفعيل اليدوي من لوحة المؤسس (طارق) — القسم 6.5 من الـ Brief. */
export const manualActivationSchema = z.object({
  restaurant_id: uuid,
  plan_id: z.enum(PLAN_IDS),
  /** عدد الأشهر الممنوحة — من 1 إلى 24 */
  months: z.number().int().min(1).max(24),
  note: z.string().trim().max(200).nullable().default(null),
});

export type Subscription = z.infer<typeof subscriptionSchema>;
export type SubscriptionServerInsert = z.infer<typeof subscriptionServerInsertSchema>;
export type ManualActivation = z.infer<typeof manualActivationSchema>;

/** هل الاشتراك ساري الآن؟ يعتمد على العمودين معاً، لا على `active` وحده. */
export function isSubscriptionActive(
  subscription: Pick<Subscription, 'active' | 'ends_at'>,
  now: Date = new Date(),
): boolean {
  return subscription.active && new Date(subscription.ends_at) > now;
}

/** كم يوماً بقي على الانتهاء؟ صفر إن انتهى. */
export function daysUntilExpiry(
  subscription: Pick<Subscription, 'ends_at'>,
  now: Date = new Date(),
): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const remaining = new Date(subscription.ends_at).getTime() - now.getTime();
  return Math.max(0, Math.ceil(remaining / msPerDay));
}
