/**
 * الثيمات التسعة — **البنية فقط**.
 *
 * المرحلة 1 تبني العقد (contract) وآلية توليد متغيرات CSS.
 * القيَم البصرية الفعلية (الألوان والخطوط) تُصمَّم في **المرحلة 4** مع راشد.
 * كل ثيم أدناه يحمل رموزاً محايدة مؤقتة — ليست تصميماً نهائياً.
 *
 * ⚠️ AUDIT.md — B3: المشروع القديم كتب عدد الثيمات بثلاث قيم متناقضة (5 · 12 · 8).
 * هذا الملف هو المصدر الوحيد للعدد وللقائمة.
 *
 * قاعدة التصميم (CLAUDE.md القسم 7):
 *   - الثيم = مجموعة متغيرات CSS، لا ورقة أنماط منفصلة. البنية واحدة للجميع.
 *   - لكل ثيم عالَم بصري خاص من مطبخه، وزوج خطوط عربي مقصود (عرض + متن).
 *   - تجنّب المظهر الافتراضي: خلفية كريمية + serif عالي التباين + طيني دافئ.
 */

/** معرّفات الثيمات التسعة. الترتيب هو ترتيب العرض في محرر المنيو. */
export const THEME_IDS = [
  'najdi',
  'jeddah',
  'roastery',
  'midnight',
  'masala',
  'washi',
  'diner',
  'patisserie',
  'banquet',
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

/** الثيم الافتراضي لأي منيو جديد. */
export const DEFAULT_THEME_ID: ThemeId = 'najdi';

/**
 * رموز الثيم. كل مفتاح هنا يصير متغيّر CSS باسم `--cm-<kebab-case>`.
 * البنية مأخوذة من المشروع القديم (كانت الجزء السليم فيه)، والقيَم تُصمَّم من الصفر.
 */
export interface ThemeTokens {
  /** لون الخلفية الأساسي */
  bg: string;
  /** طبقة زخرفية فوق الخلفية (تدرّج أو نقش) — `none` إن لم يوجد */
  bgLayer: string;
  /** خلفية البطاقة */
  surface: string;
  /** حدّ البطاقة */
  surfaceBorder: string;
  /** ظل البطاقة */
  surfaceShadow: string;
  /** اللون المميّز — الأزرار والتأكيدات */
  accent: string;
  /** لون النص فوق اللون المميّز */
  accentText: string;
  /** لون النص الأساسي */
  text: string;
  /** لون النص الثانوي */
  textMuted: string;
  /** نصف قطر الانحناء */
  radius: string;
}

/** وصف الثيم: هويته وعالمه البصري ورموزه. */
export interface Theme {
  id: ThemeId;
  /** الاسم المعروض للمطعم في محرر المنيو */
  name: string;
  /** العالَم البصري — مرجع المصمّم في المرحلة 4 */
  world: string;
  /** خط العناوين. يُحدَّد في المرحلة 4. */
  displayFont: string;
  /** خط المتن. يُحدَّد في المرحلة 4. */
  bodyFont: string;
  tokens: ThemeTokens;
}

/**
 * رموز محايدة مؤقتة — **ليست تصميماً**.
 * وجودها يجعل النظام قابلاً للبناء والاختبار قبل مرحلة التصميم.
 */
const PLACEHOLDER_TOKENS: ThemeTokens = {
  bg: '#ffffff',
  bgLayer: 'none',
  surface: '#f5f5f5',
  surfaceBorder: '1px solid #e0e0e0',
  surfaceShadow: 'none',
  accent: '#1a1a1a',
  accentText: '#ffffff',
  text: '#1a1a1a',
  textMuted: '#6b6b6b',
  radius: '8px',
};

/**
 * الثيمات التسعة. كل واحد سيحصل على رموزه وخطوطه في المرحلة 4.
 * حقل `world` هو التوجيه التصميمي المتفق عليه في PLAN.md القسم 4.
 */
export const THEMES: Record<ThemeId, Theme> = {
  najdi: {
    id: 'najdi',
    name: 'نجدي',
    world: 'بيت طيني — آجُرّي عميق، نقوش هندسية، مساحات صلبة',
    displayFont: '',
    bodyFont: '',
    tokens: PLACEHOLDER_TOKENS,
  },
  jeddah: {
    id: 'jeddah',
    name: 'جدّاوي',
    world: 'روشان وبحر — فيروزي، خشب ساج، تفاصيل مخرّمة',
    displayFont: '',
    bodyFont: '',
    tokens: PLACEHOLDER_TOKENS,
  },
  roastery: {
    id: 'roastery',
    name: 'محمصة',
    world: 'قهوة مختصة — إسمنتي، برتقالي محمّص، شبكة صارمة',
    displayFont: '',
    bodyFont: '',
    tokens: PLACEHOLDER_TOKENS,
  },
  midnight: {
    id: 'midnight',
    name: 'منتصف الليل',
    world: 'ليل الشاورما — أسود دخاني، نيون، طاقة عالية',
    displayFont: '',
    bodyFont: '',
    tokens: PLACEHOLDER_TOKENS,
  },
  masala: {
    id: 'masala',
    name: 'بهارات',
    world: 'هندي — زمردي وكركمي، ذهبي عتيق، زخرفة كثيفة',
    displayFont: '',
    bodyFont: '',
    tokens: PLACEHOLDER_TOKENS,
  },
  washi: {
    id: 'washi',
    name: 'واشي',
    world: 'ياباني — أبيض ورقي، أحمر شنجو واحد، فراغ واسع',
    displayFont: '',
    bodyFont: '',
    tokens: PLACEHOLDER_TOKENS,
  },
  diner: {
    id: 'diner',
    name: 'دايْنر',
    world: 'أمريكي — أحمر وكريمي، خطوط عريضة، حدود سميكة',
    displayFont: '',
    bodyFont: '',
    tokens: PLACEHOLDER_TOKENS,
  },
  patisserie: {
    id: 'patisserie',
    name: 'حلويات',
    world: 'باستيل، وردي فاتح، حواف مدوّرة كبيرة',
    displayFont: '',
    bodyFont: '',
    tokens: PLACEHOLDER_TOKENS,
  },
  banquet: {
    id: 'banquet',
    name: 'مأدبة',
    world: 'عشاء فاخر — أسود وذهبي مطفي لا لامع، تباعد سخي',
    displayFont: '',
    bodyFont: '',
    tokens: PLACEHOLDER_TOKENS,
  },
};

/** قائمة الثيمات بترتيب العرض. */
export const THEME_LIST: readonly Theme[] = THEME_IDS.map((id) => THEMES[id]);

/** عدد الثيمات — مشتقّ، لا مكتوب. يمنع تكرار مشكلة B3. */
export const THEME_COUNT = THEME_IDS.length;

/** هل هذه القيمة معرّف ثيم صالح؟ يُستخدم للتحقق قبل القراءة من قاعدة البيانات. */
export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}

/** الثيم بمعرّفه، مع رجوع آمن للافتراضي إن كان المعرّف مجهولاً. */
export function getTheme(id: string | null | undefined): Theme {
  return isThemeId(id) ? THEMES[id] : THEMES[DEFAULT_THEME_ID];
}

/** `camelCase` → `kebab-case` لتوليد أسماء متغيرات CSS. */
function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * يحوّل رموز الثيم إلى متغيرات CSS جاهزة للوضع على عنصر عبر `style`.
 * هكذا يبقى الثيم بيانات، ولا يحتاج ورقة أنماط لكل ثيم.
 */
export function themeToCssVars(theme: Theme): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const [key, value] of Object.entries(theme.tokens)) {
    vars[`--cm-${toKebabCase(key)}`] = value;
  }

  return vars;
}
