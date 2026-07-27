-- ═══════════════════════════════════════════════════════════════════════════
-- 002_rls.sql — سياسات أمن مستوى الصف (Row Level Security)
--
-- ينفَّذ ثانياً، بعد 001_schema.sql.
--
-- ⚠️ RLS مفعّلة على كل جدول في 001. هذا الملف يفتح **الحد الأدنى** المطلوب.
--    القاعدة: الجدول مغلق افتراضياً، وكل سياسة هنا استثناء مبرَّر.
--
-- 🔑 ثلاثة أدوار تهمّنا:
--    anon          — زائر غير مسجّل. يفتح المنيو من QR. أضيق الأدوار.
--    authenticated — صاحب مطعم مسجّل الدخول.
--    service_role  — السيرفر فقط. **يتجاوز RLS كلياً** ولا تنطبق عليه أي سياسة هنا.
--                    كل ما لا سياسة له أدناه = حصري لـ service_role.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- دوال مساعدة للسياسات
--
-- ⚠️ لماذا `security definer` وليس استعلاماً مباشراً داخل السياسة؟
--
--    سياسة على `restaurants` تستعلم عن `menus`، وسياسة على `menus` تستعلم عن
--    `restaurants` → **تكرار لا نهائي**:
--        ERROR: infinite recursion detected in policy for relation "menus"
--
--    هذا ليس افتراضاً — وقع فعلاً أثناء اختبار هذه الترحيلة على Postgres محلي.
--
--    الحل: كل إشارة من سياسة إلى جدول آخر محمي بـ RLS تمرّ عبر دالة
--    `security definer` تتجاوز RLS للقراءة الداخلية فقط. أسرع أيضاً،
--    لأنها تتجنّب تقييم سياسات متداخلة في كل صف.
-- ═══════════════════════════════════════════════════════════════════════════

-- هل المستخدم الحالي يملك هذا المطعم؟
create or replace function owns_restaurant(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.restaurants
    where id = p_restaurant_id and owner_id = auth.uid()
  );
$$;

-- هل المستخدم الحالي يملك المطعم صاحب هذا المنيو؟
create or replace function owns_menu(p_menu_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.menus m
      join public.restaurants r on r.id = m.restaurant_id
     where m.id = p_menu_id and r.owner_id = auth.uid()
  );
$$;

-- هل لهذا المطعم منيو منشور واحد على الأقل؟ (شرط ظهوره للزوّار)
create or replace function restaurant_has_public_menu(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.menus
    where restaurant_id = p_restaurant_id and active
  );
$$;

-- هل هذا المنيو منشور؟ (شرط ظهور أطباقه للزوّار)
create or replace function menu_is_public(p_menu_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.menus where id = p_menu_id and active
  );
$$;

grant execute on function owns_restaurant(uuid) to anon, authenticated;
grant execute on function owns_menu(uuid) to anon, authenticated;
grant execute on function restaurant_has_public_menu(uuid) to anon, authenticated;
grant execute on function menu_is_public(uuid) to anon, authenticated;
grant execute on function is_founder() to anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- profiles — الهوية والدور
--
-- 🛡️ يعالج C1: القديم فتح لوحة المؤسس لأي شخص يكتب إيميلاً معيّناً في العميل.
--    هنا الدور عمود في قاعدة البيانات، ولا يستطيع المستخدم تعديله.
-- ═══════════════════════════════════════════════════════════════════════════

-- المستخدم يقرأ ملفه فقط.
create policy profiles_select_own on profiles
  for select to authenticated
  using (id = auth.uid());

-- المؤسس يقرأ كل الملفات (لوحة لمياء).
create policy profiles_select_founder on profiles
  for select to authenticated
  using (is_founder());

