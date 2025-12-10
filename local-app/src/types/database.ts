import type { Project, ProjectInsert, ProjectUpdate, Journey, JourneyInsert, JourneyUpdate } from './index';

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: Project;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
      };
      journeys: {
        Row: Journey;
        Insert: JourneyInsert;
        Update: JourneyUpdate;
      };
    };
  };
}
