/**
 * نورة — محرر المنيو: schema المنيو.
 *
 * ⚠️ AUDIT.md — B6: المشروع القديم خزّن معرّف الثيم وثيماً كامل الـ JSON
 * في العمود النصّي نفسه (`ai:{...}`). هنا نفصلهما:
 * `theme_id` معرّف مُقيَّد بالقائمة، و `custom_theme` رموز مخصّصة اختيارية.
 */

import { z } from 'zod';

import { FIELD_LIMITS } from '@/config/constants';
import { DEFAULT_THEME_ID, THEME_IDS } from '@/config/themes';
import {
  GENERATED_COLUMNS,
  optionalText,
  optionalUrl,
  requiredText,
  slug,
  timestamp,
  uuid,
} from './common';

/** رموز ثيم مخصّص — تُدمج فوق رموز الثيم المختار. */
export const customThemeSchema = z
  .object({
    accent: z.string().trim().max(32).optional(),
    bg: z.string().trim().max(64).optional(),
    text: z.string().trim().max(32).optional(),
  })
  .nullable()
  .default(null);

/** كل حقول المنيو — المصدر الوحيد. */
export const menuSchema = z.object({
  id: uuid,
  restaurant_id: uuid,
  name: requiredText(FIELD_LIMITS.menuName),
  description: optionalText(FIELD_LIMITS.menuDescription),
  /** الرابط العام: `/m/<slug>` */
  slug,
  theme_id: z.enum(THEME_IDS).default(DEFAULT_THEME_ID),
  custom_theme: customThemeSchema,
  cover_image_url: optionalUrl,
  /** منيو غير منشور لا يفتحه الزبائن */
  active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  created_at: timestamp,
  updated_at: timestamp,
});

/** الثلاثة تُشتقّ — لا قوائم يدوية. */
export const menuInsertSchema = menuSchema.omit(GENERATED_COLUMNS);
export const menuUpdateSchema = menuInsertSchema.partial();

/** قيَم التهيئة لنموذج منيو جديد. */
export function makeMenuDefaults(restaurantId: string, menuSlug: string): MenuInsert {
  return menuInsertSchema.parse({
    restaurant_id: restaurantId,
    name: '',
    slug: menuSlug,
  });
}

export type Menu = z.infer<typeof menuSchema>;
export type MenuInsert = z.infer<typeof menuInsertSchema>;
export type MenuUpdate = z.infer<typeof menuUpdateSchema>;
export type CustomTheme = z.infer<typeof customThemeSchema>;
