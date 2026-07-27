-- ═══════════════════════════════════════════════════════════════════════════
-- 003_storage.sql — bucket صور الأطباق وسياسات الوصول
--
-- ينفَّذ ثالثاً، بعد 002_rls.sql.
--
-- بنية المسار:  <owner_id>/<اسم-الملف>
-- المجلد الأول هو معرّف المالك — وعليه تُبنى كل السياسات أدناه.
-- هذه البنية منقولة من المشروع القديم (كانت سليمة).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── إنشاء الـ bucket ──────────────────────────────────────────────────────
-- public = true: القراءة عامة عبر رابط مباشر.
-- مبرَّر: صور الأطباق تُعرض لزبائن المطعم في المنيو العام، وجعلها خاصة
-- يفرض توليد رابط موقّع لكل صورة عند كل فتح — بطء على شبكة الجوال بلا فائدة أمنية.
-- الرفع والحذف يبقيان محميّين بالسياسات أدناه.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-images',
  'menu-images',
  true,
  8388608,                                        -- 8 ميجابايت = IMAGE_LIMITS.maxBytes
  array['image/jpeg', 'image/png', 'image/webp']  -- = IMAGE_LIMITS.acceptedTypes
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ─── السياسات ──────────────────────────────────────────────────────────────
-- ⚠️ storage.objects عليه RLS مفعّلة من Supabase افتراضياً.
--
-- سياسات storage تعيش خارج مخطط public، فلا يمسحها إعادة إنشاء public.
-- الحذف المشروط أدناه يجعل هذا الملف قابلاً لإعادة التنفيذ بأمان.

drop policy if exists menu_images_select_public on storage.objects;
drop policy if exists menu_images_insert_own   on storage.objects;
drop policy if exists menu_images_update_own   on storage.objects;
drop policy if exists menu_images_delete_own   on storage.objects;

-- قراءة عامة: الزبون يفتح المنيو ويرى الصور.
create policy menu_images_select_public on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'menu-images');

-- الرفع: المستخدم يرفع **داخل مجلده فقط**.
-- storage.foldername(name) يعيد مصفوفة أجزاء المسار؛ العنصر الأول هو مجلد المالك.
create policy menu_images_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- الاستبدال: داخل مجلده فقط.
create policy menu_images_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- الحذف: داخل مجلده فقط.
create policy menu_images_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ⚠️ لا سياسة رفع لدور anon: زائر المنيو يقرأ الصور ولا يرفع شيئاً.


do $$
begin
  raise notice '✅ bucket menu-images جاهز — قراءة عامة، وكتابة داخل مجلد المالك فقط.';
end;
$$;
