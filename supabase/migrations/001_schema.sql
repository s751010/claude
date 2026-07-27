-- ═══════════════════════════════════════════════════════════════════════════
-- 001_schema.sql — الجداول والأنواع والدوال
--
-- ينفَّذ أولاً. لا يحتوي أي سياسة RLS — تلك في 002_rls.sql.
--
-- ⚠️ تفعيل RLS نفسه موجود هنا (ALTER TABLE ... ENABLE ROW LEVEL SECURITY)
--    حتى لا يوجد أي جدول مكشوف ولو للحظة بين تنفيذ الملفين.
--    جدول بلا سياسات + RLS مفعّلة = مغلق تماماً، وهو الوضع الآمن افتراضياً.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── الأنواع ───────────────────────────────────────────────────────────────
-- كل نوع هنا يطابق ثابتاً في src/config/ أو src/schemas/.

-- دور المستخدم. AUDIT.md — C1: القديم حدّد المؤسس بمقارنة إيميل في العميل.
create type user_role as enum ('owner', 'founder');

-- يطابق PLAN_IDS في src/config/pricing.ts. باقتان فقط.
create type plan_id as enum ('growth', 'pro');

-- يطابق BILLING_CYCLES في src/config/pricing.ts.
create type billing_cycle as enum ('monthly', 'yearly');

-- يطابق SUBSCRIPTION_SOURCES في src/schemas/subscription.ts.
create type subscription_source as enum ('paylink_webhook', 'manual_founder');

-- يطابق PAYMENT_METHODS في src/config/pricing.ts.
create type payment_method as enum ('mada', 'card');

create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');

create type ticket_status as enum ('open', 'answered', 'closed');

create type announcement_kind as enum ('info', 'warning', 'offer');

-- يطابق THEME_IDS في src/config/themes.ts.
create type theme_id as enum (
  'najdi', 'jeddah', 'roastery', 'midnight', 'masala',
  'washi', 'diner', 'patisserie', 'banquet'
);


-- ─── دالة مساعدة: تحديث updated_at تلقائياً ───────────────────────────────
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- الهوية والصلاحيات
-- ═══════════════════════════════════════════════════════════════════════════

-- ملف المستخدم. الدور يُقرأ من هنا، لا من إيميل في العميل — يعالج C1.
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role   not null default 'owner',
  full_name   text,
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table profiles enable row level security;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- إنشاء ملف تلقائياً عند تسجيل مستخدم جديد.
-- الدور دائماً 'owner' — ترقية أحد إلى 'founder' تتم يدوياً في SQL Editor فقط.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- هل المستخدم الحالي مؤسس؟
-- security definer ضروري: السياسات تستدعيها، ولو قرأت profiles مباشرةً
-- لدخلنا في تكرار لا نهائي مع سياسات profiles نفسها.
create or replace function is_founder()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'founder'
  );
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- المطعم والمنيو — سعد و نورة
-- ═══════════════════════════════════════════════════════════════════════════

