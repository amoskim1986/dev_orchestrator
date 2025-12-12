import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';
import type { ProjectTarget, ProjectTargetInsert, ProjectTargetUpdate } from '../types';

export function useProjectTargets(projectId: string) {
  const [targets, setTargets] = useState<ProjectTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getSupabase()
      .from('project_targets')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true });

    if (fetchError) {
      setError(fetchError);
    } else {
      setTargets(data || []);
    }
    setLoading(false);
  }, [projectId]);

  const createTarget = useCallback(async (target: Omit<ProjectTargetInsert, 'project_id'>): Promise<ProjectTarget> => {
    const { data, error: createError } = await getSupabase()
      .from('project_targets')
      .insert({ ...target, project_id: projectId })
      .select()
      .single();

    if (createError) throw createError;
    if (!data) throw new Error('No data returned from insert');

    setTargets(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
    return data;
  }, [projectId]);

  const updateTarget = useCallback(async (id: string, updates: ProjectTargetUpdate): Promise<ProjectTarget> => {
    const { data, error: updateError } = await getSupabase()
      .from('project_targets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    if (!data) throw new Error('No data returned from update');

    setTargets(prev => prev.map(t => t.id === id ? data : t));
    return data;
  }, []);

  const deleteTarget = useCallback(async (id: string): Promise<void> => {
    const { error: deleteError } = await getSupabase()
      .from('project_targets')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    setTargets(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchTargets();
    }
  }, [projectId, fetchTargets]);

  return {
    targets,
    loading,
    error,
    createTarget,
    updateTarget,
    deleteTarget,
    refetch: fetchTargets,
  };
}
