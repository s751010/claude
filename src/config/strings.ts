/**
 * كل نص عربي في المشروع.
 *
 * قاعدة (CLAUDE.md القسم 3): **لا نص عربي مكتوب حرفياً في JSX.**
 * كل نص يُضاف هنا ويُستورد.
 *
 * ينمو هذا الملف مع كل مرحلة. إن تجاوز 300 سطر يُقسَّم حسب المجال
 * (`strings/menu.ts`، `strings/billing.ts` …) مع إبقاء `strings.ts` نقطة تصدير واحدة.
 */

import { APP_NAME } from './constants';

export const STRINGS = {
  app: {
    name: APP_NAME,
    tagline: 'المنيو الرقمي للمطاعم السعودية',
    description: 'اصنع منيو مطعمك، واحصل على QR يفتحه زبائنك من جوالاتهم.',
  },

  /** أفعال متكرّرة عبر الواجهة كلها. */
  actions: {
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    add: 'إضافة',
    back: 'رجوع',
    next: 'التالي',
    confirm: 'تأكيد',
    retry: 'إعادة المحاولة',
    close: 'إغلاق',
    copy: 'نسخ',
    download: 'تنزيل',
    upload: 'رفع',
    search: 'بحث',
  },

  /** حالات الواجهة — لا تُترك أي منها بلا نص. */
  states: {
    loading: 'جارٍ التحميل…',
    saving: 'جارٍ الحفظ…',
    saved: 'تم الحفظ',
    empty: 'لا يوجد شيء هنا بعد',
    notFound: 'الصفحة غير موجودة',
  },

  /**
   * رسائل الخطأ.
   * قاعدة (CLAUDE.md القسم 7): كل رسالة تشرح **ما حدث** و**كيف يُحل**.
   */
  errors: {
    generic: 'حدث خطأ غير متوقع. حاول مرة أخرى، وإن تكرّر راسل الدعم.',
    network: 'تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.',
    unauthorized: 'انتهت جلستك. سجّل الدخول من جديد للمتابعة.',
    forbidden: 'لا تملك صلاحية لهذا الإجراء.',
    notFound: 'لم نجد ما تبحث عنه. قد يكون حُذف أو تغيّر رابطه.',
    validation: 'راجع الحقول المميّزة بالأحمر ثم أعد المحاولة.',
    saveFailed: 'لم يُحفظ التغيير. أعد المحاولة، وإن تكرّر راسل الدعم.',
    uploadFailed: 'فشل رفع الصورة. تأكد أن حجمها أقل من الحد المسموح وأن صيغتها مدعومة.',
  },

  /** رسائل التحقق من المدخلات — تُستخدم داخل schemas الـ zod. */
  validation: {
    required: 'هذا الحقل مطلوب',
    tooLong: 'النص أطول من المسموح',
    tooShort: 'النص أقصر من المطلوب',
    invalidEmail: 'صيغة البريد الإلكتروني غير صحيحة',
    invalidPhone: 'رقم الجوال غير صحيح. اكتبه هكذا: 05xxxxxxxx',
    invalidUrl: 'صيغة الرابط غير صحيحة',
    invalidSlug: 'الرابط يقبل حروفاً إنجليزية صغيرة وأرقاماً وشرطات فقط',
    reservedSlug: 'هذا الرابط محجوز. اختر غيره.',
    priceRequired: 'السعر مطلوب',
    priceNegative: 'السعر لا يكون سالباً',
    priceInvalid: 'اكتب السعر رقماً، مثل 24.5',
  },

  /** رسائل حدود الباقات — AUDIT.md B2. */
  limits: {
    menusReached: 'بلغت حد المنيوهات في باقتك. ارفع الباقة لإضافة المزيد.',
    dishesReached: 'بلغت حد الأطباق في باقتك. ارفع الباقة لإضافة المزيد.',
    aiUnavailable: 'ميزات الذكاء الاصطناعي غير متاحة في باقتك الحالية.',
    unlimited: 'غير محدود',
  },

  /** الباقات والفوترة — خالد. الأرقام تأتي من config/pricing.ts، لا من هنا. */
  billing: {
    plans: {
      growth: { name: 'نمو', description: 'الأنسب لأغلب المطاعم' },
      pro: { name: 'احتراف', description: 'للسلاسل والمطاعم الجادّة' },
    },
    cycles: {
      monthly: 'شهري',
      yearly: 'سنوي',
    },
    perMonth: 'شهرياً',
    perYear: 'سنوياً',
    currency: 'ريال',
    save: 'وفّر',
    subscribe: 'اشترك',
    currentPlan: 'باقتك الحالية',
    expiresIn: 'تنتهي خلال',
    day: 'يوم',
    expired: 'انتهى اشتراكك',
    renew: 'جدّد الاشتراك',
  },

  /** خريطة الوكلاء — أسماء المجالات كما تظهر في التنقّل. */
  areas: {
    menuEditor: 'محرر المنيو',
    settings: 'الإعدادات',
    billing: 'الاشتراك والفواتير',
    reviews: 'التقييمات',
    loyalty: 'الولاء',
    ai: 'الذكاء الاصطناعي',
    support: 'الدعم',
    publicMenu: 'المنيو العام',
    founderOverview: 'النظرة العامة',
    founderRestaurants: 'المطاعم',
    founderRevenue: 'الإيرادات',
    founderContent: 'المحتوى',
    founderTeam: 'الفريق',
  },
} as const;

export type Strings = typeof STRINGS;
