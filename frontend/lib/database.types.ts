export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: number
          file_path: string
          content: string
          metadata: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          file_path: string
          content: string
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          file_path?: string
          content?: string
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }
      document_chunks: {
        Row: {
          id: number
          document_id: number
          chunk_index: number
          content: string
          embedding: number[]
          created_at: string
        }
        Insert: {
          id?: number
          document_id: number
          chunk_index: number
          content: string
          embedding: number[]
          created_at?: string
        }
        Update: {
          id?: number
          document_id?: number
          chunk_index?: number
          content?: string
          embedding?: number[]
          created_at?: string
        }
      }
    }
    Views: {
      document_stats: {
        Row: {
          total_documents: number
          total_chunks: number
          avg_document_length: number
          avg_chunk_length: number
          last_updated: string
        }
      }
    }
    Functions: {
      search_documents: {
        Args: {
          query_embedding: number[]
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          id: number
          document_id: number
          content: string
          similarity: number
          file_path: string
          metadata: Record<string, any>
        }[]
      }
      hybrid_search_documents: {
        Args: {
          query_text: string
          query_embedding: number[]
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          id: number
          document_id: number
          content: string
          similarity: number
          text_rank: number
          combined_score: number
          file_path: string
          metadata: Record<string, any>
        }[]
      }
    }
    Enums: {}
  }
}