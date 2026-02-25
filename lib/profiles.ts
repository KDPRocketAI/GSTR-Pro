import { validateGSTIN } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

// ——— Types ———
export type UserRole = 'trial' | 'business' | 'ca';

export interface GSTProfileLocal {
    id: string;
    gstin: string;
    legal_name: string;
    trade_name: string;
    state_code: string;
    is_active: boolean;
    created_at: string;
}

// No top-level supabase instance here to avoid session sync issues in Next.js

export async function getUserRole(userId: string): Promise<UserRole> {
    const supabase = createClient();
    console.log('[profiles] Fetching plan from auth metadata for userId:', userId);

    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            console.warn('[profiles] Could not get auth user for plan check:', error);
            return 'business';
        }

        const plan = user.user_metadata?.plan as UserRole;
        console.log('[profiles] Plan from metadata:', plan);
        return plan || 'business';
    } catch (err) {
        console.error('[profiles] Exception in getUserPlan:', err);
        return 'business';
    }
}

export async function setUserRole(userId: string, plan: UserRole) {
    const supabase = createClient();
    console.log('[profiles] Updating user metadata for plan:', plan);
    const { error } = await supabase.auth.updateUser({
        data: { plan }
    });

    if (error) {
        console.error('[profiles] Error updating user plan metadata:', error);
    }
}

// ——— Profile CRUD ———
export async function getProfiles(userId: string): Promise<GSTProfileLocal[]> {
    const supabase = createClient();
    console.log('[profiles] getProfiles called for userId:', userId);

    // Check internal session state
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[profiles] Internal Supabase session user ID:', session?.user?.id);

    if (session?.user?.id && session.user.id !== userId) {
        console.warn('[profiles] SESSION MISMATCH: Passed userId does not match session user ID!');
    }

    const { data, error } = await supabase
        .from('gst_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[profiles] Error fetching profiles:', error);
        return [];
    }
    console.log('[profiles] Profiles fetched from DB:', data?.length || 0, 'rows');
    if (data && data.length > 0) {
        console.log('[profiles] First profile sample:', data[0]);
    }
    return data || [];
}

export async function canAddProfile(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const plan = await getUserRole(userId);
    const profiles = await getProfiles(userId);
    const count = profiles.length;

    console.log(`[profiles] Limit Check - Plan: ${plan}, Current Count: ${count}`);

    if ((plan === 'business' || plan === 'trial') && count >= 1) {
        const msg = plan === 'trial'
            ? 'Your trial allows only one GST profile. Upgrade to CA plan for unlimited profiles.'
            : 'Your plan allows only one GST profile. Upgrade to CA plan for unlimited profiles.';
        console.log('[profiles] Decision: BLOCKED -', msg);
        return {
            allowed: false,
            reason: msg,
        };
    }

    console.log('[profiles] Decision: ALLOWED');
    return { allowed: true };
}

