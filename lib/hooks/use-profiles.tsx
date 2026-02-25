'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './use-auth';
import { getProfiles, setActiveProfile, type GSTProfileLocal } from '@/lib/profiles';

interface ProfilesContextType {
    profiles: GSTProfileLocal[];
    activeProfile: GSTProfileLocal | null;
    loading: boolean;
    refreshProfiles: () => Promise<void>;
    switchProfile: (profileId: string) => Promise<void>;
}

const ProfilesContext = createContext<ProfilesContextType | undefined>(undefined);

export function ProfilesProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [profiles, setProfiles] = useState<GSTProfileLocal[]>([]);
    const [activeProfile, setActiveProfileState] = useState<GSTProfileLocal | null>(null);
    const [loading, setLoading] = useState(true);

    const loadProfiles = useCallback(async () => {
        if (!user?.id) {
            setProfiles([]);
            setActiveProfileState(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const data = await getProfiles(user.id);
            setProfiles(data);
            const active = data.find(p => p.is_active) || data[0] || null;
            setActiveProfileState(active);
            console.log('[ProfilesProvider] Profiles loaded:', data.length, 'Active:', active?.gstin);
        } catch (err) {
            console.error('[ProfilesProvider] Error loading profiles:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadProfiles();
    }, [loadProfiles]);

    const switchProfile = async (profileId: string) => {
        if (!user?.id) return;

        console.log('[ProfilesProvider] Switching to profile:', profileId);
        await setActiveProfile(user.id, profileId);
        await loadProfiles(); // Refetch to get updated is_active flags
    };

    const value: ProfilesContextType = {
        profiles,
        activeProfile,
        loading,
        refreshProfiles: loadProfiles,
        switchProfile,
    };

    return (
        <ProfilesContext.Provider value={value}>
            {children}
        </ProfilesContext.Provider>
    );
}

export function useProfiles() {
    const context = useContext(ProfilesContext);
    if (context === undefined) {
        throw new Error('useProfiles must be used within a ProfilesProvider');
    }
    return context;
}
