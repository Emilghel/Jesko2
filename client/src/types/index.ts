export interface Voice {
  voice_id?: string;
  id?: string;  // Some API responses use id, others use voice_id
  name: string;
  category?: string;
  description?: string;
  preview_url?: string;
  accent?: string;
  age?: string;
  gender?: string;
  use_case?: string;
  labels?: string[];
}

export interface ElevenLabsModel {
  model_id: string;
  name: string;
  description?: string;
  can_be_finetuned?: boolean;
  can_do_text_to_speech?: boolean;
  token_cost_factor?: number;
  max_characters_per_chunk?: number;
}

export interface ServerStatus {
  uptime?: string;
  startTime?: string;
  version?: string;
  online?: boolean;
  message?: string;
}

export interface SystemResource {
  cpu: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface ServiceStatus {
  name: string;
  description: string;
  status: string;
  connected: boolean;
  icon: string;
}

export interface ActiveCall {
  callSid: string;
  phoneNumber: string;
  status: string;
  duration: string;
}