import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../../shared/lib/supabase';

interface RemoteAuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isConfigured: boolean;
    isPromptDismissed: boolean;
    dismissPrompt: () => void;
    resetPrompt: () => void;
    signInWithGoogle: () => Promise<{ error: string | null }>;
    signOut: () => Promise<{ error: string | null }>;
}

const SYNC_PROMPT_DISMISSED_KEY = 'ojeet-sync-prompt-dismissed';
const REMOTE_SYNC_META_PREFIX = 'ojeet-remote-sync-';

const readPromptDismissed = () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(SYNC_PROMPT_DISMISSED_KEY) === '1';
};

const clearRemoteSyncMetadata = () => {
    if (typeof window === 'undefined') return;
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith(REMOTE_SYNC_META_PREFIX)) {
            keysToRemove.push(key);
        }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
};

const RemoteAuthContext = createContext<RemoteAuthContextType | undefined>(undefined);

export const RemoteAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(isSupabaseConfigured);
    const [isPromptDismissed, setIsPromptDismissed] = useState<boolean>(readPromptDismissed);

    useEffect(() => {
        if (!isSupabaseConfigured || !supabase) {
            setIsLoading(false);
            return;
        }

        let isMounted = true;

        supabase.auth.getSession().then(({ data }) => {
            if (!isMounted) return;
            setSession(data.session ?? null);
            setUser(data.session?.user ?? null);
            setIsLoading(false);
        });

        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            setSession(nextSession ?? null);
            setUser(nextSession?.user ?? null);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const dismissPrompt = useCallback(() => {
        setIsPromptDismissed(true);
        if (typeof window !== 'undefined') {
            localStorage.setItem(SYNC_PROMPT_DISMISSED_KEY, '1');
        }
    }, []);

    const resetPrompt = useCallback(() => {
        setIsPromptDismissed(false);
        if (typeof window !== 'undefined') {
            localStorage.removeItem(SYNC_PROMPT_DISMISSED_KEY);
        }
    }, []);

    const signInWithGoogle = useCallback(async () => {
        if (!isSupabaseConfigured || !supabase) {
            return { error: 'Cloud sync is not configured yet.' };
        }

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });

        return { error: error?.message ?? null };
    }, []);

    const signOut = useCallback(async () => {
        if (!isSupabaseConfigured || !supabase) {
            clearRemoteSyncMetadata();
            return { error: null };
        }

        const { error } = await supabase.auth.signOut();
        clearRemoteSyncMetadata();
        return { error: error?.message ?? null };
    }, []);

    const value = useMemo<RemoteAuthContextType>(() => ({
        user,
        session,
        isLoading,
        isConfigured: isSupabaseConfigured,
        isPromptDismissed,
        dismissPrompt,
        resetPrompt,
        signInWithGoogle,
        signOut,
    }), [dismissPrompt, isLoading, isPromptDismissed, resetPrompt, session, signInWithGoogle, signOut, user]);

    return (
        <RemoteAuthContext.Provider value={value}>
            {children}
        </RemoteAuthContext.Provider>
    );
};

export const useRemoteAuth = () => {
    const context = useContext(RemoteAuthContext);
    if (!context) {
        throw new Error('useRemoteAuth must be used within a RemoteAuthProvider');
    }
    return context;
};
