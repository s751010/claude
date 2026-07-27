/**
 * ثوابت عامة لا تنتمي إلى pricing أو plans أو themes أو strings.
 * أي ثابت جديد يوضع هنا، لا في المكوّنات.
 */

/** اسم المنتج كما يظهر للمستخدم. */
export const APP_NAME = 'كلاود منيو';

/** اللغة والاتجاه — عربي RTL أصلي، لا انعكاس واجهة إنجليزية. */
export const APP_LOCALE = 'ar-SA';
export const APP_DIRECTION = 'rtl';

/** رمز دولة المملكة العربية السعودية — لتطبيع أرقام الجوال. */
export const SAUDI_COUNTRY_CODE = '966';

/** حدود طول الحقول النصية — تتطابق مع قيود قاعدة البيانات. */
export const FIELD_LIMITS = {
  restaurantName: 60,
  restaurantSlug: 40,
  menuName: 60,
  menuDescription: 200,
  dishName: 80,
  dishDescription: 300,
  categoryName: 60,
  optionGroupName: 40,
  optionName: 40,
  supportSubject: 120,
  supportMessage: 2000,
} as const;

/** قيود الصور المرفوعة إلى Supabase Storage. */
export const IMAGE_LIMITS = {
  /** أقصى حجم للملف قبل الضغط — 8 ميجابايت */
  maxBytes: 8 * 1024 * 1024,
  /** أقصى عرض بعد الضغط */
  maxWidth: 1600,
  /** جودة الضغط */
  quality: 0.82,
  /** الصيغ المقبولة للرفع */
  acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
} as const;

/** اسم bucket صور الأطباق في Supabase Storage. */
export const STORAGE_BUCKET_MENU_IMAGES = 'menu-images';

/**
 * نمط الـ slug المسموح في رابط المنيو العام: `/m/<slug>`.
 * حروف لاتينية صغيرة وأرقام وشرطات فقط — لضمان رابط QR قصير وآمن.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** كلمات محجوزة لا تصلح slug لأنها تتعارض مع مسارات التطبيق. */
export const RESERVED_SLUGS = [
  'api',
  'dashboard',
  'founder',
  'login',
  'register',
  'm',
  'admin',
  'settings',
  'support',
] as const;

/** أيام الأسبوع بترتيب ساعات العمل السعودية (تبدأ من الأحد). */
export const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

/** كم يوماً قبل انتهاء الاشتراك نبدأ التنبيه. */
export const SUBSCRIPTION_WARNING_DAYS = 7;
