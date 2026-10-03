import { feedbackApi } from "../../../api/endpoints";
import Avatar from "../../../components/ui/Avatar";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import DataTable from "../../../components/ui/DataTable";
import PageHeader from "../../../components/ui/PageHeader";
import RowActions from "../../../components/ui/RowActions";
import Stars from "../../../components/ui/Stars";
import { runAction, useApi } from "../../../hooks/useApi";
import { useConfirm } from "../../../hooks/useConfirm";
import { date } from "../../../utils/format";

export default function Feedback() {
  const { data, loading, error, reload } = useApi(feedbackApi.list);
  const confirm = useConfirm();

  const askDelete = (row) =>
    confirm.ask({
      title: "Delete feedback",
      message: `Delete "${row.subject}" from ${row.customerName}?`,
      action: async () => (await runAction(() => feedbackApi.remove(row.id), "Feedback deleted")) && reload(),
    });

  const columns = [
    { key: "subject", header: "Feedback", render: (r) => <div className="max-w-md"><p className="font-semibold">{r.subject}</p><p className="text-xs text-muted">{r.message}</p></div> },
    {
      key: "customerName", header: "Customer",
      render: (r) => (
        <div className="flex items-center gap-2.5 text-xs">
          <Avatar src={r.customerImageUrl} name={r.customerName} size="sm" />
          <div><p className="font-semibold">{r.customerName}</p><p className="text-muted">{date(r.createdAt)}{r.orderId ? ` · order #${r.orderId}` : ""}</p></div>
        </div>
      ),
    },
    { key: "rating", header: "Rating", render: (r) => <Stars value={r.rating} size={14} /> },
    {
      key: "actions", header: "", className: "text-right",
      render: (r) => <RowActions onDelete={() => askDelete(r)} />,
    },
  ];

  return (
    <>
      <PageHeader eyebrow="Customer care" title="Customer Feedback" subtitle="Feedback about the shop and orders, shown on the home page straight away. Delete feedback only if it is abusive or spam." />
      <DataTable columns={columns} rows={data} loading={loading} error={error} />
      <ConfirmDialog {...confirm.props} />
    </>
  );
}
