/**
 * الأسعار ورسوم بيلينك.
 *
 * ⚠️ هذا الملف هو **المكان الوحيد** في المشروع الذي يحتوي قيَماً رقمية مالية.
 * أي رقم سعر أو نسبة رسوم مكتوب حرفياً خارج هذا الملف = خطأ يُصلَح فوراً.
 * انظر CLAUDE.md القسم 2.2، و AUDIT.md — B4 (الأسعار كانت مكرّرة في مكوّنين).
 */

/** معرّفات الباقات. باقتان فقط — حُذفت باقة "أساسي" بقرار صاحب المشروع. */
export const PLAN_IDS = ['growth', 'pro'] as const;

export type PlanId = (typeof PLAN_IDS)[number];

/** دورة الفوترة. */
export const BILLING_CYCLES = ['monthly', 'yearly'] as const;

export type BillingCycle = (typeof BILLING_CYCLES)[number];

/** العملة — ريال سعودي. */
export const CURRENCY_CODE = 'SAR' as const;

/** أسعار الاشتراك بالريال السعودي. */
export const PLAN_PRICES: Record<PlanId, Record<BillingCycle, number>> = {
  growth: { monthly: 99, yearly: 1129 },
  pro: { monthly: 199, yearly: 2269 },
};

/** عدد أشهر الاشتراك السنوي — يُستخدم لحساب تاريخ الانتهاء ونسبة التوفير. */
export const MONTHS_PER_YEAR = 12;

/**
 * رسوم بيلينك — باقة "البدء".
 * المصدر: CLOUDMENU_MASTER_BRIEF.md القسم 6.4.
 * تُستخدم لحساب **الصافي** الذي تعرضه لوحة الإيرادات (طارق).
 */
export const PAYLINK_FEES = {
  /** مدى — 1% */
  madaRate: 0.01,
  /** فيزا / ماستركارد — 2.75% */
  cardRate: 0.0275,
  /** رسم ثابت لكل عملية — 1 ريال */
  fixedPerTransaction: 1,
  /** رسم التحويل البنكي للتسوية — 5 ريال */
  bankTransfer: 5,
  /** لا اشتراك شهري على باقة البدء */
  monthlySubscription: 0,
  /** لا رسوم تأسيس */
  setupFee: 0,
} as const;

/** وسيلة الدفع — تحدّد نسبة الرسوم المطبَّقة. */
export const PAYMENT_METHODS = ['mada', 'card'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** تفصيل رسوم عملية واحدة. كل المبالغ بالريال السعودي. */
export interface FeeBreakdown {
  /** المبلغ الإجمالي المحصَّل من المطعم */
  gross: number;
  /** رسوم بيلينك (النسبة + الثابت) */
  fees: number;
  /** الصافي الواصل إلينا */
  net: number;
}

/** تقريب إلى هللتين — نتجنّب أخطاء الفاصلة العائمة في العرض. */
function toHalalas(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * يحسب رسوم بيلينك والصافي لعملية دفع واحدة.
 *
 * جدول `payments` يخزّن الثلاثة (الإجمالي والرسوم والصافي)،
 * ولوحة الإيرادات تعرض **الصافي** لا الإجمالي — القسم 6.4.
 */
export function calculateFees(gross: number, method: PaymentMethod): FeeBreakdown {
  const rate = method === 'mada' ? PAYLINK_FEES.madaRate : PAYLINK_FEES.cardRate;
  const fees = toHalalas(gross * rate + PAYLINK_FEES.fixedPerTransaction);

  return {
    gross: toHalalas(gross),
    fees,
    net: toHalalas(gross - fees),
  };
}

/** سعر الباقة لدورة فوترة معيّنة. */
export function getPrice(plan: PlanId, cycle: BillingCycle): number {
  return PLAN_PRICES[plan][cycle];
}

/** كم يوفّر المشترك السنوي مقابل دفع 12 شهراً منفصلة. */
export function getYearlySavings(plan: PlanId): number {
  const twelveMonths = PLAN_PRICES[plan].monthly * MONTHS_PER_YEAR;
  return toHalalas(twelveMonths - PLAN_PRICES[plan].yearly);
}

/** نسبة التوفير السنوي مقرَّبة لأقرب عدد صحيح (للعرض التسويقي). */
export function getYearlySavingsPercent(plan: PlanId): number {
  const twelveMonths = PLAN_PRICES[plan].monthly * MONTHS_PER_YEAR;
  return Math.round((getYearlySavings(plan) / twelveMonths) * 100);
}

/** عدد الأشهر التي تضيفها دورة الفوترة إلى تاريخ انتهاء الاشتراك. */
export function getCycleMonths(cycle: BillingCycle): number {
  return cycle === 'yearly' ? MONTHS_PER_YEAR : 1;
}
