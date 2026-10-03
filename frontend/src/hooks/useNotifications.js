import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { notificationApi } from "../api/endpoints";

/** The logged-in user's in-app notifications (reloaded on page change and every 30 seconds). */
export function useNotifications(enabled = true) {
  const { pathname } = useLocation();
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      setItems(await notificationApi.list());
    } catch {
      setItems([]);
    }
  }, [enabled]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load, pathname]);

  const markRead = async (id) => {
    setItems((list) => list.map((n) => (n.id === id ? { ...n, seen: true } : n)));
    await notificationApi.markRead(id).catch(() => {});
  };

  const markAllRead = async () => {
    setItems((list) => list.map((n) => ({ ...n, seen: true })));
    await notificationApi.markAllRead().catch(() => {});
  };

  return { items, unread: items.filter((n) => !n.seen).length, markRead, markAllRead, reload: load };
}
