import { BadgePercent, Megaphone, Tags, TicketCheck } from "lucide-react";
import { dashboardApi } from "../../../api/endpoints";
import MiniTable from "../../../components/ui/MiniTable";
import Panel from "../../../components/ui/Panel";
import StatCard from "../../../components/ui/StatCard";
import { useApi } from "../../../hooks/useApi";
import { label, money } from "../../../utils/format";
import { Loading } from "../home/shared";
import AdminSummary from "./AdminSummary";
import { activeCampaigns, campaignColumns, endingColumns } from "../home/columns";

const STATUSES = ["ACTIVE", "SCHEDULED", "INACTIVE", "EXPIRED"];

export default function AdminMarketing() {
  const { data: d, error } = useApi(dashboardApi.marketing, null);
  return (
    <AdminSummary title="Marketing" subtitle="Promotions, discounts and coupons." owner="Marketing Manager">
      {!d ? <Loading error={error} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard icon={Megaphone} label="Active promotions" value={d.promotions.ACTIVE} />
            <StatCard icon={BadgePercent} label="Active discounts" value={d.discounts.ACTIVE} tone="blue" />
            <StatCard icon={Tags} label="Active coupons" value={d.coupons.ACTIVE} tone="amber" />
            <StatCard icon={TicketCheck} label="Coupon redemptions" value={d.couponRedemptions} tone="green" hint={`${money(d.discountGiven)} discount given`} />
          </div>

          <Panel title="Campaigns by status">
            <MiniTable
              rowKey="kind"
              columns={[
                { header: "", render: (r) => <span className="font-semibold text-ink">{r.kind}</span> },
                ...STATUSES.map((s) => ({ header: label(s), className: "text-center", render: (r) => r.counts[s] })),
              ]}
              rows={[
                { kind: "Promotions", counts: d.promotions },
                { kind: "Discounts", counts: d.discounts },
                { kind: "Coupons", counts: d.coupons },
              ]}
            />
          </Panel>

          <div className="grid gap-5 2xl:grid-cols-[1fr_1.3fr]">
            <Panel title="Needs attention: ending within 7 days">
              <MiniTable columns={endingColumns} rows={d.endingSoon.map((e) => ({ ...e, id: `${e.kind}-${e.name}` }))} empty="Nothing ends this week." />
            </Panel>
            <Panel title="Running now">
              <MiniTable columns={campaignColumns} rows={activeCampaigns(d)} empty="No campaigns are running." />
            </Panel>
          </div>
        </>
      )}
    </AdminSummary>
  );
}
