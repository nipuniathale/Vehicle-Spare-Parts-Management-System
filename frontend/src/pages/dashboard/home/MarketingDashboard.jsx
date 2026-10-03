import { BadgePercent, Megaphone, Tags, TicketCheck } from "lucide-react";
import { dashboardApi } from "../../../api/endpoints";
import BarList from "../../../components/charts/BarList";
import ColumnChart from "../../../components/charts/ColumnChart";
import { compact, SERIES } from "../../../components/charts/palette";
import DashboardHeader from "../../../components/ui/DashboardHeader";
import MiniTable from "../../../components/ui/MiniTable";
import Panel from "../../../components/ui/Panel";
import StatCard from "../../../components/ui/StatCard";
import { useApi } from "../../../hooks/useApi";
import { money } from "../../../utils/format";
import { Loading } from "./shared";
import { activeCampaigns, campaignColumns, endingColumns } from "./columns";




/** Marketing manager home. */
export default function MarketingDashboard() {
  const { data: d, error } = useApi(dashboardApi.marketing, null);

  return (
    <>
      <DashboardHeader subtitle="Promotions, discounts and coupons at a glance." banner={{ to: "/dashboard/promotions", action: "Manage promotions" }} />
      {!d ? <Loading error={error} /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard icon={Megaphone} label="Active promotions" value={d.promotions.ACTIVE} hint={`${d.promotions.SCHEDULED} scheduled`} to="/dashboard/promotions" />
            <StatCard icon={BadgePercent} label="Active discounts" value={d.discounts.ACTIVE} tone="blue" hint={`${d.discounts.SCHEDULED} scheduled`} to="/dashboard/discounts" />
            <StatCard icon={Tags} label="Active coupons" value={d.coupons.ACTIVE} tone="amber" hint={`${d.coupons.SCHEDULED} scheduled`} to="/dashboard/coupons" />
            <StatCard icon={TicketCheck} label="Coupon redemptions" value={d.couponRedemptions} tone="green" hint={`${money(d.discountGiven)} discount given`} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <Panel title="Discount given to customers" subtitle="Coupon discounts on orders per month">
              <ColumnChart
                labels={d.discountByMonth.map((p) => p.label)}
                series={[{ name: "Discount", color: SERIES.primary, values: d.discountByMonth.map((p) => p.value) }]}
                format={(v) => `Rs. ${compact(v)}`}
              />
            </Panel>
            <Panel title="Most used coupons" subtitle="Times redeemed" to="/dashboard/coupons">
              <div className="pt-3"><BarList data={d.couponUsage} color={SERIES.secondary} empty="No coupon has been used yet." /></div>
            </Panel>
          </div>

          <div className="grid gap-5 2xl:grid-cols-[1fr_1.3fr]">
            <Panel title="Ending within 7 days">
              <MiniTable columns={endingColumns} rows={d.endingSoon.map((e) => ({ ...e, id: `${e.kind}-${e.name}` }))} empty="Nothing ends this week." />
            </Panel>
            <Panel title="Running now">
              <MiniTable columns={campaignColumns} rows={activeCampaigns(d)} empty="No campaigns are running." />
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
