import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserRole } from '@/hooks/useUserRole';
import { sendNotification, sendNotificationToDept, sendNotificationToAll } from '@/lib/fcm';

export interface Notification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    body: string;
    priority: string;
    data: Record<string, any>;
    is_read: boolean;
    read_at: string | null;
    fcm_sent: boolean;
    created_at: string;
}

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const { role, dept, session } = useUserRole();

    // Fetch notifications relevant to the current user
    const fetchNotifications = useCallback(async () => {
        if (!session?.user?.id) return;
        setLoading(true);

        try {
            // Fetch notifications addressed to this user OR broadcast notifications
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Error fetching notifications:', error);
                return;
            }

            setNotifications(data || []);
            setUnreadCount((data || []).filter(n => !n.is_read).length);
        } catch (err) {
            console.error('Notification fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [session?.user?.id]);

    // Initial fetch
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Subscribe to realtime notifications
    useEffect(() => {
        if (!session?.user?.id) return;

        const channel = supabase
            .channel('notifications-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${session.user.id}`,
                },
                (payload) => {
                    setNotifications(prev => [payload.new as Notification, ...prev]);
                    setUnreadCount(prev => prev + 1);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user?.id]);

    // Mark notification as read
    const markAsRead = useCallback(async (notificationId: string) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId);

        if (!error) {
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    }, []);

    // Mark all as read
    const markAllAsRead = useCallback(async () => {
        if (!session?.user?.id) return;
        
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('user_id', session.user.id)
            .eq('is_read', false);

        if (!error) {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        }
    }, [session?.user?.id]);

    // Send notification (respects role-based access)
    const send = useCallback(async (
        target: 'all' | 'dept' | string[], // 'all', 'dept', or array of user IDs
        title: string,
        body: string,
        priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
    ) => {
        const payload = { title, body, type: 'management_update', priority };

        if (target === 'all') {
            // Management/Principal can send to all
            if (!['management', 'principal', 'developer', 'admin'].includes(role || '')) {
                throw new Error('Insufficient permissions to send to all');
            }
            return sendNotificationToAll(payload);
        }

        if (target === 'dept') {
            // HOD sends to own dept, Management sends to own or all
            const targetDept = dept;
            if (!targetDept) throw new Error('No department associated');
            return sendNotificationToDept(targetDept, payload);
        }

        // Specific user IDs
        if (Array.isArray(target)) {
            return sendNotification(target, payload);
        }

        throw new Error('Invalid target');
    }, [role, dept]);

    // Get faculty list for recipient selection
    const getFacultyList = useCallback(async () => {
        const isFullAccess = ['management', 'principal', 'developer', 'admin'].includes(role || '');

        let query = supabase
            .from('profiles')
            .select('id, full_name, email, dept, role')
            .order('full_name');

        if (!isFullAccess && dept) {
            query = query.eq('dept', dept);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching faculty:', error);
            return [];
        }
        return data || [];
    }, [role, dept]);

    // Delete a single notification
    const deleteNotification = useCallback(async (notificationId: string) => {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId);

        if (!error) {
            setNotifications(prev => {
                const notif = prev.find(n => n.id === notificationId);
                if (notif && !notif.is_read) setUnreadCount(c => Math.max(0, c - 1));
                return prev.filter(n => n.id !== notificationId);
            });
        }
    }, []);

    // Delete multiple notifications
    const deleteMultiple = useCallback(async (ids: string[]) => {
        if (ids.length === 0) return;
        const { error } = await supabase
            .from('notifications')
            .delete()
            .in('id', ids);

        if (!error) {
            setNotifications(prev => {
                const unreadDeleted = prev.filter(n => ids.includes(n.id) && !n.is_read).length;
                setUnreadCount(c => Math.max(0, c - unreadDeleted));
                return prev.filter(n => !ids.includes(n.id));
            });
        }
    }, []);

    return {
        notifications,
        loading,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteMultiple,
        send,
        getFacultyList,
        canSendToAll: ['management', 'principal', 'developer', 'admin'].includes(role || ''),
        userDept: dept,
    };
}
