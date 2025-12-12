import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';
import type { JourneyLink, JourneyLinkInsert, JourneyRelationship } from '../types';

export function useJourneyLinks(journeyId: string) {
  const [outgoingLinks, setOutgoingLinks] = useState<JourneyLink[]>([]);
  const [incomingLinks, setIncomingLinks] = useState<JourneyLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Fetch outgoing links (this journey -> others)
    const { data: outgoing, error: outError } = await getSupabase()
      .from('journey_links')
      .select('*')
      .eq('from_journey_id', journeyId);

    // Fetch incoming links (others -> this journey)
    const { data: incoming, error: inError } = await getSupabase()
      .from('journey_links')
      .select('*')
      .eq('to_journey_id', journeyId);

    if (outError) {
      setError(outError);
    } else if (inError) {
      setError(inError);
    } else {
      setOutgoingLinks(outgoing || []);
      setIncomingLinks(incoming || []);
    }
    setLoading(false);
  }, [journeyId]);

  const createLink = useCallback(async (
    toJourneyId: string,
    relationship: JourneyRelationship
  ): Promise<JourneyLink> => {
    const link: JourneyLinkInsert = {
      from_journey_id: journeyId,
      to_journey_id: toJourneyId,
      relationship,
    };

    const { data, error: createError } = await getSupabase()
      .from('journey_links')
      .insert(link)
      .select()
      .single();

    if (createError) throw createError;
    if (!data) throw new Error('No data returned from insert');

    setOutgoingLinks(prev => [...prev, data]);
    return data;
  }, [journeyId]);

  const deleteLink = useCallback(async (
    toJourneyId: string,
    relationship: JourneyRelationship
  ): Promise<void> => {
    const { error: deleteError } = await getSupabase()
      .from('journey_links')
      .delete()
      .eq('from_journey_id', journeyId)
      .eq('to_journey_id', toJourneyId)
      .eq('relationship', relationship);

    if (deleteError) throw deleteError;
    setOutgoingLinks(prev => prev.filter(l =>
      !(l.to_journey_id === toJourneyId && l.relationship === relationship)
    ));
  }, [journeyId]);

  // Get links by relationship type
  const getLinksByRelationship = useCallback((relationship: JourneyRelationship) => {
    return {
      outgoing: outgoingLinks.filter(l => l.relationship === relationship),
      incoming: incomingLinks.filter(l => l.relationship === relationship),
    };
  }, [outgoingLinks, incomingLinks]);

  // Check if this journey was spawned from another
  const getSpawnedFrom = useCallback(() => {
    const link = outgoingLinks.find(l => l.relationship === 'spawned_from');
    return link?.to_journey_id || null;
  }, [outgoingLinks]);

  // Get journeys that block this one
  const getBlockers = useCallback(() => {
    return incomingLinks
      .filter(l => l.relationship === 'blocks')
      .map(l => l.from_journey_id);
  }, [incomingLinks]);

  // Get journeys this one depends on
  const getDependencies = useCallback(() => {
    return outgoingLinks
      .filter(l => l.relationship === 'depends_on')
      .map(l => l.to_journey_id);
  }, [outgoingLinks]);

  useEffect(() => {
    if (journeyId) {
      fetchLinks();
    }
  }, [journeyId, fetchLinks]);

  return {
    outgoingLinks,
    incomingLinks,
    loading,
    error,
    createLink,
    deleteLink,
    getLinksByRelationship,
    getSpawnedFrom,
    getBlockers,
    getDependencies,
    refetch: fetchLinks,
  };
}
