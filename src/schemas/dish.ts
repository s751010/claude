/**
 * نورة — محرر المنيو: schema الطبق.
 *
 * ⚠️ قاعدة الحقول الثلاثة (CLAUDE.md القسم 2.3):
 * كل حقول الطبق تُعرَّف **هنا مرة واحدة فقط**. مخططات الإضافة والتحديث
 * وقيَم التهيئة تُشتقّ منها تلقائياً. إضافة حقل = سطر واحد هنا + migration.
 */

import { z } from 'zod';

import { FIELD_LIMITS } from '@/config/constants';
import { STRINGS } from '@/config/strings';
import {
  GENERATED_COLUMNS,
  optionalText,
  optionalUrl,
  price,
  requiredText,
  timestamp,
  uuid,
} from './common';

const v = STRINGS.validation;

/** خيار مفرد داخل مجموعة — مثل «كبير» أو «جبن إضافي». */
export const dishOptionSchema = z.object({
  id: z.string().min(1),
  name: requiredText(FIELD_LIMITS.optionName),
  /** فرق السعر — يقبل السالب للخصم على خيار */
  priceDelta: z.number().finite(v.priceInvalid).default(0),
});

/** مجموعة خيارات — مثل «الحجم» أو «الإضافات». */
export const dishOptionGroupSchema = z.object({
  id: z.string().min(1),
  name: requiredText(FIELD_LIMITS.optionGroupName),
  /** هل يجب على الزبون الاختيار قبل الإضافة للسلة؟ */
  required: z.boolean().default(false),
  /** هل يسمح باختيار أكثر من خيار؟ */
  multiple: z.boolean().default(false),
  options: z.array(dishOptionSchema).default([]),
});

/**
 * ⚠️ AUDIT.md — B6: المشروع القديم خزّن الخيارات نصاً غير مُتحقَّق منه.
 * هنا نخزّنها `jsonb` مُتحقَّقاً منه بهذا المخطط.
 */
export const dishOptionsSchema = z.array(dishOptionGroupSchema).default([]);

/** كل حقول الطبق — المصدر الوحيد. */
export const dishSchema = z.object({
  id: uuid,
  restaurant_id: uuid,
  menu_id: uuid,
  name: requiredText(FIELD_LIMITS.dishName),
  description: optionalText(FIELD_LIMITS.dishDescription),
  price,
  category: optionalText(FIELD_LIMITS.categoryName),
  emoji: z.string().trim().max(8).default('🍽'),
  image_url: optionalUrl,
  calories: z.number().int().nonnegative().nullable().default(null),
  /** طبق مميّز — يظهر أعلى المنيو */
  featured: z.boolean().default(false),
  /** «نفد الطبق» — أكثر إجراء يومي في مطعم */
  available: z.boolean().default(true),
  /** ترتيب العرض داخل القسم */
  sort_order: z.number().int().default(0),
  options: dishOptionsSchema,
  created_at: timestamp,
  updated_at: timestamp,
});

/** الثلاثة تُشتقّ — لا قوائم يدوية. */
export const dishInsertSchema = dishSchema.omit(GENERATED_COLUMNS);
export const dishUpdateSchema = dishInsertSchema.partial();

/** قيَم التهيئة لنموذج طبق جديد. تُشتقّ من نفس المخطط. */
export function makeDishDefaults(restaurantId: string, menuId: string): DishInsert {
  return dishInsertSchema.parse({
    restaurant_id: restaurantId,
    menu_id: menuId,
    name: '',
    price: 0,
  });
}

export type Dish = z.infer<typeof dishSchema>;
export type DishInsert = z.infer<typeof dishInsertSchema>;
export type DishUpdate = z.infer<typeof dishUpdateSchema>;
export type DishOptionGroup = z.infer<typeof dishOptionGroupSchema>;
export type DishOption = z.infer<typeof dishOptionSchema>;
