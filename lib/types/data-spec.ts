// =================================================================
// TYPE DEFINITIONS FOR THE DATA GENERATION SPEC
// =================================================================

export type AttributeType = "id" | "faker" | "choice" | "conditional";
export type EventType = "initial" | "recurring" | "random" | "churn";
export type SourceType =
  | "id"
  | "timestamp"
  | "reference"
  | "event_name"
  | "lookup"
  | "literal"
  | "choice"
  | "conditional";

export interface FrequencySpec {
  on: string; // e.g., "billing_cycle" or "user.subscription_type"
}

export interface AttributeSpec {
  type: AttributeType;
  prefix?: string; // for id
  method?: string; // for faker, e.g., "internet.email"
  values?: (string | number)[]; // for choice
  weights?: number[]; // for choice
  options?: (string | number)[]; // for choice (LLM sometimes uses this instead of values)
  choices?: (string | number)[]; // for choice (LLM sometimes uses this instead of values)
  on?: string[]; // for conditional
  cases?: Record<string, any>; // for conditional
}

export interface EntitySpec {
  name: string;
  attributes: Record<string, AttributeSpec>;
}

export interface ColumnSourceSpec {
  type: SourceType;
  prefix?: string; // for id
  entity?: string; // for reference
  attribute?: string; // for reference
  from?: string; // for lookup
  value?: any; // for literal
  values?: (string | number)[]; // for choice
  weights?: number[]; // for choice
  jitter_days?: number; // for timestamp jitter
}

export interface EventStreamColumnSpec {
  name: string;
  source: ColumnSourceSpec;
}

export interface EventStreamTableSpec {
  name: string;
  columns: EventStreamColumnSpec[];
}

export interface EventSpec {
  type: EventType;
  frequency?: FrequencySpec; // for recurring
  avg_per_entity_per_month?: number; // for random
  avg_per_entity?: number; // for random (sometimes used by LLM)
  monthly_rate?: number; // for churn
  outputs: Record<string, any>;
}

export interface SimulationSpec {
  initial_event: string;
  events: Record<string, EventSpec>;
}

export interface DataSpec {
  entities: EntitySpec[];
  event_stream_table: EventStreamTableSpec;
  simulation: SimulationSpec;
}
