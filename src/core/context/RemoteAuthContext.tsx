import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../../shared/lib/supabase';
import { isUnconfirmedEmailError } from '../../shared/utils/auth';

interface RemoteAuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  isPromptDismissed: boolean;
  isPasswordRecovery: boolean;
  unconfirmedEmail: string | null;
  isEmailBannerDismissed: boolean;
  dismissEmailBanner: () => void;
  resetEmailBanner: () => void;
  setPendingUnconfirmedEmail: (email: string | null) => void;
  dismissPrompt: () => void;
  resetPrompt: () => void;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ error: string | null; confirmationRequired: boolean }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  updateEmail: (
    newEmail: string
  ) => Promise<{ error: string | null; confirmationRequired: boolean }>;
  resendConfirmationEmail: (email?: string) => Promise<{ error: string | null }>;
  clearPasswordRecovery: () => void;
  signOut: () => Promise<{ error: string | null }>;
}

const SYNC_PROMPT_DISMISSED_KEY = 'ojeet-sync-prompt-dismissed';
const PENDING_UNCONFIRMED_EMAIL_KEY = 'ojeet-pending-unconfirmed-email';
const REMOTE_SYNC_META_PREFIX = 'ojeet-remote-sync-';
const PROD_OAUTH_REDIRECT_URL = 'https://tracker.ojeet.tech';

const getAuthRedirectUrl = () => {
  if (typeof window === 'undefined') return PROD_OAUTH_REDIRECT_URL;
  return window.location.origin;
};

const readPromptDismissed = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SYNC_PROMPT_DISMISSED_KEY) === '1';
};

const readPendingUnconfirmedEmail = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PENDING_UNCONFIRMED_EMAIL_KEY) || null;
};

const writePendingUnconfirmedEmail = (email: string | null) => {
  if (typeof window === 'undefined') return;
  if (email && email.trim()) {
    localStorage.setItem(PENDING_UNCONFIRMED_EMAIL_KEY, email.trim());
  } else {
    localStorage.removeItem(PENDING_UNCONFIRMED_EMAIL_KEY);
  }
};

const clearRemoteSyncMetadata = () => {
  if (typeof window === 'undefined') return;
  const keysToRemove: string[] = [PENDING_UNCONFIRMED_EMAIL_KEY];

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && (key.startsWith(REMOTE_SYNC_META_PREFIX) || key === 'jee-community-friends-cache')) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
};

const cleanOAuthUrlParams = () => {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    let modified = false;

    if (url.hash && url.hash.startsWith('#')) {
      const hashParams = new URLSearchParams(url.hash.substring(1));
      const authKeys = [
        'access_token',
        'refresh_token',
        'expires_in',
        'expires_at',
        'token_type',
        'provider_token',
        'error',
        'error_description',
        'error_code',
      ];
      let hashModified = false;
      authKeys.forEach((key) => {
        if (hashParams.has(key)) {
          hashParams.delete(key);
          hashModified = true;
        }
      });
      if (hashModified) {
        const newHash = hashParams.toString();
        url.hash = newHash ? `#${newHash}` : '';
        modified = true;
      }
    }

    const searchAuthKeys = ['code', 'state', 'error', 'error_description', 'error_code'];
    let searchModified = false;
    searchAuthKeys.forEach((key) => {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        searchModified = true;
      }
    });
    if (searchModified) {
      modified = true;
    }

    if (modified) {
      window.history.replaceState(window.history.state, document.title, url.toString());
    }
  } catch (err) {
    console.warn('Failed to clean OAuth URL params:', err);
  }
};

const RemoteAuthContext = createContext<RemoteAuthContextType | undefined>(undefined);