-- ⚠️ AUDIT.md — C4: العمودان payment_gateway و payment_key محذوفان بالكامل.
--    لا بوابة دفع داخل المنيو (CLAUDE.md القسم 5).
create table restaurants (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references profiles(id) on delete cascade,
  name              text not null check (length(trim(name)) between 1 and 60),
  cuisine           text check (length(cuisine) <= 60),
  logo_url          text,
  banner_url        text,

  -- رقم واتساب لاستقبال الطلبات: المسار الوحيد المسموح للسلة
  whatsapp          text check (whatsapp ~ '^9665[0-9]{8}$'),
  phone             text check (phone ~ '^9665[0-9]{8}$'),
  address           text check (length(address) <= 200),

  allergens_note    text check (length(allergens_note) <= 500),
  working_hours     jsonb,
  google_review_url text,
  google_maps_url   text,

  instagram_url     text,
  x_url             text,
  tiktok_url        text,
  snapchat_url      text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table restaurants enable row level security;

create index restaurants_owner_id_idx on restaurants (owner_id);

create trigger restaurants_updated_at
  before update on restaurants
  for each row execute function set_updated_at();


create table menus (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references restaurants(id) on delete cascade,
  name            text not null check (length(trim(name)) between 1 and 60),
  description     text check (length(description) <= 200),

  -- الرابط العام /m/<slug>. فريد على مستوى المنصة كلها.
  slug            text not null unique
                    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 40),

  -- ⚠️ AUDIT.md — B6: القديم خزّن المعرّف وثيماً كامل الـ JSON في عمود واحد.
  --    هنا مفصولان: معرّف مُقيَّد بالنوع، ورموز مخصّصة اختيارية.
  theme_id        theme_id not null default 'najdi',
  custom_theme    jsonb,

  cover_image_url text,
  active          boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table menus enable row level security;

create index menus_restaurant_id_idx on menus (restaurant_id);
create index menus_slug_idx on menus (slug) where active;

create trigger menus_updated_at
  before update on menus
  for each row execute function set_updated_at();


create table dishes (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  menu_id       uuid not null references menus(id) on delete cascade,
  name          text not null check (length(trim(name)) between 1 and 80),
  description   text check (length(description) <= 300),
  price         numeric(10, 2) not null check (price >= 0),
  category      text check (length(category) <= 60),
  emoji         text not null default '🍽' check (length(emoji) <= 8),
  image_url     text,
  calories      integer check (calories >= 0),
  featured      boolean not null default false,

  -- «نفد الطبق» — أكثر إجراء يومي في مطعم
  available     boolean not null default true,
  sort_order    integer not null default 0,

  -- ⚠️ خيارات مركّبة مُتحقَّق منها بـ dishOptionsSchema، لا نص حر كما في القديم
  options       jsonb not null default '[]'::jsonb,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table dishes enable row level security;

create index dishes_menu_id_idx on dishes (menu_id);
create index dishes_restaurant_id_idx on dishes (restaurant_id);

create trigger dishes_updated_at
  before update on dishes
  for each row execute function set_updated_at();


-- ═══════════════════════════════════════════════════════════════════════════
-- الاشتراكات والدفع — خالد و طارق
-- ═══════════════════════════════════════════════════════════════════════════

-- ⚠️ قرار معماري مُصرَّح به:
--    حدود الباقات تعيش في مكانين: src/config/plans.ts للواجهة، وهذا الجدول
--    للفرض في الـ trigger. السبب: الـ trigger لا يقرأ TypeScript.
--    التكرار مقصود ومُعلَن — انظر PROGRESS.md «التكرار المعروف».
create table plan_limits (
  plan        plan_id primary key,
  max_menus   integer,   -- null = غير محدود
  max_dishes  integer,   -- null = غير محدود
  allow_ai    boolean not null default true,
  updated_at  timestamptz not null default now()
);

alter table plan_limits enable row level security;


-- ⚠️ AUDIT.md — C2: القديم سمح للعميل بإدراج صف اشتراك بنفسه.
--    هنا: لا سياسة INSERT/UPDATE لأي دور عميل في 002_rls.sql إطلاقاً.
--    الكتابة حصراً بـ service role من webhook أو من التفعيل اليدوي.
create table subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  restaurant_id        uuid not null references restaurants(id) on delete cascade,
  plan                 plan_id not null,
  cycle                billing_cycle not null,
  source               subscription_source not null,
  paylink_recurring_id text,
  payment_ref          text,
  starts_at            timestamptz not null default now(),
  ends_at              timestamptz not null,
  active               boolean not null default true,
  cancelled_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  check (ends_at > starts_at)
);

alter table subscriptions enable row level security;

create index subscriptions_restaurant_id_idx on subscriptions (restaurant_id);

-- اشتراك ساري واحد فقط لكل مطعم في الوقت نفسه
create unique index subscriptions_one_active_idx
  on subscriptions (restaurant_id) where active;

create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();


-- المبالغ الثلاثة حسب القسم 6.4: الإجمالي والرسوم والصافي.
-- لوحة الإيرادات (طارق) تعرض الصافي.
-- ⚠️ AUDIT.md — B5: القديم ترك العميل يحسب المبلغ ويكتبه. هنا لا كتابة من العميل.
create table payments (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references restaurants(id) on delete cascade,
  subscription_id uuid references subscriptions(id) on delete set null,
  gross           numeric(10, 2) not null check (gross >= 0),
  fees            numeric(10, 2) not null check (fees >= 0),
  net             numeric(10, 2) not null,
  method          payment_method,
  status          payment_status not null default 'pending',
  paylink_invoice_id text,
  payment_ref     text,
  paid_at         timestamptz,
  created_at      timestamptz not null default now()
);

alter table payments enable row level security;

create index payments_restaurant_id_idx on payments (restaurant_id);
create index payments_created_at_idx on payments (created_at desc);


-- سجل أحداث الدفع الخام.
-- القسم 6.3 بند 6: كل حدث يُسجَّل هنا **قبل** معالجته.
-- القسم 6.3 بند 5: القيد الفريد يجعل المعالجة idempotent — بيلينك قد تكرّر الحدث.
create table payment_events (
  id               uuid primary key default gen_random_uuid(),
  provider         text not null default 'paylink',
  provider_event_id text not null,
  payload          jsonb not null,
  received_at      timestamptz not null default now(),
  processed_at     timestamptz,
  processing_error text,

  unique (provider, provider_event_id)
);

alter table payment_events enable row level security;

create index payment_events_unprocessed_idx
  on payment_events (received_at) where processed_at is null;


-- أكواد الخصم — طارق
create table promo_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code = upper(code)),
  discount    integer not null check (discount between 1 and 100),
  max_uses    integer check (max_uses > 0),
  uses        integer not null default 0 check (uses >= 0),
  expires_at  timestamptz,
  description text check (length(description) <= 200),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table promo_codes enable row level security;


