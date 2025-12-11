// Status types
export type JourneyStatus = 'planning' | 'in_progress' | 'ready' | 'deployed';

// Database row types (matches Supabase schema)
export interface Project {
  id: string;
  name: string;
  root_path: string;
  frontend_path: string | null;
  backend_path: string | null;
  frontend_start_cmd: string;
  backend_start_cmd: string;
  created_at: string;
  updated_at: string;
}

export interface Journey {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  branch_name: string | null;    // NULL until journey started
  worktree_path: string | null;  // NULL until journey started
  status: JourneyStatus;
  rails_port: number | null;
  react_port: number | null;
  rails_pid: number | null;
  react_pid: number | null;
  created_at: string;
  updated_at: string;
}

// Insert types (id and timestamps auto-generated)
export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'updated_at'> & {
  frontend_path?: string | null;
  backend_path?: string | null;
  frontend_start_cmd?: string;
  backend_start_cmd?: string;
};

export type JourneyInsert = {
  project_id: string;
  name: string;
  description?: string | null;
  branch_name?: string | null;
  worktree_path?: string | null;
  status?: JourneyStatus;
  rails_port?: number | null;
  react_port?: number | null;
  rails_pid?: number | null;
  react_pid?: number | null;
};

// Update types (all fields optional)
export type ProjectUpdate = Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>;
export type JourneyUpdate = Partial<Omit<Journey, 'id' | 'created_at' | 'updated_at'>>;
