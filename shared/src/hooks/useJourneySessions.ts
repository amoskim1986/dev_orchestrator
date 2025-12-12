import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';
import type {
  JourneySession,
  JourneySessionInsert,
  JourneySessionUpdate,
  SessionProcess,
  SessionProcessInsert,
  SessionProcessUpdate,
  SessionAiTool,
  SessionAiToolInsert,
  SessionAiToolUpdate,
  SessionStatus,
} from '../types';

export function useJourneySessions(journeyId: string) {
  const [sessions, setSessions] = useState<JourneySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getSupabase()
      .from('journey_sessions')
      .select('*')
      .eq('journey_id', journeyId)
      .order('started_at', { ascending: false });

    if (fetchError) {
      setError(fetchError);
    } else {
      setSessions(data || []);
    }
    setLoading(false);
  }, [journeyId]);

  const createSession = useCallback(async (
    session: Omit<JourneySessionInsert, 'journey_id'>
  ): Promise<JourneySession> => {
    const { data, error: createError } = await getSupabase()
      .from('journey_sessions')
      .insert({ ...session, journey_id: journeyId })
      .select()
      .single();

    if (createError) throw createError;
    if (!data) throw new Error('No data returned from insert');

    setSessions(prev => [data, ...prev]);
    return data;
  }, [journeyId]);

  const updateSession = useCallback(async (id: string, updates: JourneySessionUpdate): Promise<JourneySession> => {
    const { data, error: updateError } = await getSupabase()
      .from('journey_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    if (!data) throw new Error('No data returned from update');

    setSessions(prev => prev.map(s => s.id === id ? data : s));
    return data;
  }, []);

  const endSession = useCallback(async (id: string, status: SessionStatus = 'ended', notes?: string): Promise<JourneySession> => {
    return updateSession(id, {
      status,
      ended_at: new Date().toISOString(),
      notes,
    });
  }, [updateSession]);

  const deleteSession = useCallback(async (id: string): Promise<void> => {
    const { error: deleteError } = await getSupabase()
      .from('journey_sessions')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    setSessions(prev => prev.filter(s => s.id !== id));
  }, []);

  // Get active session (if any)
  const getActiveSession = useCallback(() => {
    return sessions.find(s => s.status === 'active') || null;
  }, [sessions]);

  useEffect(() => {
    if (journeyId) {
      fetchSessions();
    }
  }, [journeyId, fetchSessions]);

  return {
    sessions,
    loading,
    error,
    createSession,
    updateSession,
    endSession,
    deleteSession,
    getActiveSession,
    refetch: fetchSessions,
  };
}

// Hook for managing processes within a session
export function useSessionProcesses(sessionId: string) {
  const [processes, setProcesses] = useState<SessionProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProcesses = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getSupabase()
      .from('session_processes')
      .select('*')
      .eq('session_id', sessionId)
      .order('started_at', { ascending: true });

    if (fetchError) {
      setError(fetchError);
    } else {
      setProcesses(data || []);
    }
    setLoading(false);
  }, [sessionId]);

  const addProcess = useCallback(async (
    process: Omit<SessionProcessInsert, 'session_id'>
  ): Promise<SessionProcess> => {
    const { data, error: createError } = await getSupabase()
      .from('session_processes')
      .insert({ ...process, session_id: sessionId })
      .select()
      .single();

    if (createError) throw createError;
    if (!data) throw new Error('No data returned from insert');

    setProcesses(prev => [...prev, data]);
    return data;
  }, [sessionId]);

  const updateProcess = useCallback(async (id: string, updates: SessionProcessUpdate): Promise<SessionProcess> => {
    const { data, error: updateError } = await getSupabase()
      .from('session_processes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    if (!data) throw new Error('No data returned from update');

    setProcesses(prev => prev.map(p => p.id === id ? data : p));
    return data;
  }, []);

  const stopProcess = useCallback(async (id: string): Promise<SessionProcess> => {
    return updateProcess(id, {
      status: 'stopped',
      ended_at: new Date().toISOString(),
    });
  }, [updateProcess]);

  useEffect(() => {
    if (sessionId) {
      fetchProcesses();
    }
  }, [sessionId, fetchProcesses]);

  return {
    processes,
    loading,
    error,
    addProcess,
    updateProcess,
    stopProcess,
    refetch: fetchProcesses,
  };
}

// Hook for managing AI tools within a session
export function useSessionAiTools(sessionId: string) {
  const [aiTools, setAiTools] = useState<SessionAiTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAiTools = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getSupabase()
      .from('session_ai_tools')
      .select('*')
      .eq('session_id', sessionId)
      .order('started_at', { ascending: true });

    if (fetchError) {
      setError(fetchError);
    } else {
      setAiTools(data || []);
    }
    setLoading(false);
  }, [sessionId]);

  const addAiTool = useCallback(async (
    tool: Omit<SessionAiToolInsert, 'session_id'>
  ): Promise<SessionAiTool> => {
    const { data, error: createError } = await getSupabase()
      .from('session_ai_tools')
      .insert({ ...tool, session_id: sessionId })
      .select()
      .single();

    if (createError) throw createError;
    if (!data) throw new Error('No data returned from insert');

    setAiTools(prev => [...prev, data]);
    return data;
  }, [sessionId]);

  const updateAiTool = useCallback(async (id: string, updates: SessionAiToolUpdate): Promise<SessionAiTool> => {
    const { data, error: updateError } = await getSupabase()
      .from('session_ai_tools')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    if (!data) throw new Error('No data returned from update');

    setAiTools(prev => prev.map(t => t.id === id ? data : t));
    return data;
  }, []);

  const endAiTool = useCallback(async (id: string, notes?: string): Promise<SessionAiTool> => {
    return updateAiTool(id, {
      ended_at: new Date().toISOString(),
      notes,
    });
  }, [updateAiTool]);

  useEffect(() => {
    if (sessionId) {
      fetchAiTools();
    }
  }, [sessionId, fetchAiTools]);

  return {
    aiTools,
    loading,
    error,
    addAiTool,
    updateAiTool,
    endAiTool,
    refetch: fetchAiTools,
  };
}
