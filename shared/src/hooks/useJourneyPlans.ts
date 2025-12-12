import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';
import type { JourneyPlan, JourneyPlanInsert } from '../types';

export function useJourneyPlan(journeyId: string) {
  const [plan, setPlan] = useState<JourneyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getSupabase()
      .from('journey_plans')
      .select('*')
      .eq('journey_id', journeyId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine for a new journey
      setError(fetchError);
    } else {
      setPlan(data || null);
    }
    setLoading(false);
  }, [journeyId]);

  const createOrUpdatePlan = useCallback(async (
    content: Record<string, unknown>,
    aiGenerated: boolean = false
  ): Promise<JourneyPlan> => {
    if (plan) {
      // Update existing
      const { data, error: updateError } = await getSupabase()
        .from('journey_plans')
        .update({ content, ai_generated: aiGenerated })
        .eq('id', plan.id)
        .select()
        .single();

      if (updateError) throw updateError;
      if (!data) throw new Error('No data returned from update');

      setPlan(data);
      return data;
    } else {
      // Create new
      const newPlan: JourneyPlanInsert = {
        journey_id: journeyId,
        content,
        ai_generated: aiGenerated,
      };

      const { data, error: createError } = await getSupabase()
        .from('journey_plans')
        .insert(newPlan)
        .select()
        .single();

      if (createError) throw createError;
      if (!data) throw new Error('No data returned from insert');

      setPlan(data);
      return data;
    }
  }, [journeyId, plan]);

  const deletePlan = useCallback(async (): Promise<void> => {
    if (!plan) return;

    const { error: deleteError } = await getSupabase()
      .from('journey_plans')
      .delete()
      .eq('id', plan.id);

    if (deleteError) throw deleteError;
    setPlan(null);
  }, [plan]);

  useEffect(() => {
    if (journeyId) {
      fetchPlan();
    }
  }, [journeyId, fetchPlan]);

  return {
    plan,
    loading,
    error,
    createOrUpdatePlan,
    deletePlan,
    refetch: fetchPlan,
  };
}
