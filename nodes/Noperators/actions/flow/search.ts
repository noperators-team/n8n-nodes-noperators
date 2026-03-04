import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { noperatorsSearchRequest } from '../../utils';

const SEARCH_LIMIT = 50;

export async function searchFlows(
	this: ILoadOptionsFunctions,
	query?: string,
): Promise<INodeListSearchResult> {
	const qs: Record<string, string> = {};
	if (query) {
		qs.search = query;
	}

	const flows = await noperatorsSearchRequest(this, '/flows', qs);

	const items = Array.isArray(flows) ? flows : [];

	const results = items.map((flow: any) => ({
		name: flow.name || `Flow ${flow.id}`,
		value: flow.ulid || String(flow.id),
		description: flow.classifier ? `${flow.classifier} (ID: ${flow.id})` : `ID: ${flow.id}`,
	}));

	return {
		results: results.slice(0, SEARCH_LIMIT),
	};
}