-- المستخدم يعدّل اسمه فقط.
-- ⚠️ عمود role غير محمي بـ USING/WITH CHECK وحدهما — نمنع تغييره بـ trigger أدناه.
create policy profiles_update_own on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- الحارس الفعلي للدور: أي محاولة لتغيير role من **دور عميل** تُرفَض.
--
-- ⚠️ الاستثناء ضروري ومقصود: ترقية أول مؤسس تتم يدوياً في SQL Editor
--    (انظر 004_seed.sql). بلا هذا الاستثناء يستحيل تعيين أي مؤسف إطلاقاً —
--    وهو ما اكتشفته باختبار الترحيلة على Postgres محلي قبل تسليمها.
--
--    المعيار: `auth.uid()` فارغة تعني سياقاً بلا مستخدم مصادَق —
--    أي SQL Editor أو service_role. أي عميل مسجّل الدخول له uid دائماً.
create or replace function guard_profile_role()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- سياق إداري (SQL Editor / service_role): مسموح
  if auth.uid() is null then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'ROLE_CHANGE_FORBIDDEN'
      using hint = 'تغيير الدور غير مسموح من التطبيق.';
  end if;

  return new;
end;
$$;

create trigger profiles_guard_role
  before update on profiles
  for each row execute function guard_profile_role();

-- لا سياسة INSERT: الملف يُنشأ بـ trigger على auth.users.
-- لا سياسة DELETE: الحذف يتبع حذف المستخدم من auth.


-- ═══════════════════════════════════════════════════════════════════════════
-- restaurants — سعد
--
-- الزائر يحتاج قراءة بيانات المطعم ليعرض المنيو (الاسم، الشعار، واتساب،
-- ساعات العمل، الحساسية). لم يعد فيه سرّ بعد حذف payment_key — يعالج C4.
-- ═══════════════════════════════════════════════════════════════════════════

-- الزائر يقرأ المطعم **فقط** إن كان له منيو واحد منشور على الأقل.
-- مطعم بلا منيو منشور غير مرئي إطلاقاً.
create policy restaurants_select_public on restaurants
  for select to anon, authenticated
  using (restaurant_has_public_menu(id));

create policy restaurants_all_own on restaurants
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy restaurants_select_founder on restaurants
  for select to authenticated
  using (is_founder());


-- ═══════════════════════════════════════════════════════════════════════════
-- menus — نورة
-- ═══════════════════════════════════════════════════════════════════════════

-- الزائر يقرأ المنيوهات المنشورة فقط. غير المنشور غير مرئي.
create policy menus_select_public on menus
  for select to anon, authenticated
  using (active);

create policy menus_all_own on menus
  for all to authenticated
  using (owns_restaurant(restaurant_id))
  with check (owns_restaurant(restaurant_id));

create policy menus_select_founder on menus
  for select to authenticated
  using (is_founder());


-- ═══════════════════════════════════════════════════════════════════════════
-- dishes — نورة
-- ═══════════════════════════════════════════════════════════════════════════

-- الزائر يقرأ أطباق المنيوهات المنشورة فقط.
-- الطبق غير المتوفّر يبقى مرئياً — المنيو يعرضه مشطوباً «نفد».
create policy dishes_select_public on dishes
  for select to anon, authenticated
  using (menu_is_public(menu_id));

create policy dishes_all_own on dishes
  for all to authenticated
  using (owns_restaurant(restaurant_id))
  with check (owns_restaurant(restaurant_id));

create policy dishes_select_founder on dishes
  for select to authenticated
  using (is_founder());


-- ═══════════════════════════════════════════════════════════════════════════
-- subscriptions — خالد
--
-- 🛡️ يعالج C2 — أخطر ثغرة في المشروع القديم.
--    القديم سمح للعميل بـ POST مباشر على هذا الجدول بتوكنه، فكان أي مستخدم
--    يمنح نفسه أعلى باقة بطلب واحد من devtools.
--
-- ⚠️ لاحظ ما هو **غائب** عمداً: لا سياسة INSERT، ولا UPDATE، ولا DELETE.
--    غياب السياسة ليس سهواً — هو الحماية نفسها.
--    الكتابة حصراً بـ service_role من مصدرين:
--      1. webhook بيلينك مُتحقَّق منه
--      2. التفعيل اليدوي من لوحة المؤسس (طارق)
-- ═══════════════════════════════════════════════════════════════════════════

create policy subscriptions_select_own on subscriptions
  for select to authenticated
  using (
    owns_restaurant(restaurant_id)
  );

