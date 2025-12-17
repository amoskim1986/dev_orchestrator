import { useCallback, useState } from 'react';
import { getSupabase } from '@dev-orchestrator/shared';
import type { Journey, Project, JourneySession } from '@dev-orchestrator/shared';

interface VSCodeLaunchResult {
  success: boolean;
  error?: string;
  session?: JourneySession;
  isNewSession?: boolean;
}

/**
 * Hook that launches VS Code with Claude Code and manages session tracking.
 *
 * When launching:
 * 1. Checks for an existing active session for the journey
 * 2. If none exists, creates a new session
 * 3. Records Claude Code as an AI tool in the session
 * 4. Opens VS Code with Claude Code history
 */
export function useVSCodeLaunch() {
  const [isLaunching, setIsLaunching] = useState(false);
  const [lastSession, setLastSession] = useState<JourneySession | null>(null);

  /**
   * Get the active session for a journey (if any)
   */
  const getActiveSessionForJourney = useCallback(async (journeyId: string): Promise<JourneySession | null> => {
    const { data } = await getSupabase()
      .from('journey_sessions')
      .select('*')
      .eq('journey_id', journeyId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    return data;
  }, []);

  /**
   * Create a new session for a journey
   */
  const createSessionForJourney = useCallback(async (
    journeyId: string,
    workspacePath: string,
    journeyName: string
  ): Promise<JourneySession> => {
    const { data, error } = await getSupabase()
      .from('journey_sessions')
      .insert({
        journey_id: journeyId,
        editor: 'vscode',
        editor_workspace: workspacePath,
        status: 'active',
        notes: `Started for journey: ${journeyName}`,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create session');

    return data;
  }, []);

  /**
   * Add Claude Code as an AI tool to a session
   */
  const addClaudeCodeTool = useCallback(async (
    sessionId: string,
    workspacePath: string
  ): Promise<void> => {
    await getSupabase()
      .from('session_ai_tools')
      .insert({
        session_id: sessionId,
        ai_tool: 'claude_code',
        session_identifier: workspacePath,
        notes: 'Auto-created on VS Code launch',
      });
  }, []);

  /**
   * Open VS Code at a journey's directory (without starting Claude Code chat)
   */
  const openVSCode = useCallback(async (
    journey: Journey,
    project: Project
  ): Promise<VSCodeLaunchResult> => {
    setIsLaunching(true);

    try {
      // Determine working directory
      const workingPath = journey.worktree_path || project.root_path;

      // Just open VS Code without Claude Code
      const result = await window.electronAPI.vscode.launch({
        workingDirectory: workingPath,
        maximizeChat: false,
        newWindow: true,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to open VS Code',
        };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to open VS Code',
      };
    } finally {
      setIsLaunching(false);
    }
  }, []);

  /**
   * Launch VS Code with a new Claude Code chat for a journey (with session tracking)
   */
  const launchClaudeCode = useCallback(async (
    journey: Journey,
    project: Project
  ): Promise<VSCodeLaunchResult> => {
    setIsLaunching(true);

    try {
      // Determine working directory
      const workingPath = journey.worktree_path || project.root_path;

      // Check for existing active session
      let session = await getActiveSessionForJourney(journey.id);
      let isNewSession = false;

      // If no active session, create one
      if (!session) {
        session = await createSessionForJourney(journey.id, workingPath, journey.name);
        isNewSession = true;

        // Add Claude Code as an AI tool for this session
        await addClaudeCodeTool(session.id, workingPath);
      }

      setLastSession(session);

      // Launch VS Code with Claude Code
      const result = await window.electronAPI.vscode.launchForJourney({
        journeyId: journey.id,
        journeyName: journey.name,
        journeyType: journey.type,
        journeyStage: journey.stage,
        worktreePath: workingPath,
        projectRootPath: project.root_path,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to launch Claude Code',
          session,
          isNewSession,
        };
      }

      // Show the journey overlay and register it for VS Code focus tracking
      await window.electronAPI.overlay?.show({
        journeyId: journey.id,
        projectId: project.id,
        journeyName: journey.name,
        journeyType: journey.type,
        journeyStage: journey.stage,
        branchName: journey.branch_name || undefined,
        workspacePath: workingPath,
      });

      return {
        success: true,
        session,
        isNewSession,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to launch Claude Code',
      };
    } finally {
      setIsLaunching(false);
    }
  }, [getActiveSessionForJourney, createSessionForJourney, addClaudeCodeTool]);

  /**
   * End an active session
   */
  const endSession = useCallback(async (sessionId: string, notes?: string): Promise<void> => {
    await getSupabase()
      .from('journey_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        notes,
      })
      .eq('id', sessionId);

    // Also end any active AI tools
    await getSupabase()
      .from('session_ai_tools')
      .update({
        ended_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
      .is('ended_at', null);
  }, []);

  return {
    openVSCode,
    launchClaudeCode,
    // Alias for backward compatibility
    launchForJourney: launchClaudeCode,
    isLaunching,
    lastSession,
    getActiveSessionForJourney,
    endSession,
  };
}
