/**
 * الصفحة التعريفية — **هيكل المرحلة 1 فقط**.
 *
 * المحتوى التسويقي والتصميم يأتيان لاحقاً. الغرض هنا إثبات أن الأساس يعمل:
 * RTL، الخط العربي، والاستيراد من `src/config/` كمصدر وحيد للحقيقة.
 */

import { PLAN_LIMITS } from '@/config/plans';
import { CURRENCY_CODE, PLAN_IDS, getPrice, getYearlySavings } from '@/config/pricing';
import { STRINGS } from '@/config/strings';
import { THEME_COUNT } from '@/config/themes';

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-10 px-5 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{STRINGS.app.name}</h1>
        <p className="text-lg text-app-muted">{STRINGS.app.tagline}</p>
        <p className="text-app-muted">{STRINGS.app.description}</p>
      </header>

      <section className="flex flex-col gap-4" aria-labelledby="plans-heading">
        <h2 id="plans-heading" className="text-xl font-semibold">
          الباقات
        </h2>

        <ul className="flex flex-col gap-3">
          {PLAN_IDS.map((planId) => {
            const plan = STRINGS.billing.plans[planId];
            const limits = PLAN_LIMITS[planId];

            return (
              <li
                key={planId}
                className="rounded-lg border border-app-border bg-app-surface p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p>
                    <span className="text-2xl font-bold">
                      {getPrice(planId, 'monthly')}
                    </span>{' '}
                    <span className="text-app-muted">
                      {STRINGS.billing.currency} / {STRINGS.billing.perMonth}
                    </span>
                  </p>
                </div>

                <p className="mt-1 text-sm text-app-muted">{plan.description}</p>

                <p className="mt-2 text-sm text-app-muted">
                  {STRINGS.billing.cycles.yearly}: {getPrice(planId, 'yearly')}{' '}
                  {STRINGS.billing.currency} — {STRINGS.billing.save}{' '}
                  {getYearlySavings(planId)} {STRINGS.billing.currency}
                </p>

                <p className="mt-2 text-sm text-app-muted">
                  المنيوهات: {limits.menus ?? STRINGS.limits.unlimited} · الأطباق:{' '}
                  {limits.dishes ?? STRINGS.limits.unlimited}
                </p>
              </li>
            );
          })}
        </ul>

        <p className="text-sm text-app-muted">
          العملة: {CURRENCY_CODE} · الثيمات المتاحة: {THEME_COUNT}
        </p>
      </section>
    </main>
  );
}
