import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';
import type { JourneyIntake, JourneyIntakeInsert, JourneyIntakeUpdate } from '../types';

export function useJourneyIntakes(journeyId: string) {
  const [intakes, setIntakes] = useState<JourneyIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchIntakes = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getSupabase()
      .from('journey_intakes')
      .select('*')
      .eq('journey_id', journeyId)
      .order('version', { ascending: true });

    if (fetchError) {
      setError(fetchError);
    } else {
      setIntakes(data || []);
    }
    setLoading(false);
  }, [journeyId]);

  const createIntake = useCallback(async (
    rawContent: string,
    refinedContent?: string
  ): Promise<JourneyIntake> => {
    // Calculate next version
    const nextVersion = intakes.length > 0
      ? Math.max(...intakes.map(i => i.version)) + 1
      : 1;

    const intake: JourneyIntakeInsert = {
      journey_id: journeyId,
      raw_content: rawContent,
      refined_content: refinedContent || null,
      version: nextVersion,
    };

    const { data, error: createError } = await getSupabase()
      .from('journey_intakes')
      .insert(intake)
      .select()
      .single();

    if (createError) throw createError;
    if (!data) throw new Error('No data returned from insert');

    setIntakes(prev => [...prev, data]);
    return data;
  }, [journeyId, intakes]);

  const updateIntake = useCallback(async (id: string, updates: JourneyIntakeUpdate): Promise<JourneyIntake> => {
    const { data, error: updateError } = await getSupabase()
      .from('journey_intakes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    if (!data) throw new Error('No data returned from update');

    setIntakes(prev => prev.map(i => i.id === id ? data : i));
    return data;
  }, []);

  const deleteIntake = useCallback(async (id: string): Promise<void> => {
    const { error: deleteError } = await getSupabase()
      .from('journey_intakes')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    setIntakes(prev => prev.filter(i => i.id !== id));
  }, []);

  // Get the latest intake
  const getLatestIntake = useCallback(() => {
    if (intakes.length === 0) return null;
    return intakes.reduce((latest, current) =>
      current.version > latest.version ? current : latest
    );
  }, [intakes]);

  useEffect(() => {
    if (journeyId) {
      fetchIntakes();
    }
  }, [journeyId, fetchIntakes]);

  return {
    intakes,
    loading,
    error,
    createIntake,
    updateIntake,
    deleteIntake,
    getLatestIntake,
    refetch: fetchIntakes,
  };
}
