export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          owner_id: string | null
          name: string
          description: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          owner_id?: string | null
          name: string
          description?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string | null
          name?: string
          description?: string | null
          created_at?: string | null
        }
      }
      project_members: {
        Row: {
          project_id: string
          user_id: string
          role: string | null
        }
        Insert: {
          project_id: string
          user_id: string
          role?: string | null
        }
        Update: {
          project_id?: string
          user_id?: string
          role?: string | null
        }
      }
      assets: {
        Row: {
          id: string
          user_id: string | null
          type: string
          name: string
          details: any | null
          created_at: string | null
          project_id: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          type: string
          name: string
          details?: any | null
          created_at?: string | null
          project_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          type?: string
          name?: string
          details?: any | null
          created_at?: string | null
          project_id?: string | null
        }
      }
      deadlines: {
        Row: {
          id: string
          asset_id: string | null
          user_id: string | null
          category: string
          title: string
          due_date: string
          frequency: string | null
          notes: string | null
          created_at: string | null
          project_id: string | null
        }
        Insert: {
          id?: string
          asset_id?: string | null
          user_id?: string | null
          category: string
          title: string
          due_date: string
          frequency?: string | null
          notes?: string | null
          created_at?: string | null
          project_id?: string | null
        }
        Update: {
          id?: string
          asset_id?: string | null
          user_id?: string | null
          category?: string
          title?: string
          due_date?: string
          frequency?: string | null
          notes?: string | null
          created_at?: string | null
          project_id?: string | null
        }
      }
      deadline_logs: {
        Row: {
          id: string
          deadline_id: string | null
          done_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          deadline_id?: string | null
          done_at: string
          notes?: string | null
        }
        Update: {
          id?: string
          deadline_id?: string | null
          done_at?: string
          notes?: string | null
        }
      }
      value_lists: {
        Row: {
          id: string
          category: string
          value: string
          label: string
          order_index: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          category: string
          value: string
          label: string
          order_index?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          category?: string
          value?: string
          label?: string
          order_index?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
    }
  }
}

export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectMember = Database['public']['Tables']['project_members']['Row']
export type Asset = Database['public']['Tables']['assets']['Row']
export type Deadline = Database['public']['Tables']['deadlines']['Row']
export type DeadlineLog = Database['public']['Tables']['deadline_logs']['Row']
export type ValueList = Database['public']['Tables']['value_lists']['Row']
