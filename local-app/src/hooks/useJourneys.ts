import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Journey, JourneyInsert, JourneyUpdate } from '../types';

export function useJourneys(projectId?: string) {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchJourneys = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('journeys')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError);
    } else {
      setJourneys(data || []);
    }
    setLoading(false);
  }, [projectId]);

  const createJourney = useCallback(async (journey: JourneyInsert): Promise<Journey> => {
    const { data, error: createError } = await supabase
      .from('journeys')
      .insert(journey)
      .select()
      .single();

    if (createError) throw createError;
    if (!data) throw new Error('No data returned from insert');

    setJourneys(prev => [data, ...prev]);
    return data;
  }, []);

  const updateJourney = useCallback(async (id: string, updates: JourneyUpdate): Promise<Journey> => {
    const { data, error: updateError } = await supabase
      .from('journeys')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    if (!data) throw new Error('No data returned from update');

    setJourneys(prev => prev.map(j => j.id === id ? data : j));
    return data;
  }, []);

  const deleteJourney = useCallback(async (id: string): Promise<void> => {
    const { error: deleteError } = await supabase
      .from('journeys')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    setJourneys(prev => prev.filter(j => j.id !== id));
  }, []);

  // Start a journey: sets branch_name and worktree_path
  const startJourney = useCallback(async (
    id: string,
    branchName: string,
    worktreePath: string
  ): Promise<Journey> => {
    return updateJourney(id, {
      branch_name: branchName,
      worktree_path: worktreePath,
    });
  }, [updateJourney]);

  useEffect(() => {
    fetchJourneys();
  }, [fetchJourneys]);

  return {
    journeys,
    loading,
    error,
    createJourney,
    updateJourney,
    deleteJourney,
    startJourney,
    refetch: fetchJourneys,
  };
}
