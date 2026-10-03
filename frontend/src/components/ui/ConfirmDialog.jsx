import { AlertTriangle, HelpCircle } from "lucide-react";
import Button from "./Button";
import Modal from "./Modal";

export default function ConfirmDialog({ state, busy, onClose, onConfirm }) {
  const danger = (state?.variant || "danger") === "danger";
  return (
    <Modal
      open={Boolean(state)}
      title={state?.title || "Are you sure?"}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={state?.variant || "danger"} onClick={onConfirm} loading={busy}>
            {state?.confirmLabel || "Delete"}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {danger ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
            <AlertTriangle className="h-5 w-5" />
          </span>
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <HelpCircle className="h-5 w-5" />
          </span>
        )}
        <p className="text-sm leading-6 text-muted">{state?.message}</p>
      </div>
    </Modal>
  );
}
