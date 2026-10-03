import { Download, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { paymentApi } from "../../api/endpoints";
import Button from "./Button";
import Modal from "./Modal";

/** Shows an uploaded bank slip (photo or PDF) in a modal. */
export default function BankSlipViewer({ payment, onClose, footer }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let url;
    paymentApi
      .bankSlip(payment.id)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setFile({ url, type: blob.type });
      })
      .catch(() => setError("The bank slip could not be loaded"));
    return () => url && URL.revokeObjectURL(url);
  }, [payment.id]);

  return (
    <Modal open size="lg" title={`Bank slip · order #${payment.orderId}`}
      subtitle={[payment.customerName, payment.bankReference && `ref ${payment.bankReference}`].filter(Boolean).join(" · ")}
      onClose={onClose}
      footer={
        <>
          {file && (
            <a href={file.url} download={`bank-slip-order-${payment.orderId}`}
              className="mr-auto inline-flex h-10 items-center gap-2 rounded-lg bg-surface px-4 text-sm font-semibold ring-1 ring-inset ring-line hover:bg-white">
              <Download className="h-4 w-4" /> Download
            </a>
          )}
          {footer || <Button variant="secondary" onClick={onClose}>Close</Button>}
        </>
      }>
      <div className="flex min-h-64 items-center justify-center rounded-lg bg-surface" data-testid="slip-viewer">
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : !file ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        ) : file.type === "application/pdf" ? (
          <object data={file.url} type="application/pdf" className="h-[65vh] w-full rounded-lg">
            <p className="flex items-center gap-2 p-6 text-sm"><FileText className="h-5 w-5" /> PDF slip - use Download to open it.</p>
          </object>
        ) : (
          <img src={file.url} alt="Bank slip" className="max-h-[65vh] rounded-lg object-contain" />
        )}
      </div>
    </Modal>
  );
}