export async function addProfile(
    userId: string,
    gstin: string,
    legalName: string,
    tradeName?: string,
): Promise<{ success: boolean; error?: string; profile?: GSTProfileLocal }> {
    const supabase = createClient();
    console.log('[profiles] addProfile request start - userId:', userId, 'GSTIN:', gstin);

    // 1. Validation
    if (!validateGSTIN(gstin)) {
        return { success: false, error: 'Invalid GSTIN format. Must be 15 characters.' };
    }
    if (!legalName.trim()) {
        return { success: false, error: 'Legal name is required.' };
    }

    try {
        // 2. Limit Check
        const limitCheck = await canAddProfile(userId);
        if (!limitCheck.allowed) {
            console.warn('[profiles] Limit check failed:', limitCheck.reason);
            return { success: false, error: limitCheck.reason };
        }

        // 3. Duplicate Check (fetching fresh from DB)
        const { data: existing, error: fetchError } = await supabase
            .from('gst_profiles')
            .select('gstin')
            .eq('user_id', userId)
            .eq('gstin', gstin);

        if (fetchError) {
            console.error('[profiles] Fetch error during duplicate check:', fetchError);
            return { success: false, error: `Failed to check for existing profiles: ${fetchError.message}` };
        }

        if (existing && existing.length > 0) {
            console.warn('[profiles] Duplicate GSTIN found:', gstin);
            return { success: false, error: `GSTIN ${gstin} is already registered in your account.` };
        }

        // 4. Prepare Payload
        const { data: { session } } = await supabase.auth.getSession();
        const activeUserId = session?.user?.id || userId;

        if (!activeUserId) {
            console.error('[profiles] No userId available for insertion!');
            return { success: false, error: 'Authentication required. Please sign in again.' };
        }

        // Get count for auto-active logic
        const { count } = await supabase
            .from('gst_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', activeUserId);

        const newProfile = {
            user_id: activeUserId,
            gstin: gstin.toUpperCase(),
            legal_name: legalName.trim(),
            trade_name: (tradeName || '').trim() || legalName.trim(),
            state_code: gstin.substring(0, 2),
            is_active: (count || 0) === 0, // first profile is auto-active
        };

        console.log('[profiles] Final payload for insertion:', JSON.stringify(newProfile, null, 2));

        // 5. Insert
        const { data, error: insertError } = await supabase
            .from('gst_profiles')
            .insert(newProfile)
            .select()
            .single();

        if (insertError) {
            console.error('[profiles] DB Insert Failed:', insertError);
            return {
                success: false,
                error: `Database Insert Error: ${insertError.message} (Code: ${insertError.code}). ${insertError.hint || ''}`
            };
        }

        console.log('[profiles] DB Insert Success:', data);
        return { success: true, profile: data };

    } catch (err: any) {
        console.error('[profiles] Unexpected error in addProfile:', err);
        return { success: false, error: `Unexpected Error: ${err.message || 'Unknown error'}` };
    }
}

export async function deleteProfile(userId: string, profileId: string) {
    const supabase = createClient();
    const { error } = await supabase
        .from('gst_profiles')
        .delete()
        .eq('id', profileId)
        .eq('user_id', userId);

    if (error) {
        console.error('Error deleting profile:', error);
        return [];
    }

    const updated = await getProfiles(userId);
    if (updated.length > 0 && !updated.some((p) => p.is_active)) {
        await setActiveProfile(userId, updated[0].id);
        return getProfiles(userId);
    }
    return updated;
}

export async function setActiveProfile(userId: string, profileId: string) {
    const supabase = createClient();
    await supabase
        .from('gst_profiles')
        .update({ is_active: false })
        .eq('user_id', userId);

    await supabase
        .from('gst_profiles')
        .update({ is_active: true })
        .eq('id', profileId)
        .eq('user_id', userId);

    return getProfiles(userId);
}

/**
 * Auto-create a profile from signup GSTIN (called once after signup).
 */
export async function autoCreateProfileFromSignup(
    userId: string,
    gstin: string,
    fullName: string,
    optLegalName?: string,
    optTradeName?: string
): Promise<boolean> {
    console.log('[profiles] autoCreateProfileFromSignup called for:', userId, 'GSTIN:', gstin);
    if (!gstin || !validateGSTIN(gstin)) {
        console.warn('[profiles] Skipping auto-create: Invalid or missing GSTIN.');
        return false;
    }

    const existing = await getProfiles(userId);
    if (existing.some((p) => p.gstin === gstin)) {
        console.warn('[profiles] Skipping auto-create: GSTIN already exists.');
        return false;
    }

    console.log('[profiles] Proceeding with auto-create...');
    const legalName = optLegalName || fullName;
    const tradeName = optTradeName || legalName;

    const result = await addProfile(userId, gstin, legalName, tradeName);
    console.log('[profiles] Auto-create result:', result.success ? 'SUCCESS' : 'FAILURE', result.error || '');
    return result.success;
}
