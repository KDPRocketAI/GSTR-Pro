'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export type UserPlan = 'trial' | 'business' | 'ca';

interface AuthState {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isTrialExpired: boolean;
    trialDaysRemaining: number;
    plan: UserPlan;
    signUp: (email: string, password: string, metadata?: Record<string, string>) => Promise<{ error: Error | null; userId?: string }>;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    upgradePlan: (newPlan: UserPlan) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isTrialExpired, setIsTrialExpired] = useState(false);
    const [trialDaysRemaining, setTrialDaysRemaining] = useState(30);
    const [plan, setPlan] = useState<UserPlan>('trial');
    const supabase = createClient();

    const computeTrialStatus = useCallback(async (currUser: User | null) => {
        if (!currUser) {
            setIsTrialExpired(false);
            setTrialDaysRemaining(30);
            return;
        }

        const metadata = currUser.user_metadata;
        let trialEndStr = metadata?.trial_end;
        let plan = metadata?.plan;

        // Backfill missing trial_end or plan for older users
        if (!trialEndStr || !plan) {
            console.log('[useAuth] trial_metadata or plan missing, backfilling...');
            const now = new Date();
            const trialEnd = new Date();
            trialEnd.setDate(now.getDate() + 30);

            const updatedEnd = trialEndStr || trialEnd.toISOString();
            const updatedPlan = plan || 'business';

            const { data, error } = await supabase.auth.updateUser({
                data: {
                    trial_start: metadata?.trial_start || now.toISOString(),
                    trial_end: updatedEnd,
                    plan: updatedPlan
                }
            });

            if (error) {
                console.error('[useAuth] Error backfilling user metadata:', error);
            } else {
                console.log('[useAuth] Metadata backfill successful:', data.user.user_metadata);
                trialEndStr = updatedEnd;
            }
        }

        const trialEnd = new Date(trialEndStr);
        const now = new Date();
        const diffTime = trialEnd.getTime() - now.getTime();

        // Accurate days calculation
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // CRITICAL: isTrialExpired ONLY blocks if plan is 'trial'
        const expired = diffTime <= 0;
        const currentPlan = (metadata?.plan || 'business') as UserPlan;

        setPlan(currentPlan);
        setIsTrialExpired(currentPlan === 'trial' && expired);
        setTrialDaysRemaining(Math.max(0, diffDays));

        console.log(`[useAuth] Subscription Status - Plan: ${currentPlan}, Trial End: ${trialEndStr}, Days Remaining: ${diffDays}, Expired (Logic): ${expired}`);
    }, [supabase.auth]);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, sess) => {
                setSession(sess);
                const u = sess?.user ?? null;
                setUser(u);
                computeTrialStatus(u);
                setLoading(false);
            }
        );

        supabase.auth.getSession().then(({ data: { session: sess } }) => {
            setSession(sess);
            const u = sess?.user ?? null;
            setUser(u);
            computeTrialStatus(u);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [supabase.auth, computeTrialStatus]);

    const signUp = useCallback(async (email: string, password: string, metadata?: Record<string, string>) => {
        try {
            const now = new Date();
            const trialEnd = new Date();
            trialEnd.setDate(now.getDate() + 30);

            const trialMetadata = {
                ...metadata,
                trial_start: now.toISOString(),
                trial_end: trialEnd.toISOString(),
                plan: 'trial' // Forced 'trial' for all new signups
            };

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: trialMetadata },
            });

            if (error) {
                // Handle Supabase email rate limit
                if (error.message.toLowerCase().includes('rate limit') || error.status === 429) {
                    return { error: new Error('Too many signup attempts. Please wait a few minutes or try signing in.') };
                }
                return { error: new Error(error.message) };
            }

            return {
                error: null,
                userId: data?.user?.id,
            };
        } catch (err) {
            console.error('Signup network error:', err);
            return {
                error: new Error(
                    'Could not connect to the authentication server. Please check your connection and try again.'
                ),
            };
        }
    }, [supabase.auth]);

    const signIn = useCallback(async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            return { error: error ? new Error(error.message) : null };
        } catch (err) {
            console.error('Sign-in network error:', err);
            return {
                error: new Error(
                    'Could not connect to the authentication server. Please check your Supabase credentials in .env.local and restart the dev server.'
                ),
            };
        }
    }, [supabase.auth]);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
    }, [supabase.auth]);

    const upgradePlan = useCallback(async (newPlan: UserPlan) => {
        console.log('[useAuth] Upgrading plan to:', newPlan);
        const { data, error } = await supabase.auth.updateUser({
            data: { plan: newPlan }
        });

        if (error) {
            console.error('[useAuth] Upgrade error:', error);
            return { success: false, error: error.message };
        }

        console.log('[useAuth] Upgrade success:', data.user.user_metadata);
        await computeTrialStatus(data.user);
        return { success: true };
    }, [supabase.auth, computeTrialStatus]);

    const value: AuthState = {
        user,
        session,
        loading,
        isTrialExpired,
        trialDaysRemaining,
        plan,
        signUp,
        signIn,
        signOut,
        upgradePlan
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
