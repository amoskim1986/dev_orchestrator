import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';
import type { JourneySpec, JourneySpecInsert } from '../types';

export function useJourneySpec(journeyId: string) {
  const [spec, setSpec] = useState<JourneySpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSpec = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getSupabase()
      .from('journey_specs')
      .select('*')
      .eq('journey_id', journeyId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine for a new journey
      setError(fetchError);
    } else {
      setSpec(data || null);
    }
    setLoading(false);
  }, [journeyId]);

  const createOrUpdateSpec = useCallback(async (content: string): Promise<JourneySpec> => {
    if (spec) {
      // Update existing
      const { data, error: updateError } = await getSupabase()
        .from('journey_specs')
        .update({
          content,
          version: spec.version + 1
        })
        .eq('id', spec.id)
        .select()
        .single();

      if (updateError) throw updateError;
      if (!data) throw new Error('No data returned from update');

      setSpec(data);
      return data;
    } else {
      // Create new
      const newSpec: JourneySpecInsert = {
        journey_id: journeyId,
        content,
        version: 1,
      };

      const { data, error: createError } = await getSupabase()
        .from('journey_specs')
        .insert(newSpec)
        .select()
        .single();

      if (createError) throw createError;
      if (!data) throw new Error('No data returned from insert');

      setSpec(data);
      return data;
    }
  }, [journeyId, spec]);

  const deleteSpec = useCallback(async (): Promise<void> => {
    if (!spec) return;

    const { error: deleteError } = await getSupabase()
      .from('journey_specs')
      .delete()
      .eq('id', spec.id);

    if (deleteError) throw deleteError;
    setSpec(null);
  }, [spec]);

  useEffect(() => {
    if (journeyId) {
      fetchSpec();
    }
  }, [journeyId, fetchSpec]);

  return {
    spec,
    loading,
    error,
    createOrUpdateSpec,
    deleteSpec,
    refetch: fetchSpec,
  };
}