export const RemoteAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(isSupabaseConfigured);
  const [isPromptDismissed, setIsPromptDismissed] = useState<boolean>(readPromptDismissed);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false);
  const [pendingUnconfirmedEmail, setPendingUnconfirmedEmailState] = useState<string | null>(
    readPendingUnconfirmedEmail
  );
  const [isEmailBannerDismissed, setIsEmailBannerDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
        setIsLoading(false);
        if (data.session) {
          cleanOAuthUrlParams();
        }
      })
      .catch((err) => {
        console.error('Failed to get session:', err);
        if (!isMounted) return;
        setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || nextSession) {
        cleanOAuthUrlParams();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // When user is confirmed or logged in with Google, clear any pending unconfirmed email
  useEffect(() => {
    if (user) {
      const isGoogle = user.app_metadata?.provider === 'google';
      const isConfirmed = Boolean(user.confirmed_at || user.email_confirmed_at);
      if ((isGoogle || isConfirmed) && !user.new_email) {
        setPendingUnconfirmedEmailState(null);
        writePendingUnconfirmedEmail(null);
      }
    }
  }, [user]);

  const unconfirmedEmail = useMemo(() => {
    if (user) {
      if (user.new_email) {
        return user.new_email;
      }
      const isGoogle = user.app_metadata?.provider === 'google';
      const isConfirmed = Boolean(user.confirmed_at || user.email_confirmed_at);
      if (!isGoogle && !isConfirmed) {
        return user.email || pendingUnconfirmedEmail;
      }
      return null;
    }
    return pendingUnconfirmedEmail;
  }, [user, pendingUnconfirmedEmail]);

  const dismissEmailBanner = useCallback(() => {
    setIsEmailBannerDismissed(true);
  }, []);

  const resetEmailBanner = useCallback(() => {
    setIsEmailBannerDismissed(false);
  }, []);

  const setPendingUnconfirmedEmail = useCallback((email: string | null) => {
    const trimmed = email && email.trim() ? email.trim() : null;
    setPendingUnconfirmedEmailState(trimmed);
    writePendingUnconfirmedEmail(trimmed);
    if (trimmed) {
      setIsEmailBannerDismissed(false);
    }
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

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'Cloud sync is not configured yet.' };
    }

    const redirectTo = getAuthRedirectUrl();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    return { error: error?.message ?? null };
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName?: string) => {
      if (!isSupabaseConfigured || !supabase) {
        return { error: 'Cloud sync is not configured yet.', confirmationRequired: false };
      }

      const emailRedirectTo = getAuthRedirectUrl();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: displayName ? { full_name: displayName, name: displayName } : undefined,
        },
      });

      if (error) {
        return { error: error.message, confirmationRequired: false };
      }

      const confirmationRequired = Boolean(data.user && !data.session);
      if (confirmationRequired || (data.user && !data.user.email_confirmed_at)) {
        const trimmedEmail = email.trim();
        setPendingUnconfirmedEmailState(trimmedEmail);
        writePendingUnconfirmedEmail(trimmedEmail);
        setIsEmailBannerDismissed(false);
      }
      return { error: null, confirmationRequired };
    },
    []
  );

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      if (!isSupabaseConfigured || !supabase) {
        return { error: 'Cloud sync is not configured yet.' };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (isUnconfirmedEmailError(error.message)) {
          const trimmedEmail = email.trim();
          setPendingUnconfirmedEmailState(trimmedEmail);
          writePendingUnconfirmedEmail(trimmedEmail);
          setIsEmailBannerDismissed(false);
        }
        return { error: error.message };
      }

      setPendingUnconfirmedEmailState(null);
      writePendingUnconfirmedEmail(null);
      return { error: null };
    },
    []
  );

  const resetPassword = useCallback(
    async (email: string) => {
      if (!isSupabaseConfigured || !supabase) {
        return { error: 'Cloud sync is not configured yet.' };
      }

      const redirectTo = getAuthRedirectUrl();

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      return { error: error?.message ?? null };
    },
    []
  );

  const updatePassword = useCallback(
    async (newPassword: string) => {
      if (!isSupabaseConfigured || !supabase) {
        return { error: 'Cloud sync is not configured yet.' };
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      return { error: error?.message ?? null };
    },
    []
  );

  const updateEmail = useCallback(
    async (newEmail: string) => {
      if (!isSupabaseConfigured || !supabase) {
        return { error: 'Cloud sync is not configured yet.', confirmationRequired: false };
      }

      const emailRedirectTo = getAuthRedirectUrl();

      const { data, error } = await supabase.auth.updateUser(
        { email: newEmail },
        {
          emailRedirectTo,
        }
      );

      if (error) {
        return { error: error.message, confirmationRequired: false };
      }

      const confirmationRequired = Boolean(data.user?.new_email);
      if (confirmationRequired) {
        const trimmedEmail = newEmail.trim();
        setPendingUnconfirmedEmailState(trimmedEmail);
        writePendingUnconfirmedEmail(trimmedEmail);
        setIsEmailBannerDismissed(false);
      }
      return { error: null, confirmationRequired };
    },
    []
  );

  const resendConfirmationEmail = useCallback(
    async (targetEmail?: string) => {
      const emailToSend = (targetEmail || unconfirmedEmail || user?.email || '').trim();
      if (!emailToSend) {
        return { error: 'No email address specified.' };
      }

      if (!isSupabaseConfigured || !supabase) {
        return { error: 'Cloud sync is not configured yet.' };
      }

      const emailRedirectTo = getAuthRedirectUrl();

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailToSend,
        options: {
          emailRedirectTo,
        },
      });

      return { error: error?.message ?? null };
    },
    [unconfirmedEmail, user?.email]
  );

  const signOut = useCallback(async () => {
    setPendingUnconfirmedEmailState(null);
    writePendingUnconfirmedEmail(null);
    setIsEmailBannerDismissed(false);
    clearRemoteSyncMetadata();

    if (!isSupabaseConfigured || !supabase) {
      return { error: null };
    }

    const { error } = await supabase.auth.signOut();
    return { error: error?.message ?? null };
  }, []);

  const value = useMemo<RemoteAuthContextType>(
    () => ({
      user,
      session,
      isLoading,
      isConfigured: isSupabaseConfigured,
      isPromptDismissed,
      isPasswordRecovery,
      unconfirmedEmail,
      isEmailBannerDismissed,
      dismissEmailBanner,
      resetEmailBanner,
      setPendingUnconfirmedEmail,
      dismissPrompt,
      resetPrompt,
      signInWithGoogle,
      signUpWithEmail,
      signInWithPassword,
      resetPassword,
      updatePassword,
      updateEmail,
      resendConfirmationEmail,
      clearPasswordRecovery,
      signOut,
    }),
    [
      clearPasswordRecovery,
      dismissEmailBanner,
      dismissPrompt,
      isEmailBannerDismissed,
      isLoading,
      isPasswordRecovery,
      isPromptDismissed,
      resendConfirmationEmail,
      resetEmailBanner,
      resetPassword,
      resetPrompt,
      session,
      setPendingUnconfirmedEmail,
      signInWithGoogle,
      signInWithPassword,
      signOut,
      signUpWithEmail,
      unconfirmedEmail,
      updateEmail,
      updatePassword,
      user,
    ]
  );

  return <RemoteAuthContext.Provider value={value}>{children}</RemoteAuthContext.Provider>;
};

export const useRemoteAuth = () => {
  const context = useContext(RemoteAuthContext);
  if (!context) {
    throw new Error('useRemoteAuth must be used within a RemoteAuthProvider');
  }
  return context;
};
