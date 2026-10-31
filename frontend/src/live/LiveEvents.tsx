import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getAuthToken } from '../api/client';
import { useAuth } from '../context/AuthContext';

type Listener = (event: { type: string; [k: string]: any }) => void;

interface LiveEventsContextType {
  connected: boolean;
  subscribe: (listener: Listener) => () => void;
}

const LiveEventsContext = createContext<LiveEventsContextType>({ connected: false, subscribe: () => () => {} });

// Event types the backend emits (see backend/app/core/events.py callers)
const EVENT_TYPES = [
  'lead.created', 'lead.updated', 'survey.assigned', 'survey.submitted', 'survey.approved', 'survey.rejected',
  'quote.created', 'quote.sent', 'quote.accepted', 'order.payment', 'order.confirmed', 'order.stage_changed',
  'order.delivered', 'order.closed', 'serial.scanned', 'job.released', 'job.started', 'job.completed',
  'invoice.issued', 'ticket.created', 'ticket.updated', 'subsidy.updated', 'finance.expense_recorded',
  'stock.purchased', 'payout.paid',
];

/** One EventSource per signed-in session, shared by every screen. */
export const LiveEventsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const listeners = useRef(new Set<Listener>());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) return;
    let source: EventSource | null = null;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout>;

    const connect = async () => {
      const token = await getAuthToken();
      if (!token || cancelled) return;
      source = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);
      source.onopen = () => setConnected(true);
      source.onerror = () => {
        setConnected(false);
        source?.close();
        // Reconnect with a fresh token (Firebase ID tokens expire hourly)
        retry = setTimeout(connect, 5000);
      };
      const dispatch = (e: MessageEvent) => {
        const data = JSON.parse(e.data);
        listeners.current.forEach((l) => l(data));
      };
      EVENT_TYPES.forEach((t) => source!.addEventListener(t, dispatch as EventListener));
    };
    connect();
    return () => {
      cancelled = true;
      clearTimeout(retry);
      source?.close();
      setConnected(false);
    };
  }, [user?.id]);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  return <LiveEventsContext.Provider value={{ connected, subscribe }}>{children}</LiveEventsContext.Provider>;
};

export const useLiveConnection = () => useContext(LiveEventsContext).connected;

/**
 * Calls `refresh` when a matching event arrives (prefix match, e.g. 'order.' or exact 'lead.created').
 * Bursts are coalesced so one hand-off triggers one refetch.
 */
export function useLiveRefresh(prefixes: string[] | '*', refresh: () => void) {
  const { subscribe } = useContext(LiveEventsContext);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribe((ev) => {
      if (prefixes !== '*' && !prefixes.some((p) => ev.type.startsWith(p))) return;
      clearTimeout(timer);
      timer = setTimeout(() => refreshRef.current(), 400);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [subscribe, Array.isArray(prefixes) ? prefixes.join('|') : prefixes]);
}
