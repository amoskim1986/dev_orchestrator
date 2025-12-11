import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';
import type { Project, ProjectInsert, ProjectUpdate } from '../types';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getSupabase()
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError);
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  }, []);

  const createProject = useCallback(async (project: ProjectInsert): Promise<Project> => {
    const { data, error: createError } = await getSupabase()
      .from('projects')
      .insert(project)
      .select()
      .single();

    if (createError) throw createError;
    if (!data) throw new Error('No data returned from insert');

    setProjects(prev => [data, ...prev]);
    return data;
  }, []);

  const updateProject = useCallback(async (id: string, updates: ProjectUpdate): Promise<Project> => {
    const { data, error: updateError } = await getSupabase()
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    if (!data) throw new Error('No data returned from update');

    setProjects(prev => prev.map(p => p.id === id ? data : p));
    return data;
  }, []);

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    const { error: deleteError } = await getSupabase()
      .from('projects')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    refetch: fetchProjects,
  };
}
