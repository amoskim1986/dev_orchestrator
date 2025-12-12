import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';
import type { JourneyChecklist, JourneyChecklistInsert, JourneyChecklistUpdate, ChecklistItem } from '../types';

export function useJourneyChecklists(journeyId: string) {
  const [checklists, setChecklists] = useState<JourneyChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchChecklists = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getSupabase()
      .from('journey_checklists')
      .select('*')
      .eq('journey_id', journeyId)
      .order('sort_order', { ascending: true });

    if (fetchError) {
      setError(fetchError);
    } else {
      setChecklists(data || []);
    }
    setLoading(false);
  }, [journeyId]);

  const createChecklist = useCallback(async (
    legName: string,
    items: ChecklistItem[] = []
  ): Promise<JourneyChecklist> => {
    const nextOrder = checklists.length > 0
      ? Math.max(...checklists.map(c => c.sort_order)) + 1
      : 0;

    const checklist: JourneyChecklistInsert = {
      journey_id: journeyId,
      leg_name: legName,
      items,
      is_active: checklists.length === 0, // First checklist is active by default
      sort_order: nextOrder,
    };

    const { data, error: createError } = await getSupabase()
      .from('journey_checklists')
      .insert(checklist)
      .select()
      .single();

    if (createError) throw createError;
    if (!data) throw new Error('No data returned from insert');

    setChecklists(prev => [...prev, data]);
    return data;
  }, [journeyId, checklists]);

  const updateChecklist = useCallback(async (id: string, updates: JourneyChecklistUpdate): Promise<JourneyChecklist> => {
    const { data, error: updateError } = await getSupabase()
      .from('journey_checklists')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    if (!data) throw new Error('No data returned from update');

    setChecklists(prev => prev.map(c => c.id === id ? data : c));
    return data;
  }, []);

  const deleteChecklist = useCallback(async (id: string): Promise<void> => {
    const { error: deleteError } = await getSupabase()
      .from('journey_checklists')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    setChecklists(prev => prev.filter(c => c.id !== id));
  }, []);

  // Set a checklist as active (deactivates others)
  const setActiveChecklist = useCallback(async (id: string): Promise<void> => {
    // Deactivate all others
    await getSupabase()
      .from('journey_checklists')
      .update({ is_active: false })
      .eq('journey_id', journeyId)
      .neq('id', id);

    // Activate this one
    await getSupabase()
      .from('journey_checklists')
      .update({ is_active: true })
      .eq('id', id);

    setChecklists(prev => prev.map(c => ({
      ...c,
      is_active: c.id === id,
    })));
  }, [journeyId]);

  // Toggle a checklist item done/undone
  const toggleItem = useCallback(async (checklistId: string, itemIndex: number): Promise<JourneyChecklist> => {
    const checklist = checklists.find(c => c.id === checklistId);
    if (!checklist) throw new Error('Checklist not found');

    const newItems = [...checklist.items];
    const item = newItems[itemIndex];
    if (!item) throw new Error('Item not found');

    newItems[itemIndex] = {
      ...item,
      done: !item.done,
      done_at: !item.done ? new Date().toISOString() : undefined,
    };

    return updateChecklist(checklistId, { items: newItems });
  }, [checklists, updateChecklist]);

  // Add an item to a checklist
  const addItem = useCallback(async (
    checklistId: string,
    item: ChecklistItem
  ): Promise<JourneyChecklist> => {
    const checklist = checklists.find(c => c.id === checklistId);
    if (!checklist) throw new Error('Checklist not found');

    const newItems = [...checklist.items, item];
    return updateChecklist(checklistId, { items: newItems });
  }, [checklists, updateChecklist]);

  // Remove an item from a checklist
  const removeItem = useCallback(async (checklistId: string, itemIndex: number): Promise<JourneyChecklist> => {
    const checklist = checklists.find(c => c.id === checklistId);
    if (!checklist) throw new Error('Checklist not found');

    const newItems = checklist.items.filter((_, i) => i !== itemIndex);
    return updateChecklist(checklistId, { items: newItems });
  }, [checklists, updateChecklist]);

  // Get the active checklist
  const getActiveChecklist = useCallback(() => {
    return checklists.find(c => c.is_active) || null;
  }, [checklists]);

  // Get completion percentage for a checklist
  const getCompletionPercentage = useCallback((checklistId: string) => {
    const checklist = checklists.find(c => c.id === checklistId);
    if (!checklist || checklist.items.length === 0) return 0;

    const completed = checklist.items.filter(i => i.done).length;
    return Math.round((completed / checklist.items.length) * 100);
  }, [checklists]);

  useEffect(() => {
    if (journeyId) {
      fetchChecklists();
    }
  }, [journeyId, fetchChecklists]);

  return {
    checklists,
    loading,
    error,
    createChecklist,
    updateChecklist,
    deleteChecklist,
    setActiveChecklist,
    toggleItem,
    addItem,
    removeItem,
    getActiveChecklist,
    getCompletionPercentage,
    refetch: fetchChecklists,
  };
}
