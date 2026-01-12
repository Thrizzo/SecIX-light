import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/database/client';

export type JourneyMode = 'startup' | 'advanced';

export interface JourneyProgress {
  id: string;
  user_id: string;
  journey_mode: JourneyMode;
  current_step: number;
  completed_steps: number[];
  journey_completed: boolean;
  journey_completed_at: string | null;
}

interface JourneyContextType {
  journeyProgress: JourneyProgress | null;
  isLoading: boolean;
  isJourneyComplete: boolean;
  isStartupMode: boolean;
  currentStep: number;
  completedSteps: number[];
  journeyMode: JourneyMode | null;
  setJourneyMode: (mode: JourneyMode) => Promise<void>;
  switchMode: (mode: JourneyMode) => Promise<void>;
  completeStep: (stepId: number) => Promise<void>;
  skipStep: (stepId: number) => Promise<void>;
  goToStep: (stepId: number) => Promise<void>;
  completeJourney: () => Promise<void>;
  resetJourney: () => Promise<void>;
  reopenJourney: () => Promise<void>;
  refetch: () => Promise<void>;
}

const JourneyContext = createContext<JourneyContextType | undefined>(undefined);

export const JOURNEY_STEPS = [
  { id: 0, name: 'Welcome', description: 'Choose your experience mode' },
  { id: 1, name: 'Governance', description: 'Company profile, scope statement, policies', route: '/dashboard/governance' },
  { id: 2, name: 'Asset Management', description: 'Primary & secondary assets inventory', route: '/dashboard/assets' },
  { id: 3, name: 'Risk Management', description: 'Risk register, appetite, treatments', route: '/dashboard/risks' },
  { id: 4, name: 'Control Library', description: 'Internal controls & framework mappings', route: '/dashboard/controls' },
  { id: 5, name: 'Vendor Management', description: 'Third-party risk management', route: '/dashboard/vendors' },
  { id: 6, name: 'Business Continuity', description: 'BIA and continuity planning', route: '/dashboard/continuity/bia' },
  { id: 7, name: 'Data Protection', description: 'Confidentiality levels', route: '/dashboard/data-protection' },
  { id: 8, name: 'Maturity Assessment', description: 'Capability maturity tracking', route: '/dashboard/maturity' },
  { id: 9, name: 'Security Operations', description: 'Security tools, SIRT, threats', route: '/dashboard/security-ops', advancedOnly: true },
  { id: 10, name: 'AI Governance', description: 'AI asset register', route: '/dashboard/ai-governance' },
  { id: 11, name: 'Data Forge', description: 'Import/export capabilities', route: '/dashboard/data-forge' },
  { id: 12, name: 'Completion', description: 'Summary and next steps' },
];

// Type for the raw data from the database
interface JourneyProgressRow {
  id: string;
  user_id: string;
  journey_mode: JourneyMode;
  current_step: number;
  completed_steps: number[] | null;
  journey_completed: boolean;
  journey_completed_at: string | null;
}

const isMissingJourneyTableError = (err: unknown) => {
  const msg = (err as any)?.message ? String((err as any).message) : String(err);
  return msg.includes('does not exist') && msg.includes('user_journey_progress');
};