create policy subscriptions_select_founder on subscriptions
  for select to authenticated
  using (is_founder());


-- ═══════════════════════════════════════════════════════════════════════════
-- payments — الفواتير
--
-- 🛡️ يعالج B5: القديم ترك العميل يحسب المبلغ ويكتبه في سجل الإيراد.
--    هنا: قراءة فقط. الكتابة من webhook بـ service_role.
-- ═══════════════════════════════════════════════════════════════════════════

create policy payments_select_own on payments
  for select to authenticated
  using (
    owns_restaurant(restaurant_id)
  );

create policy payments_select_founder on payments
  for select to authenticated
  using (is_founder());


-- ═══════════════════════════════════════════════════════════════════════════
-- payment_events — سجل أحداث الدفع الخام
--
-- ⚠️ بلا أي سياسة إطلاقاً. مغلق تماماً أمام anon و authenticated.
--    يحتوي حمولات webhook خاماً قد تحمل تفاصيل حسّاسة.
--    service_role وحده يكتب ويقرأ.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- plan_limits — حدود الباقات
-- ═══════════════════════════════════════════════════════════════════════════

-- قراءة عامة: الواجهة تحتاجها لعرض ما تشمله كل باقة. لا سرّ فيها.
create policy plan_limits_select_all on plan_limits
  for select to anon, authenticated
  using (true);

-- لا كتابة من أي دور عميل. التعديل بـ service_role أو SQL Editor.


-- ═══════════════════════════════════════════════════════════════════════════
-- promo_codes — طارق
-- ═══════════════════════════════════════════════════════════════════════════

-- ⚠️ لا قراءة عامة: قائمة الأكواد كاملةً تُسرَّب لو فتحناها.
--    التحقق من كود يتم في Route Handler بـ service_role.
create policy promo_codes_all_founder on promo_codes
  for all to authenticated
  using (is_founder())
  with check (is_founder());


-- ═══════════════════════════════════════════════════════════════════════════
-- analytics — تتبّع المشاهدات
--
-- 🛡️ يعالج B1: القديم كان يُدرج مباشرةً بـ upsert فيصفّر العدّاد إلى 1.
--
-- ⚠️ لا سياسة INSERT ولا UPDATE لأي دور. الزيادة حصراً عبر
--    increment_menu_view() وهي security definer فتتجاوز RLS بأمان.
-- ═══════════════════════════════════════════════════════════════════════════

create policy analytics_select_own on analytics
  for select to authenticated
  using (
    owns_menu(menu_id)
  );

create policy analytics_select_founder on analytics
  for select to authenticated
  using (is_founder());

-- السماح باستدعاء دالة الزيادة من المنيو العام.
grant execute on function increment_menu_view(uuid) to anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- loyalty_programs — عمر
-- ═══════════════════════════════════════════════════════════════════════════

-- الزائر يقرأ إعدادات البرنامج (عدد الأختام والمكافأة) ليعرضها في المنيو.
-- لا بيانات شخصية هنا — البيانات الشخصية في loyalty_customers.
create policy loyalty_programs_select_public on loyalty_programs
  for select to anon, authenticated
  using (active);