-- ═══════════════════════════════════════════════════════════════════════════
-- القياس — تتبّع المشاهدات
-- ═══════════════════════════════════════════════════════════════════════════

-- ⚠️ AUDIT.md — B1: القديم استخدم upsert بجسم {views:1} ثابت،
--    فكانت PostgREST تنفّذ ON CONFLICT DO UPDATE SET views = 1 — تصفير لا زيادة.
--    هنا: لا إدراج مباشر إطلاقاً. الزيادة عبر increment_menu_view() فقط.
create table analytics (
  menu_id uuid not null references menus(id) on delete cascade,
  day     date not null,
  hour    smallint not null check (hour between 0 and 23),
  views   integer not null default 0 check (views >= 0),

  primary key (menu_id, day, hour)
);

alter table analytics enable row level security;

create index analytics_day_idx on analytics (day desc);

-- الزيادة الذرّية الصحيحة. security definer لأن دور anon ممنوع من الكتابة المباشرة.
create or replace function increment_menu_view(p_menu_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- منيو غير موجود أو غير منشور لا يُسجَّل له شيء
  if not exists (select 1 from public.menus where id = p_menu_id and active) then
    return;
  end if;

  insert into public.analytics (menu_id, day, hour, views)
  values (p_menu_id, current_date, extract(hour from now())::smallint, 1)
  on conflict (menu_id, day, hour)
  do update set views = public.analytics.views + 1;   -- ← الزيادة، لا التصفير
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- الولاء — عمر
-- ═══════════════════════════════════════════════════════════════════════════

create table loyalty_programs (
  restaurant_id  uuid primary key references restaurants(id) on delete cascade,
  active         boolean not null default false,
  stamps_goal    integer not null default 10 check (stamps_goal between 2 and 50),
  reward_text    text not null default '' check (length(reward_text) <= 120),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table loyalty_programs enable row level security;

create trigger loyalty_programs_updated_at
  before update on loyalty_programs
  for each row execute function set_updated_at();


-- ⚠️ AUDIT.md — C7: القديم قرأ وعدّل هذا الجدول من المنيو العام بمفتاح anon،
--    فكانت أرقام جوالات الزبائن مكشوفة وأختامهم قابلة للتعديل من أي زائر.
--    هنا: لا وصول لدور anon إطلاقاً (002_rls.sql).
create table loyalty_customers (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  phone         text not null check (phone ~ '^9665[0-9]{8}$'),
  name          text check (length(name) <= 60),
  card_code     text not null,
  stamps        integer not null default 0 check (stamps >= 0),
  rewards_used  integer not null default 0 check (rewards_used >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (restaurant_id, phone),
  unique (restaurant_id, card_code)
);

alter table loyalty_customers enable row level security;

create trigger loyalty_customers_updated_at
  before update on loyalty_customers
  for each row execute function set_updated_at();


-- ═══════════════════════════════════════════════════════════════════════════
-- التقييمات — سلمى
-- ═══════════════════════════════════════════════════════════════════════════

create table reviews (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  menu_id       uuid references menus(id) on delete set null,
  rating        smallint not null check (rating between 1 and 5),

  -- إجابات الاستبيان: { "food": 5, "service": 4, ... }
  answers       jsonb not null default '{}'::jsonb,
  comment       text check (length(comment) <= 1000),
  created_at    timestamptz not null default now()
);

alter table reviews enable row level security;

create index reviews_restaurant_id_idx on reviews (restaurant_id, created_at desc);


-- ═══════════════════════════════════════════════════════════════════════════
-- الدعم — ريم
-- ═══════════════════════════════════════════════════════════════════════════

create table support_tickets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  restaurant_id uuid references restaurants(id) on delete set null,
  subject       text not null check (length(trim(subject)) between 1 and 120),
  message       text not null check (length(trim(message)) between 1 and 2000),
  category      text check (length(category) <= 40),
  status        ticket_status not null default 'open',
  admin_reply   text check (length(admin_reply) <= 2000),
  replied_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table support_tickets enable row level security;

create index support_tickets_user_id_idx on support_tickets (user_id, created_at desc);

create trigger support_tickets_updated_at
  before update on support_tickets
  for each row execute function set_updated_at();


-- ═══════════════════════════════════════════════════════════════════════════
-- المحتوى والإعدادات — هند و فهد
-- ═══════════════════════════════════════════════════════════════════════════

create table announcements (
  id         uuid primary key default gen_random_uuid(),
  kind       announcement_kind not null default 'info',
  title      text not null check (length(trim(title)) between 1 and 120),
  body       text check (length(body) <= 1000),
  active     boolean not null default true,
  starts_at  timestamptz,
  ends_at    timestamptz,
  created_at timestamptz not null default now()
);

alter table announcements enable row level security;


create table blog_posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title        text not null check (length(trim(title)) between 1 and 160),
  excerpt      text check (length(excerpt) <= 300),
  body         text not null default '',
  cover_url    text,
  published    boolean not null default false,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table blog_posts enable row level security;

create index blog_posts_published_idx on blog_posts (published_at desc) where published;

create trigger blog_posts_updated_at
  before update on blog_posts
  for each row execute function set_updated_at();


-- إعدادات المنصة ومفاتيح الميزات.
-- ⚠️ AUDIT.md — C3: مفتاح payment_enabled («بوابة دفع أونلاين داخل المنيو»)
--    محذوف نهائياً ولا يُعاد. القسم 6.1 — نشاط تجميعي يحتاج ترخيص ساما.
create table site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table site_settings enable row level security;

create trigger site_settings_updated_at
  before update on site_settings
  for each row execute function set_updated_at();


-- سجل النشاط — فهد
create table activity_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references profiles(id) on delete set null,
  action     text not null,
  entity     text,
  entity_id  uuid,
  details    jsonb,
  created_at timestamptz not null default now()
);

alter table activity_log enable row level security;

create index activity_log_created_at_idx on activity_log (created_at desc);


-- ═══════════════════════════════════════════════════════════════════════════
-- فرض حدود الباقات
--
-- ⚠️ AUDIT.md — B2: القديم عرّف الحدود ولم يقارنها بأي عدّاد في أي موضع،
--    فكان الفرق بين الباقات تسويقياً فقط.
--
-- الفرض هنا في trigger لأن الواجهة وحدها ليست حاجزاً أمنياً:
-- من يستطيع استدعاء الـ API مباشرةً يتجاوز أي فحص في المتصفح.
-- ═══════════════════════════════════════════════════════════════════════════

-- الباقة السارية لمطعم. من لا اشتراك له يُعامَل بأدنى باقة.
create or replace function current_plan(p_restaurant_id uuid)
returns plan_id
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select s.plan
       from public.subscriptions s
      where s.restaurant_id = p_restaurant_id
        and s.active
        and s.ends_at > now()
      limit 1),
    'growth'::plan_id
  );
