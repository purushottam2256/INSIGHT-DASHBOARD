import { useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserRole } from './useUserRole';

export interface AuditEntry {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  category: 'leave' | 'attendance' | 'faculty' | 'report' | 'calendar' | 'semester' | 'section' | 'broadcast' | 'settings' | 'other';
  details: string;
  metadata?: Record<string, any>;
  timestamp: string;
  dept?: string;
}

// In-memory buffer for batch logging
const auditBuffer: Omit<AuditEntry, 'id'>[] = [];
const FLUSH_INTERVAL = 30000; // 30s batch flush

/**
 * Hook for logging administrative actions.
 * Every significant action goes through logAction().
 * Entries are buffered and batch-inserted to minimize DB writes.
 * Falls back to localStorage if Supabase isn't available.
 */
export function useAuditLog() {
  const { role, dept, session } = useUserRole();
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logAction = useCallback(
    (
      action: string,
      category: AuditEntry['category'],
      details: string,
      metadata?: Record<string, any>
    ) => {
      const entry: Omit<AuditEntry, 'id'> = {
        user_id: session?.user?.id || 'unknown',
        user_name: session?.user?.email || 'Unknown User',
        user_role: role || 'unknown',
        action,
        category,
        details,
        metadata,
        timestamp: new Date().toISOString(),
        dept: dept || undefined,
      };

      auditBuffer.push(entry);

      // Also store in localStorage for persistence
      try {
        const stored = JSON.parse(localStorage.getItem('insight_audit_log') || '[]');
        stored.push({ ...entry, id: crypto.randomUUID() });
        // Keep only last 500 entries in localStorage
        if (stored.length > 500) stored.splice(0, stored.length - 500);
        localStorage.setItem('insight_audit_log', JSON.stringify(stored));
      } catch {
        // Ignore localStorage errors
      }

      // Schedule a batch flush
      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(() => {
          flushAuditBuffer();
          flushTimerRef.current = null;
        }, FLUSH_INTERVAL);
      }
    },
    [role, dept, session]
  );

  return { logAction };
}

/** Batch flush audit buffer to Supabase */
async function flushAuditBuffer() {
  if (auditBuffer.length === 0) return;
  const entries = [...auditBuffer];
  auditBuffer.length = 0;

  try {
    // Try to insert into audit_log table (may not exist yet)
    await supabase.from('audit_log').insert(
      entries.map((e) => ({
        user_id: e.user_id,
        user_name: e.user_name,
        user_role: e.user_role,
        action: e.action,
        category: e.category,
        details: e.details,
        metadata: e.metadata,
        created_at: e.timestamp,
        dept: e.dept,
      }))
    );
  } catch {
    // If table doesn't exist, we still have localStorage backup
    console.warn('[Audit] Supabase insert failed, entries saved to localStorage');
  }
}

/** Get audit log entries from localStorage (client-side fallback) */
export function getLocalAuditLog(filters?: {
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
  dept?: string;
}): AuditEntry[] {
  try {
    let entries: AuditEntry[] = JSON.parse(localStorage.getItem('insight_audit_log') || '[]');
    
    if (filters?.category && filters.category !== 'all') {
      entries = entries.filter((e) => e.category === filters.category);
    }
    if (filters?.dateFrom) {
      entries = entries.filter((e) => e.timestamp >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
      entries = entries.filter((e) => e.timestamp <= filters.dateTo! + 'T23:59:59');
    }
    if (filters?.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.action.toLowerCase().includes(q) ||
          e.details.toLowerCase().includes(q) ||
          e.user_name.toLowerCase().includes(q)
      );
    }
    if (filters?.dept) {
      entries = entries.filter((e) => e.dept === filters.dept);
    }

    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch {
    return [];
  }
}
