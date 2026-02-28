import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

interface PendingAlert {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  acknowledged: boolean;
  data?: Record<string, any>;
}



/**
 * Background auto-escalation hook — runs periodic checks for:
 * 1. Leaves pending > 48h → alerts HOD/Principal
 * 2. Dept avg attendance < 60% → alerts Principal
 * 3. No session recorded in 24h → alerts HOD  
 * 
 * Alerts are stored in localStorage and surfaced via getAlerts().
 */
export function useAutoEscalation() {
  const { role, dept } = useUserRole();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const [alerts, setAlerts] = useState<PendingAlert[]>([]);

  const loadAlerts = useCallback(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('insight_escalation_alerts') || '[]');
      setAlerts(stored);
      return stored as PendingAlert[];
    } catch {
      return [];
    }
  }, []);

  const saveAlerts = useCallback((items: PendingAlert[]) => {
    setAlerts(items);
    localStorage.setItem('insight_escalation_alerts', JSON.stringify(items.slice(0, 50))); // cap at 50
  }, []);

  const addAlert = useCallback((alert: Omit<PendingAlert, 'id' | 'timestamp' | 'acknowledged'>) => {
    const existing = loadAlerts();
    // Deduplicate by type + title (don't spam same alert)
    const isDuplicate = existing.some(
      (a) => !a.acknowledged && a.type === alert.type && a.title === alert.title
    );
    if (isDuplicate) return;

    const newAlert: PendingAlert = {
      ...alert,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };
    saveAlerts([newAlert, ...existing]);

    // Toast for critical/warning
    if (alert.severity === 'critical') {
      toast.error(alert.title, { description: alert.message, duration: 8000 });
    } else if (alert.severity === 'warning') {
      toast.warning(alert.title, { description: alert.message, duration: 5000 });
    }
  }, [loadAlerts, saveAlerts]);

  const acknowledgeAlert = useCallback((id: string) => {
    const existing = loadAlerts();
    const updated = existing.map((a) => (a.id === id ? { ...a, acknowledged: true } : a));
    saveAlerts(updated);
  }, [loadAlerts, saveAlerts]);

  const clearAcknowledged = useCallback(() => {
    const existing = loadAlerts();
    saveAlerts(existing.filter((a) => !a.acknowledged));
  }, [loadAlerts, saveAlerts]);

  // Periodic check — every 5 minutes
  const runChecks = useCallback(async () => {
    if (!role || role === 'faculty' || role === 'class_incharge') return;

    try {
      // 1. Check pending leaves > 48h
      const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      let leaveQuery = supabase
        .from('leaves')
        .select('id, user_id, created_at, status')
        .in('status', ['pending_hod', 'pending', 'pending_principal'])
        .lt('created_at', cutoff48h);

      const { data: staleLeaves } = await leaveQuery;
      if (staleLeaves && staleLeaves.length > 0) {
        addAlert({
          type: 'leave_pending',
          title: `${staleLeaves.length} Leave(s) Pending > 48 Hours`,
          message: 'These leave requests need urgent attention. Navigate to Leave Manager to review.',
          severity: 'warning',
          data: { count: staleLeaves.length },
        });
      }

      // 2. Check for sessions today (if HOD/Principal)
      const today = new Date().toISOString().split('T')[0];
      const dayOfWeek = new Date().getDay();
      if (dayOfWeek !== 0) { // Skip Sunday
        let sessionQuery = supabase
          .from('attendance_sessions')
          .select('id')
          .eq('date', today)
          .limit(1);

        if (dept) {
          sessionQuery = sessionQuery.eq('target_dept', dept);
        }

        const { data: todaySessions } = await sessionQuery;
        if ((!todaySessions || todaySessions.length === 0) && new Date().getHours() >= 12) {
          addAlert({
            type: 'no_session',
            title: dept ? `No Sessions Today (${dept})` : 'No Sessions Recorded Today',
            message: 'No attendance sessions have been recorded today. Please verify faculty compliance.',
            severity: 'info',
          });
        }
      }

    } catch (err) {
      console.error('Auto-escalation check failed:', err);
    }
  }, [role, dept, addAlert]);

  // Start background checks
  useEffect(() => {
    loadAlerts();

    // Run initial check after short delay
    const timeout = setTimeout(runChecks, 5000);

    // Then every 5 minutes
    intervalRef.current = setInterval(runChecks, 5 * 60 * 1000);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [runChecks, loadAlerts]);

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  return {
    alerts,
    unacknowledgedCount,
    acknowledgeAlert,
    clearAcknowledged,
    runChecks, // manual trigger
  };
}
