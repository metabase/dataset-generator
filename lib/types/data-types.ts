// =================================================================
// CORE DATA TYPES TO REPLACE 'any' USAGE
// =================================================================

// Base record type for all data records
export interface DataRecord {
  [key: string]: any; // Keep flexible for now to avoid breaking existing functionality
}

// Table structure type
export interface TableData {
  name: string;
  type: "fact" | "dim";
  columns: string[];
  rows: DataRecord[];
}

// Generated data response type
export interface GeneratedData {
  tables: TableData[];
  spec: any; // Keep as any for now since it's the LLM-generated spec
}

// Validation result type
export interface ValidationResult {
  issues: string[];
  warnings: string[];
  stats: {
    totalRows: number;
    businessType: string;
    uniqueEvents: number;
    dateRange?: {
      earliest: Date;
      latest: Date;
    };
  };
  isValid: boolean;
  qualityScore: number;
}

// Export data type
export interface ExportData {
  data: GeneratedData;
  prompt: {
    rowCount: number;
    schemaType: string;
    businessType: string;
    timeRange: string[];
    growthPattern: string;
    variationLevel: string;
    granularity: string;
    context: string;
    isPreview?: boolean;
  };
  toCSV: (rows: DataRecord[], tableName?: string) => string;
  toSQL: (rows: DataRecord[], tableName?: string) => string;
  isMetabaseRunning: boolean;
  isInstallingMetabase: boolean;
  startMetabase: () => Promise<void>;
  stopMetabase: () => Promise<void>;
}

// Entity collection type
export interface EntityCollection {
  [entityName: string]: DataRecord[];
}

// Event stream type
export type EventStream = DataRecord[];

// API response type
export interface ApiResponse {
  data: GeneratedData;
  spec: any; // Keep as any for LLM spec
  tokens?: {
    input?: number;
    output?: number;
    total?: number;
  };
}