export const JourneyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [journeyProgress, setJourneyProgress] = useState<JourneyProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const parseProgress = (row: JourneyProgressRow | null): JourneyProgress | null => {
    if (!row) return null;
    return {
      ...row,
      completed_steps: Array.isArray(row.completed_steps) ? row.completed_steps : [],
    };
  };

  const fetchProgress = useCallback(async () => {
    if (!user) {
      setJourneyProgress(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await db
        .from('user_journey_progress')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setJourneyProgress(parseProgress(data as JourneyProgressRow | null));
    } catch (err) {
      if (isMissingJourneyTableError(err)) {
        setJourneyProgress(null);
      } else {
        console.error('Error fetching journey progress:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const setJourneyMode = async (mode: JourneyMode) => {
    if (!user) return;

    try {
      const { data, error } = await db
        .from('user_journey_progress')
        .upsert({
          user_id: user.id,
          journey_mode: mode,
          current_step: 1,
          completed_steps: [0],
        }, { onConflict: 'user_id' })
        .select()
        .maybeSingle();

      if (error) throw error;
      setJourneyProgress(parseProgress(data as JourneyProgressRow | null));
    } catch (err) {
      if (isMissingJourneyTableError(err)) {
        setJourneyProgress(null);
        return;
      }
      console.error('Error setting journey mode:', err);
    }
  };

  const switchMode = async (mode: JourneyMode) => {
    if (!user || !journeyProgress) return;

    try {
      const { data, error } = await db
        .from('user_journey_progress')
        .update({ journey_mode: mode })
        .eq('user_id', user.id)
        .select()
        .maybeSingle();

      if (error) throw error;
      setJourneyProgress(parseProgress(data as JourneyProgressRow | null));
    } catch (err) {
      if (isMissingJourneyTableError(err)) {
        setJourneyProgress(null);
        return;
      }
      console.error('Error switching journey mode:', err);
    }
  };

  const completeStep = async (stepId: number) => {
    if (!user || !journeyProgress) return;

    const newCompletedSteps = [...new Set([...journeyProgress.completed_steps, stepId])];
    const nextStep = Math.min(stepId + 1, JOURNEY_STEPS.length - 1);

    try {
      const { data, error } = await db
        .from('user_journey_progress')
        .update({
          completed_steps: newCompletedSteps,
          current_step: nextStep,
        })
        .eq('user_id', user.id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setJourneyProgress({
          ...(data as JourneyProgressRow),
          completed_steps: newCompletedSteps,
        });
      }
    } catch (err) {
      if (isMissingJourneyTableError(err)) {
        return;
      }
      console.error('Error completing step:', err);
    }
  };

  const skipStep = async (stepId: number) => {
    await completeStep(stepId);
  };

  const goToStep = async (stepId: number) => {
    if (!user || !journeyProgress) return;

    try {
      const { data, error } = await db
        .from('user_journey_progress')
        .update({ current_step: stepId })
        .eq('user_id', user.id)
        .select()
        .maybeSingle();

      if (error) throw error;
      setJourneyProgress(parseProgress(data as JourneyProgressRow | null));
    } catch (err) {
      if (isMissingJourneyTableError(err)) {
        return;
      }
      console.error('Error navigating to step:', err);
    }
  };

  const completeJourney = async () => {
    if (!user || !journeyProgress) return;

    try {
      const { data, error } = await db
        .from('user_journey_progress')
        .update({
          journey_completed: true,
          journey_completed_at: new Date().toISOString(),
          completed_steps: JOURNEY_STEPS.map(s => s.id),
        })
        .eq('user_id', user.id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setJourneyProgress({
          ...(data as JourneyProgressRow),
          completed_steps: JOURNEY_STEPS.map(s => s.id),
        });
      }
    } catch (err) {
      if (isMissingJourneyTableError(err)) {
        return;
      }
      console.error('Error completing journey:', err);
    }
  };

  const resetJourney = async () => {
    if (!user) return;

    try {
      const { error } = await db
        .from('user_journey_progress')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setJourneyProgress(null);
    } catch (err) {
      if (isMissingJourneyTableError(err)) {
        return;
      }
      console.error('Error resetting journey:', err);
    }
  };

  const reopenJourney = async () => {
    if (!user || !journeyProgress) return;

    try {
      const { data, error } = await db
        .from('user_journey_progress')
        .update({
          journey_completed: false,
          journey_completed_at: null,
        })
        .eq('user_id', user.id)
        .select()
        .maybeSingle();

      if (error) throw error;
      setJourneyProgress(parseProgress(data as JourneyProgressRow | null));
    } catch (err) {
      if (isMissingJourneyTableError(err)) {
        return;
      }
      console.error('Error reopening journey:', err);
    }
  };

  const isJourneyComplete = journeyProgress?.journey_completed ?? false;
  const isStartupMode = journeyProgress?.journey_mode === 'startup';
  const currentStep = journeyProgress?.current_step ?? 0;
  const completedSteps = journeyProgress?.completed_steps ?? [];
  const journeyMode = journeyProgress?.journey_mode ?? null;

  return (
    <JourneyContext.Provider
      value={{
        journeyProgress,
        isLoading,
        isJourneyComplete,
        isStartupMode,
        currentStep,
        completedSteps,
        journeyMode,
        setJourneyMode,
        switchMode,
        completeStep,
        skipStep,
        goToStep,
        completeJourney,
        resetJourney,
        reopenJourney,
        refetch: fetchProgress,
      }}
    >
      {children}
    </JourneyContext.Provider>
  );
};

export const useJourney = () => {
  const context = useContext(JourneyContext);
  if (context === undefined) {
    throw new Error('useJourney must be used within a JourneyProvider');
  }
  return context;
};
