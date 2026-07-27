/**
 * حدود كل باقة.
 *
 * ⚠️ AUDIT.md — B2: المشروع القديم عرّف هذه الحدود ولم يطبّقها في أي موضع إطلاقاً.
 * الفرق بين الباقات كان تسويقياً فقط.
 *
 * في هذا المشروع تُفرَض الحدود في **طبقتين**:
 *   1. `src/lib/db/` قبل الإدراج — لرسالة خطأ عربية واضحة للمستخدم
 *   2. trigger في قاعدة البيانات — لأن الواجهة وحدها ليست حاجزاً أمنياً
 */

import { PLAN_IDS, type PlanId } from './pricing';

export { PLAN_IDS };
export type { PlanId };

/**
 * `null` تعني **غير محدود**.
 * نتجنّب الرقم السحري 999 الذي استُخدم في المشروع القديم — كان يبدو حداً وهو ليس كذلك.
 */
export type Limit = number | null;

export interface PlanLimits {
  /** أقصى عدد منيوهات */
  menus: Limit;
  /** أقصى عدد أطباق عبر كل المنيوهات */
  dishes: Limit;
  /** هل ميزات ماجد (استيراد المنيو، توليد الأوصاف) متاحة؟ */
  ai: boolean;
  /** هل نظام الولاء (عمر) متاح؟ */
  loyalty: boolean;
  /** هل التقييمات والاستبيان (سلمى) متاحة؟ */
  reviews: boolean;
}

/**
 * الحدود الحالية منقولة من المشروع القديم كقيمة مبدئية.
 * ⚠️ بانتظار تأكيد صاحب المشروع — تغييرها سطر واحد هنا، ولا شيء آخر.
 */
export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  growth: {
    menus: 3,
    dishes: 100,
    ai: true,
    loyalty: true,
    reviews: true,
  },
  pro: {
    menus: null,
    dishes: null,
    ai: true,
    loyalty: true,
    reviews: true,
  },
};

/** ترتيب الباقات تصاعدياً — يُستخدم لمعرفة إن كانت الترقية صعوداً أم هبوطاً. */
export const PLAN_RANK: Record<PlanId, number> = {
  growth: 1,
  pro: 2,
};

/** هل العدد الحالي ما زال ضمن الحد؟ `null` (غير محدود) يمرّ دائماً. */
export function isWithinLimit(current: number, limit: Limit): boolean {
  return limit === null || current < limit;
}

/** كم بقي للمستخدم قبل بلوغ الحد؟ `null` تعني غير محدود. */
export function remainingQuota(current: number, limit: Limit): Limit {
  return limit === null ? null : Math.max(0, limit - current);
}

/** هل يستطيع صاحب هذه الباقة إضافة منيو جديد؟ */
export function canAddMenu(plan: PlanId, currentMenus: number): boolean {
  return isWithinLimit(currentMenus, PLAN_LIMITS[plan].menus);
}

/** هل يستطيع صاحب هذه الباقة إضافة طبق جديد؟ */
export function canAddDish(plan: PlanId, currentDishes: number): boolean {
  return isWithinLimit(currentDishes, PLAN_LIMITS[plan].dishes);
}

/** هل الباقة `to` أعلى من الباقة `from`؟ */
export function isUpgrade(from: PlanId, to: PlanId): boolean {
  return PLAN_RANK[to] > PLAN_RANK[from];
}