$$;


create or replace function enforce_menu_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer;
  v_count integer;
begin
  select max_menus into v_limit
    from public.plan_limits
   where plan = public.current_plan(new.restaurant_id);

  if v_limit is null then
    return new;                                  -- غير محدود
  end if;

  select count(*) into v_count
    from public.menus
   where restaurant_id = new.restaurant_id;

  if v_count >= v_limit then
    raise exception 'PLAN_LIMIT_MENUS'
      using hint = 'بلغت حد المنيوهات في باقتك. ارفع الباقة لإضافة المزيد.';
  end if;

  return new;
end;
$$;

create trigger menus_enforce_limit
  before insert on menus
  for each row execute function enforce_menu_limit();


create or replace function enforce_dish_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer;
  v_count integer;
begin
  select max_dishes into v_limit
    from public.plan_limits
   where plan = public.current_plan(new.restaurant_id);

  if v_limit is null then
    return new;
  end if;

  select count(*) into v_count
    from public.dishes
   where restaurant_id = new.restaurant_id;

  if v_count >= v_limit then
    raise exception 'PLAN_LIMIT_DISHES'
      using hint = 'بلغت حد الأطباق في باقتك. ارفع الباقة لإضافة المزيد.';
  end if;

  return new;
end;
$$;

create trigger dishes_enforce_limit
  before insert on dishes
  for each row execute function enforce_dish_limit();
