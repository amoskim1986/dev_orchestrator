import { useCallback, useMemo } from 'react';
import type {
  Journey,
  ProposedChildJourney,
  ProposedChildJourneyInsert,
  ProposedChildJourneyUpdate,
  ProposedJourneyStatus,
} from '../types';

interface UseProposedChildJourneysOptions {
  journey: Journey;
  onJourneyUpdate: (updates: { proposed_child_journeys: ProposedChildJourney[] }) => Promise<unknown>;
  childJourneyIds?: string[];  // IDs of existing child journeys for orphan detection
}

export function useProposedChildJourneys({
  journey,
  onJourneyUpdate,
  childJourneyIds = [],
}: UseProposedChildJourneysOptions) {
  const proposals = useMemo(
    () => journey.proposed_child_journeys || [],
    [journey.proposed_child_journeys]
  );

  const saveProposals = useCallback(
    async (newProposals: ProposedChildJourney[]) => {
      await onJourneyUpdate({ proposed_child_journeys: newProposals });
    },
    [onJourneyUpdate]
  );

  const addProposal = useCallback(
    async (proposal: ProposedChildJourneyInsert): Promise<ProposedChildJourney> => {
      const now = new Date().toISOString();
      const newProposal: ProposedChildJourney = {
        id: crypto.randomUUID(),
        name: proposal.name,
        description: proposal.description,
        early_plan: proposal.early_plan,
        checklist_items: proposal.checklist_items || [],
        status: proposal.status,
        generated_journey_id: proposal.generated_journey_id ?? null,
        proposed_parent_id: proposal.proposed_parent_id ?? null,
        is_group: proposal.is_group ?? false,
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
    async (newProposals: ProposedChildJourneyInsert[]): Promise<ProposedChildJourney[]> => {
      const now = new Date().toISOString();
      const startOrder = proposals.length;

      const created = newProposals.map(
        (p, i): ProposedChildJourney => ({
          id: crypto.randomUUID(),
          name: p.name,
          description: p.description,
          early_plan: p.early_plan,
          checklist_items: p.checklist_items || [],
          status: p.status,
          generated_journey_id: p.generated_journey_id ?? null,
          proposed_parent_id: p.proposed_parent_id ?? null,
          is_group: p.is_group ?? false,
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
    async (newProposals: ProposedChildJourneyInsert[]): Promise<ProposedChildJourney[]> => {
      const now = new Date().toISOString();

      const created = newProposals.map(
        (p, i): ProposedChildJourney => ({
          id: crypto.randomUUID(),
          name: p.name,
          description: p.description,
          early_plan: p.early_plan,
          checklist_items: p.checklist_items || [],
          status: p.status,
          generated_journey_id: p.generated_journey_id ?? null,
          proposed_parent_id: p.proposed_parent_id ?? null,
          is_group: p.is_group ?? false,
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
    async (id: string, updates: ProposedChildJourneyUpdate): Promise<ProposedChildJourney | null> => {
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

  // Batch update multiple proposals at once (avoids stale closure issues when called in a loop)
  const batchUpdateProposals = useCallback(
    async (updates: Array<{ id: string; updates: ProposedChildJourneyUpdate }>): Promise<void> => {
      const now = new Date().toISOString();
      const updatedProposals = proposals.map((proposal) => {
        const update = updates.find((u) => u.id === proposal.id);
        if (update) {
          return {
            ...proposal,
            ...update.updates,
            updated_at: now,
          };
        }
        return proposal;
      });

      await saveProposals(updatedProposals);
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
    async (id: string): Promise<ProposedChildJourney | null> => {
      const proposal = proposals.find((p) => p.id === id);
      if (!proposal) return null;

      const newStatus: ProposedJourneyStatus =
        proposal.status === 'rejected' ? 'draft' : 'rejected';

      return updateProposal(id, { status: newStatus });
    },
    [proposals, updateProposal]
  );

  const togglePunt = useCallback(
    async (id: string): Promise<ProposedChildJourney | null> => {
      const proposal = proposals.find((p) => p.id === id);
      if (!proposal) return null;

      const newStatus: ProposedJourneyStatus =
        proposal.status === 'punted' ? 'draft' : 'punted';

      return updateProposal(id, { status: newStatus });
    },
    [proposals, updateProposal]
  );

  const cleanupOrphanedReferences = useCallback(async (): Promise<number> => {
    const journeyIdSet = new Set(childJourneyIds);
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
  }, [proposals, childJourneyIds, saveProposals]);

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
        .filter((p): p is ProposedChildJourney => p !== null);

      await saveProposals(reordered);
    },
    [proposals, saveProposals]
  );

  // Get count of draft proposals (ready to create)
  const draftCount = useMemo(
    () => proposals.filter((p) => p.status === 'draft').length,
    [proposals]
  );

  // Get top-level proposals (no parent)
  const getTopLevelProposals = useCallback(
    () => proposals.filter((p) => !p.proposed_parent_id),
    [proposals]
  );

  // Get children of a specific proposal
  const getChildProposals = useCallback(
    (parentId: string) => proposals.filter((p) => p.proposed_parent_id === parentId),
    [proposals]
  );

  // Get proposals that can be parents (only those marked as groups, excluding self and descendants)
  const getAvailableParents = useCallback(
    (excludeId?: string) => {
      const excludeIds = new Set<string>();
      if (excludeId) {
        excludeIds.add(excludeId);
        // Also exclude any children of the excluded proposal to prevent circular references
        const addChildren = (id: string) => {
          proposals.filter(p => p.proposed_parent_id === id).forEach(child => {
            excludeIds.add(child.id);
            addChildren(child.id);
          });
        };
        addChildren(excludeId);
      }
      // Only return proposals that are marked as groups and are drafts
      return proposals.filter(
        (p) => p.status === 'draft' && p.is_group && !excludeIds.has(p.id)
      );
    },
    [proposals]
  );

  // Set a proposal's parent
  const setProposalParent = useCallback(
    async (id: string, parentId: string | null): Promise<ProposedChildJourney | null> => {
      return updateProposal(id, { proposed_parent_id: parentId });
    },
    [updateProposal]
  );

  // Toggle group status
  const toggleGroup = useCallback(
    async (id: string): Promise<ProposedChildJourney | null> => {
      const proposal = proposals.find((p) => p.id === id);
      if (!proposal) return null;
      return updateProposal(id, { is_group: !proposal.is_group });
    },
    [proposals, updateProposal]
  );

  // Ungroup all children from a parent (set their parent to null)
  const ungroupChildren = useCallback(
    async (parentId: string): Promise<void> => {
      const children = proposals.filter((p) => p.proposed_parent_id === parentId);
      if (children.length === 0) return;

      await batchUpdateProposals(
        children.map((child) => ({
          id: child.id,
          updates: { proposed_parent_id: null },
        }))
      );
    },
    [proposals, batchUpdateProposals]
  );

  // Reset a cancelled proposal back to draft
  const uncancelProposal = useCallback(
    async (id: string): Promise<ProposedChildJourney | null> => {
      const proposal = proposals.find((p) => p.id === id);
      if (!proposal || proposal.status !== 'cancelled') return null;
      return updateProposal(id, {
        status: 'draft',
        cancelled_at: null,
      });
    },
    [proposals, updateProposal]
  );

  // Reset a generated (published) proposal back to draft
  const unpublishProposal = useCallback(
    async (id: string): Promise<ProposedChildJourney | null> => {
      const proposal = proposals.find((p) => p.id === id);
      if (!proposal || proposal.status !== 'generated') return null;
      return updateProposal(id, {
        status: 'draft',
        generated_journey_id: null,
      });
    },
    [proposals, updateProposal]
  );

  return {
    proposals,
    draftCount,
    addProposal,
    addProposals,
    replaceAllProposals,
    updateProposal,
    batchUpdateProposals,
    deleteProposal,
    toggleReject,
    togglePunt,
    cleanupOrphanedReferences,
    getProposalsByStatus,
    reorderProposals,
    // Parent-child helpers
    getTopLevelProposals,
    getChildProposals,
    getAvailableParents,
    setProposalParent,
    toggleGroup,
    ungroupChildren,
    // Reset actions
    uncancelProposal,
    unpublishProposal,
  };
}
