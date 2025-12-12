import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';
import type { Journey, JourneyInsert, JourneyUpdate, JourneyStage, JourneyType } from '../types';
import { getInitialStage } from '../types';

export function useJourneys(projectId?: string) {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchJourneys = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = getSupabase()
      .from('journeys')
      .select('*')
      .order('sort_order', { ascending: true })
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
    // Set initial stage based on type if not provided
    const type = journey.type || 'feature';
    const journeyWithDefaults: JourneyInsert = {
      ...journey,
      type,
      stage: journey.stage || getInitialStage(type),
    };

    const { data, error: createError } = await getSupabase()
      .from('journeys')
      .insert(journeyWithDefaults)
      .select()
      .single();

    if (createError) throw createError;
    if (!data) throw new Error('No data returned from insert');

    setJourneys(prev => [data, ...prev]);
    return data;
  }, []);

  const updateJourney = useCallback(async (id: string, updates: JourneyUpdate): Promise<Journey> => {
    const { data, error: updateError } = await getSupabase()
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
    const { error: deleteError } = await getSupabase()
      .from('journeys')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    setJourneys(prev => prev.filter(j => j.id !== id));
  }, []);

  // Update journey stage
  const updateStage = useCallback(async (id: string, stage: JourneyStage): Promise<Journey> => {
    return updateJourney(id, { stage });
  }, [updateJourney]);

  // Update journey type (will also reset stage to initial for that type)
  const updateType = useCallback(async (id: string, type: JourneyType): Promise<Journey> => {
    return updateJourney(id, {
      type,
      stage: getInitialStage(type),
    });
  }, [updateJourney]);

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

  // Update sort order for drag-and-drop reordering
  const updateSortOrder = useCallback(async (id: string, sortOrder: number): Promise<Journey> => {
    return updateJourney(id, { sort_order: sortOrder });
  }, [updateJourney]);

  // Get journeys that are ready to work on (no blocking dependencies)
  const getReadyJourneys = useCallback(() => {
    return journeys.filter(j => {
      if (!j.can_parallelize) return false;
      if (!j.depends_on_journey_id) return true;

      const dependency = journeys.find(d => d.id === j.depends_on_journey_id);
      if (!dependency) return true;

      // Check if dependency is in a "done" stage
      const doneStages = ['complete', 'deployed', 'approved'];
      return doneStages.includes(dependency.stage);
    });
  }, [journeys]);

  // Get child journeys of a parent
  const getChildJourneys = useCallback((parentId: string) => {
    return journeys.filter(j => j.parent_journey_id === parentId);
  }, [journeys]);

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
    updateStage,
    updateType,
    startJourney,
    updateSortOrder,
    getReadyJourneys,
    getChildJourneys,
    refetch: fetchJourneys,
  };
}
