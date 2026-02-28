import { supabase } from './supabase';

/**
 * FCM Notification Utility
 * 
 * Sends push notifications via Supabase Edge Function.
 * Falls back to just inserting into notifications table if Edge Function is not deployed.
 * 
 * To deploy the Edge Function:
 * 1. Create `supabase/functions/send-fcm/index.ts`
 * 2. Add Firebase service account JSON as a secret
 * 3. Deploy with `supabase functions deploy send-fcm`
 */

interface NotificationPayload {
    title: string;
    body: string;
    type?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    data?: Record<string, any>;
}

/**
 * Send FCM notification to specific users
 * Inserts into notifications table AND attempts to call Supabase Edge Function for FCM delivery
 */
export async function sendNotification(
    userIds: string[],
    payload: NotificationPayload
): Promise<{ success: boolean; notificationIds: string[]; fcmSent: boolean }> {
    const notificationIds: string[] = [];
    let fcmSent = false;

    try {
        // 1. Insert notifications into DB for each recipient
        const notifications = userIds.map(userId => ({
            user_id: userId,
            type: payload.type || 'management_update',
            title: payload.title,
            body: payload.body,
            priority: payload.priority || 'normal',
            data: payload.data || {},
            is_read: false,
            fcm_sent: false,
        }));

        const { data: inserted, error: insertError } = await supabase
            .from('notifications')
            .insert(notifications)
            .select('id');

        if (insertError) {
            console.error('Failed to insert notifications:', insertError);
            return { success: false, notificationIds: [], fcmSent: false };
        }

        notificationIds.push(...(inserted || []).map((n: any) => n.id));

        // 2. Get push tokens for all target users
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, push_token, device_token')
            .in('id', userIds);

        if (profilesError) {
            console.error('Failed to fetch push tokens:', profilesError);
            return { success: true, notificationIds, fcmSent: false };
        }

        const tokens = (profiles || [])
            .map(p => p.push_token || p.device_token)
            .filter(Boolean);

        if (tokens.length === 0) {
            console.warn('No push tokens found for users');
            return { success: true, notificationIds, fcmSent: false };
        }

        // 3. Call Supabase Edge Function for FCM delivery
        try {
            const { data: _fcmResult, error: fcmError } = await supabase.functions.invoke('send-fcm', {
                body: {
                    tokens,
                    title: payload.title,
                    body: payload.body,
                    data: payload.data,
                },
            });

            if (fcmError) {
                console.warn('Edge Function not available, FCM not sent:', fcmError.message);
            } else {
                fcmSent = true;
                // Mark notifications as FCM sent
                if (notificationIds.length > 0) {
                    await supabase
                        .from('notifications')
                        .update({ fcm_sent: true, fcm_sent_at: new Date().toISOString() })
                        .in('id', notificationIds);
                }
            }
        } catch (edgeFnError) {
            console.warn('Edge Function call failed (likely not deployed):', edgeFnError);
        }

        return { success: true, notificationIds, fcmSent };
    } catch (err) {
        console.error('sendNotification error:', err);
        return { success: false, notificationIds, fcmSent };
    }
}

/**
 * Send notification to all faculty in a specific department
 */
export async function sendNotificationToDept(
    dept: string,
    payload: NotificationPayload
): Promise<{ success: boolean; count: number }> {
    const { data: faculty, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('dept', dept);

    if (error || !faculty) {
        console.error('Failed to fetch dept faculty:', error);
        return { success: false, count: 0 };
    }

    const userIds = faculty.map(f => f.id);
    const result = await sendNotification(userIds, payload);
    return { success: result.success, count: userIds.length };
}

/**
 * Send notification to all faculty across all departments
 */
export async function sendNotificationToAll(
    payload: NotificationPayload
): Promise<{ success: boolean; count: number }> {
    const { data: faculty, error } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['faculty', 'class_incharge', 'lab_incharge', 'hod']);

    if (error || !faculty) {
        console.error('Failed to fetch all faculty:', error);
        return { success: false, count: 0 };
    }

    const userIds = faculty.map(f => f.id);
    const result = await sendNotification(userIds, payload);
    return { success: result.success, count: userIds.length };
}
