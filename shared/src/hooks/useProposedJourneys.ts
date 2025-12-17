import { useCallback, useMemo } from 'react';
import type {
  Project,
  ProposedProjectJourney,
  ProposedJourneyInsert,
  ProposedJourneyUpdate,
  ProposedJourneyStatus,
} from '../types';

interface UseProposedJourneysOptions {
  project: Project;
  onProjectUpdate: (updates: { proposed_project_journeys: ProposedProjectJourney[] }) => Promise<unknown>;
  journeyIds?: string[];
}

export function useProposedJourneys({
  project,
  onProjectUpdate,
  journeyIds = [],
}: UseProposedJourneysOptions) {
  const proposals = useMemo(
    () => project.proposed_project_journeys || [],
    [project.proposed_project_journeys]
  );

  const saveProposals = useCallback(
    async (newProposals: ProposedProjectJourney[]) => {
      await onProjectUpdate({ proposed_project_journeys: newProposals });
    },
    [onProjectUpdate]
  );

  const addProposal = useCallback(
    async (proposal: ProposedJourneyInsert): Promise<ProposedProjectJourney> => {
      const now = new Date().toISOString();
      const newProposal: ProposedProjectJourney = {
        id: crypto.randomUUID(),
        name: proposal.name,
        description: proposal.description,
        early_plan: proposal.early_plan,
        status: proposal.status,
        generated_journey_id: proposal.generated_journey_id ?? null,
        sort_order: proposal.sort_order ?? proposals.length,
        created_at: now,
        updated_at: now,
        cancelled_at: proposal.cancelled_at ?? null,
      };

      const updated = [...proposals, newProposal];
      await saveProposals(updated);
      return newProposal;
    },
    [proposals, saveProposals]
  );

  const addProposals = useCallback(
    async (newProposals: ProposedJourneyInsert[]): Promise<ProposedProjectJourney[]> => {
      const now = new Date().toISOString();
      const startOrder = proposals.length;

      const created = newProposals.map(
        (p, i): ProposedProjectJourney => ({
          id: crypto.randomUUID(),
          name: p.name,
          description: p.description,
          early_plan: p.early_plan,
          status: p.status,
          generated_journey_id: p.generated_journey_id ?? null,
          sort_order: startOrder + i,
          created_at: now,
          updated_at: now,
          cancelled_at: null,
        })
      );

      const updated = [...proposals, ...created];
      await saveProposals(updated);
      return created;
    },
    [proposals, saveProposals]
  );

  const replaceAllProposals = useCallback(
    async (newProposals: ProposedJourneyInsert[]): Promise<ProposedProjectJourney[]> => {
      const now = new Date().toISOString();

      const created = newProposals.map(
        (p, i): ProposedProjectJourney => ({
          id: crypto.randomUUID(),
          name: p.name,
          description: p.description,
          early_plan: p.early_plan,
          status: p.status,
          generated_journey_id: p.generated_journey_id ?? null,
          sort_order: i,
          created_at: now,
          updated_at: now,
          cancelled_at: null,
        })
      );

      await saveProposals(created);
      return created;
    },
    [saveProposals]
  );

  const updateProposal = useCallback(
    async (id: string, updates: ProposedJourneyUpdate): Promise<ProposedProjectJourney | null> => {
      const index = proposals.findIndex((p) => p.id === id);
      if (index === -1) return null;

      const updated = [...proposals];
      updated[index] = {
        ...updated[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };

      await saveProposals(updated);
      return updated[index];
    },
    [proposals, saveProposals]
  );

  const deleteProposal = useCallback(
    async (id: string): Promise<void> => {
      const updated = proposals.filter((p) => p.id !== id);
      await saveProposals(updated);
    },
    [proposals, saveProposals]
  );

  const toggleReject = useCallback(
    async (id: string): Promise<ProposedProjectJourney | null> => {
      const proposal = proposals.find((p) => p.id === id);
      if (!proposal) return null;

      const newStatus: ProposedJourneyStatus =
        proposal.status === 'rejected' ? 'draft' : 'rejected';

      return updateProposal(id, { status: newStatus });
    },
    [proposals, updateProposal]
  );

  const togglePunt = useCallback(
    async (id: string): Promise<ProposedProjectJourney | null> => {
      const proposal = proposals.find((p) => p.id === id);
      if (!proposal) return null;

      const newStatus: ProposedJourneyStatus =
        proposal.status === 'punted' ? 'draft' : 'punted';

      return updateProposal(id, { status: newStatus });
    },
    [proposals, updateProposal]
  );

  const toggleCompleted = useCallback(
    async (id: string): Promise<ProposedProjectJourney | null> => {
      const proposal = proposals.find((p) => p.id === id);
      if (!proposal) return null;

      const newStatus: ProposedJourneyStatus =
        proposal.status === 'already_completed' ? 'draft' : 'already_completed';

      return updateProposal(id, { status: newStatus });
    },
    [proposals, updateProposal]
  );

  const resetToDraft = useCallback(
    async (id: string): Promise<ProposedProjectJourney | null> => {
      return updateProposal(id, { status: 'draft', cancelled_at: null });
    },
    [updateProposal]
  );

  const cleanupOrphanedReferences = useCallback(async (): Promise<number> => {
    const journeyIdSet = new Set(journeyIds);
    let cleanedCount = 0;

    const updated = proposals.map((proposal) => {
      if (
        proposal.generated_journey_id &&
        proposal.status === 'generated' &&
        !journeyIdSet.has(proposal.generated_journey_id)
      ) {
        cleanedCount++;
        return {
          ...proposal,
          status: 'cancelled' as ProposedJourneyStatus,
          generated_journey_id: null,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      return proposal;
    });

    if (cleanedCount > 0) {
      await saveProposals(updated);
    }

    return cleanedCount;
  }, [proposals, journeyIds, saveProposals]);

  const getProposalsByStatus = useCallback(
    (status: ProposedJourneyStatus | 'all') => {
      if (status === 'all') return proposals;
      return proposals.filter((p) => p.status === status);
    },
    [proposals]
  );

  const reorderProposals = useCallback(
    async (orderedIds: string[]): Promise<void> => {
      const reordered = orderedIds
        .map((id, index) => {
          const proposal = proposals.find((p) => p.id === id);
          if (!proposal) return null;
          return { ...proposal, sort_order: index, updated_at: new Date().toISOString() };
        })
        .filter((p): p is ProposedProjectJourney => p !== null);

      await saveProposals(reordered);
    },
    [proposals, saveProposals]
  );

  return {
    proposals,
    addProposal,
    addProposals,
    replaceAllProposals,
    updateProposal,
    deleteProposal,
    toggleReject,
    togglePunt,
    toggleCompleted,
    resetToDraft,
    cleanupOrphanedReferences,
    getProposalsByStatus,
    reorderProposals,
  };
}
