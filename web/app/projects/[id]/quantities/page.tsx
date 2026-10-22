import Link from "next/link";
import { notFound } from "next/navigation";
import catalogs from "../../../../lib/legacy-catalog.json";
import { uuidPattern } from "../../../../lib/project-validation";
import { monthMinimum, parsePeriod } from "../../../../lib/reporting-period";
import { requireUser } from "../../../../lib/supabase/session";
import PeriodMemory from "../sites/period-memory";
import QuantityBoard from "./board";
export const dynamic = "force-dynamic";
export default async function QuantitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { client, user } = await requireUser();
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const { data: p, error } = await client
    .from("projects")
    .select("id,org_id,code,name,kind,status")
    .eq("id", id)
    .maybeSingle();
  if (error) return <main>無法讀取標案。</main>;
  if (!p) notFound();
  const query = await searchParams;
  const period = parsePeriod(query.year, query.month, p.kind);
  const suffix = period ? `?year=${period.rocYear}&month=${period.month}` : "";
  const [org, member, periods] = await Promise.all([
    client
      .from("organization_members")
      .select("role,status")
      .eq("org_id", p.org_id)
      .eq("user_id", user.id)
      .maybeSingle(),
    client
      .from("project_members")
      .select("role,status")
      .eq("project_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    client
      .from("reporting_periods")
      .select("id,period_start,status")
      .eq("project_id", id)
      .order("period_start", { ascending: false }),
  ]);
  const selected = periods.data?.find((r) => r.period_start === period?.start);
  const editable =
    p.status === "active" &&
    selected?.status === "open" &&
    org.data?.status === "active" &&
    (["owner", "admin"].includes(org.data.role) ||
      (member.data?.status === "active" &&
        ["manager", "office"].includes(member.data.role)));
  let sites: any[] = [],
    targets: any[] = [],
    daily: any[] = [],
    loadError = false;
  if (selected) {
    // Supabase caps individual reads; page through each period's records.
    const read = async (
      table: string,
      columns: string,
      filter: (q: any) => any,
    ) => {
      const rows: any[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await filter(
          client.from(table).select(columns).eq("project_id", id),
        )
          .order("id")
          .range(offset, offset + 499);
        if (error) {
          loadError = true;
          return [];
        }
        rows.push(...data);
        if (data.length < 500) return rows;
      }
    };
    [sites, targets, daily] = await Promise.all([
      read("monthly_sites", "*", (q) => q.eq("period_id", selected.id)),
      read(
        "item_period_targets",
        "*,work_order_items!inner(work_order_site_id,contract_items(*))",
        (q) => q.eq("period_id", selected.id).eq("removed", false),
      ),
      read(
        "daily_quantities",
        "id,work_order_item_id,work_date,quantity,status",
        (q) =>
          q
            .gte("work_date", period!.start)
            .lte("work_date", period!.end)
            .neq("status", "void"),
      ),
    ]);
    sites.sort((a, b) => a.sort_order - b.sort_order);
  }
  return (
    <main style={{ maxWidth: 1600, margin: "auto", padding: "32px 24px" }}>
      <PeriodMemory
        user={user.id}
        project={id}
        kind={p.kind}
        year={period?.rocYear}
        month={period?.month}
        restore={query.year === undefined && query.month === undefined}
        page="quantities"
      />
      <Link href="/projects">← 標案列表</Link>
      <h1 className="system-title">
        {p.kind === "park" ? "公園" : "雨水"}工程施工文件系統
      </h1>
      <p>
        {p.code}｜{p.name}
      </p>
      <div className="old-tabs">
        <Link href={`/projects/${id}`}>基本設定</Link>
        <Link href={`/projects/${id}/sites${suffix}`}>施工路段</Link>
        <button aria-current="page">每日數量與帳務總覽</button>
        <Link href={`/projects/${id}/prior${suffix}`}>前期累計</Link>
        <Link href={`/projects/${id}/export`}>匯出 Excel</Link>
      </div>
      <form method="get" key={period?.start || "unselected"}>
        <div className="old-grid two">
          <label className="old-field">
            民國年
            <input
              name="year"
              type="number"
              min="10"
              max="999"
              required
              defaultValue={period?.rocYear || 115}
            />
          </label>
          <label className="old-field">
            月份
            <select
              name="month"
              defaultValue={period?.month || monthMinimum(p.kind)}
            >
              {Array.from(
                { length: 13 - monthMinimum(p.kind) },
                (_, i) => i + monthMinimum(p.kind),
              ).map((m) => (
                <option key={m} value={m}>
                  {m} 月
                </option>
              ))}
            </select>
          </label>
        </div>
        <button>切換月份</button>
      </form>
      <h2>
        每日數量與帳務總覽
        {period ? `｜${period.rocYear}年${period.month}月` : ""}
      </h2>
      {periods.error || loadError ? (
        <p role="alert">
          無法讀取數量資料。若雲端尚未啟用，請先完成設定再使用。
        </p>
      ) : !period ? (
        <p>請先選擇民國年及月份。</p>
      ) : !sites.length ? (
        <p>
          本月份尚無施工路段，請先到
          <Link href={`/projects/${id}/sites${suffix}`}>施工路段</Link>
          新增或歸入派工單。
        </p>
      ) : (
        <QuantityBoard
          key={period.start}
          sites={sites}
          targets={targets}
          daily={daily}
          catalog={JSON.parse(catalogs[p.kind as keyof typeof catalogs])}
          year={period.rocYear}
          month={period.month}
          editable={!!editable}
        />
      )}
      <p className="old-caption">
        本月金額沿用原版內部試算方式；前期累計請至專屬分頁；Excel
        輸出請至匯出分頁，此頁不代表正式估驗或結算金額。
      </p>
    </main>
  );
}
