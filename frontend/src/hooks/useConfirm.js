import { useState } from "react";

/**
 * const confirm = useConfirm();
 * <ConfirmDialog {...confirm.props} />
 * confirm.ask({ title, message, action: () => api.remove(id) })
 */
export function useConfirm() {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);

  const ask = (options) => setState(options);
  const close = () => !busy && setState(null);

  const confirm = async () => {
    setBusy(true);
    try {
      const ok = await state.action();
      if (ok !== false) setState(null);
    } finally {
      setBusy(false);
    }
  };

  return { ask, props: { state, busy, onClose: close, onConfirm: confirm } };
}
