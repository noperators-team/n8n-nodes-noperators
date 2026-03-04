export interface TriggerResponse {
	run_id: number;
	flow_ulid: string;
	classifier: string | null;
	status: string;
}

export interface Run {
	id: number;
	flow_id: number;
	status: 'pending' | 'running' | 'completed' | 'failed' | 'killed';
	output: Record<string, unknown> | null;
	error_message: string | null;
	duration_ms: number | null;
	created_at: string;
	updated_at: string;
}

export interface RunResult {
	run_id: number;
	status: string;
	output: Record<string, unknown> | null;
	error_message: string | null;
	duration_ms: number | null;
}

export interface PaginatedRuns {
	data: Run[];
	current_page: number;
	last_page: number;
	per_page: number;
	total: number;
}

export interface ArtifactFile {
	name: string;
	size: number;
	url: string;
}

export type ArtifactList = ArtifactFile[];

export interface ApiError {
	error: string;
}