create policy loyalty_programs_all_own on loyalty_programs
  for all to authenticated
  using (
    owns_restaurant(restaurant_id)
  )
  with check (
    owns_restaurant(restaurant_id)
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- loyalty_customers — أرقام جوالات الزبائن
--
-- 🛡️ يعالج C7: القديم قرأ هذا الجدول بـ select=* من المنيو العام بمفتاح anon
--    (أرقام الجوالات مكشوفة)، وعدّل الأختام بـ PATCH من الصفحة نفسها
--    (أي زائر يعدّل أختام أي زبون).
--
-- ⚠️ **لا سياسة لدور anon إطلاقاً.** الجدول مغلق تماماً أمام الزوّار.
--    تسجيل زبون وختم بطاقته يتمّان عبر Route Handler بـ service_role
--    بعد تحقق من هوية المطعم.
-- ═══════════════════════════════════════════════════════════════════════════

create policy loyalty_customers_all_own on loyalty_customers
  for all to authenticated
  using (
    owns_restaurant(restaurant_id)
  )
  with check (
    owns_restaurant(restaurant_id)
  );

-- ملاحظة: المؤسس **لا** يقرأ هذا الجدول. لا حاجة تشغيلية تبرّر اطّلاعه
-- على أرقام جوالات زبائن المطاعم.


-- ═══════════════════════════════════════════════════════════════════════════
-- reviews — سلمى
-- ═══════════════════════════════════════════════════════════════════════════

-- الزائر يكتب تقييماً ولا يقرأ التقييمات.
-- السبب: قراءة التقييمات من المنيو تكشف أنماط زبائن المطعم لمنافسيه.
create policy reviews_insert_public on reviews
  for insert to anon, authenticated
  with check (
    restaurant_has_public_menu(restaurant_id)
  );

create policy reviews_select_own on reviews
  for select to authenticated
  using (
    owns_restaurant(restaurant_id)
  );

create policy reviews_select_founder on reviews
  for select to authenticated
  using (is_founder());


-- ═══════════════════════════════════════════════════════════════════════════
-- support_tickets — ريم
-- ═══════════════════════════════════════════════════════════════════════════

create policy support_tickets_select_own on support_tickets
  for select to authenticated
  using (user_id = auth.uid());

create policy support_tickets_insert_own on support_tickets
  for insert to authenticated
  with check (user_id = auth.uid());

-- المؤسس يقرأ الكل ويردّ.
create policy support_tickets_select_founder on support_tickets
  for select to authenticated
  using (is_founder());

create policy support_tickets_update_founder on support_tickets
  for update to authenticated
  using (is_founder())
  with check (is_founder());

-- ⚠️ لا سياسة UPDATE للمستخدم: لا يعدّل تذكرته بعد إرسالها،
--    ولا يستطيع تزوير admin_reply أو status.


-- ═══════════════════════════════════════════════════════════════════════════
-- announcements و blog_posts — هند
-- ═══════════════════════════════════════════════════════════════════════════

create policy announcements_select_public on announcements
  for select to anon, authenticated
  using (
    active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

create policy announcements_all_founder on announcements
  for all to authenticated
  using (is_founder())
  with check (is_founder());


create policy blog_posts_select_public on blog_posts
  for select to anon, authenticated
  using (published);

create policy blog_posts_all_founder on blog_posts
  for all to authenticated
  using (is_founder())
  with check (is_founder());


-- ═══════════════════════════════════════════════════════════════════════════
-- site_settings — فهد
--
-- 🛡️ يعالج C5: القديم عدّل هذا الجدول عبر بروكسي عام (founder-admin)
--    يستقبل اسم الجدول من العميل، وبوابته سرّ ثابت في sessionStorage.
--    هنا: سياسة صريحة مربوطة بالدور في قاعدة البيانات. لا بروكسي عام.
-- ═══════════════════════════════════════════════════════════════════════════

create policy site_settings_select_public on site_settings
  for select to anon, authenticated
  using (true);

create policy site_settings_all_founder on site_settings
  for all to authenticated
  using (is_founder())
  with check (is_founder());


-- ═══════════════════════════════════════════════════════════════════════════
-- activity_log — فهد
-- ═══════════════════════════════════════════════════════════════════════════

create policy activity_log_select_founder on activity_log
  for select to authenticated
  using (is_founder());

-- لا كتابة من دور عميل: السجل يُكتب بـ service_role حتى لا يُزوَّر.


-- ═══════════════════════════════════════════════════════════════════════════
-- فحص ختامي: أي جدول بلا RLS مفعّلة يوقف التنفيذ بخطأ صريح.
-- «RLS على كل جدول بلا استثناء» — CLAUDE.md القسم 6.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  v_unprotected text;
begin
  select string_agg(c.relname, ', ')
    into v_unprotected
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
     and not c.relrowsecurity;

  if v_unprotected is not null then
    raise exception 'جداول بلا RLS: %', v_unprotected;
  end if;

  raise notice '✅ كل جداول public محميّة بـ RLS.';
end;
$$;
