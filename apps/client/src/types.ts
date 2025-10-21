// Types for the multi-agent observability app

// Main event interface from hooks
export interface HookEvent {
  id?: number;
  source_app: string;
  session_id: string;
  hook_event_type: string;
  payload?: Record<string, any>;
  chat?: any[];
  summary?: string;
  timestamp?: number;
  model_name?: string;
  humanInTheLoop?: HumanInTheLoop;
  humanInTheLoopStatus?: HumanInTheLoopStatus;
  model?: string;
  tool_name?: string;
  tool_command?: string;
  tool_file?: string | { path?: string; content?: string };
  hitl_question?: string;
  hitl_permission?: string;
  content?: string | any[];
}

// WebSocket message format
export interface WebSocketMessage {
  type: 'initial' | 'event' | 'hitl_response';
  data: HookEvent | HookEvent[] | any;
}

// Filter options from server
export interface FilterOptions {
  source_apps: string[];
  session_ids: string[];
  hook_event_types: string[];
}

// Time range for charts
export type TimeRange = '1m' | '3m' | '5m' | '10m';

// Chart data point
export interface ChartDataPoint {
  timestamp: number;
  count: number;
  eventTypes: Record<string, number>;
  sessions: Record<string, number>;
}

// Chart config
export interface ChartConfig {
  maxDataPoints: number;
  animationDuration: number;
  barWidth: number;
  barGap: number;
  colors: {
    primary: string;
    glow: string;
    axis: string;
    text: string;
  };
}

// Chart dimensions
export interface ChartDimensions {
  width: number;
  height: number;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

// Event timing metrics
export interface EventTimingMetrics {
  avgGap: number;
  minGap: number;
  maxGap: number;
}

// HITL interfaces
export interface HumanInTheLoop {
  question: string;
  responseWebSocketUrl: string;
  type: 'question' | 'permission' | 'choice';
  choices?: string[];
  timeout?: number;
  requiresResponse?: boolean;
}

export interface HumanInTheLoopResponse {
  response?: string;
  permission?: boolean;
  choice?: string;
  hookEvent: HookEvent;
  respondedAt: number;
  respondedBy?: string;
}

export interface HumanInTheLoopStatus {
  status: 'pending' | 'responded' | 'timeout' | 'error';
  respondedAt?: number;
  response?: HumanInTheLoopResponse;
}
