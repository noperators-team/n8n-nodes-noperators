import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { noperatorsSearchRequest, getResourceId } from '../../utils';

const SEARCH_LIMIT = 50;

export async function searchRuns(
	this: ILoadOptionsFunctions,
	query?: string,
): Promise<INodeListSearchResult> {
	const flowLocator = this.getNodeParameter('flowIdentifier', '') as any;
	const flowId = getResourceId(flowLocator);

	if (!flowId) {
		return { results: [] };
	}

	const qs: Record<string, string> = {};
	if (query) {
		qs.search = query;
	}

	const runs = await noperatorsSearchRequest(
		this,
		`/flows/${encodeURIComponent(flowId)}/runs/search`,
		qs,
	);

	const items = Array.isArray(runs) ? runs : [];

	const results = items.map((run: any) => {
		const status = run.status || 'unknown';
		const date = run.created_at ? new Date(run.created_at).toLocaleString() : '';
		const duration = run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : '';
		const legend = run.legend ? ` "${run.legend}"` : '';

		return {
			name: `Run #${run.id}${legend} - ${status}${duration ? ` (${duration})` : ''}`,
			value: String(run.id),
			description: date,
		};
	});

	return {
		results: results.slice(0, SEARCH_LIMIT),
	};
}
