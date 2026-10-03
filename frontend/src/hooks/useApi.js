import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

/**
 * Loads data from an API call and exposes reload().
 * `loader` must be stable (wrap in useCallback when it depends on props).
 */
export function useApi(loader, initial = []) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loader();
      setData(result);
      setError("");
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    // load on mount and whenever the loader changes (e.g. new filter)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  return { data, setData, loading, error, reload };
}

/** Runs an action, shows a toast and returns true when it worked. */
export async function runAction(action, successMessage) {
  try {
    await action();
    if (successMessage) toast.success(successMessage);
    return true;
  } catch (err) {
    toast.error(err.message);
    return false;
  }
}
