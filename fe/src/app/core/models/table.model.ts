export interface Table {
  id: string;
  table_number: string;
  created_at?: string;
}

export interface CreateTableRequest {
  table_number: string;
}
