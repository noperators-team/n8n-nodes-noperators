import type { ILoadOptionsFunctions, INodeListSearchResult, ResourceMapperFields, FieldType } from 'n8n-workflow';
import { noperatorsSearchRequest } from '../../utils';
import { getResourceId } from '../../utils';

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

function inferFieldType(value: unknown): FieldType {
	if (typeof value === 'number') return 'number';
	if (typeof value === 'boolean') return 'boolean';
	if (Array.isArray(value)) return 'array';
	if (typeof value === 'object' && value !== null) return 'object';
	return 'string';
}

export async function getFlowInputFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	let flowId: string;
	try {
		const locator = this.getNodeParameter('flowIdentifier', '') as unknown;
		flowId = getResourceId(locator);
	} catch {
		return { fields: [] };
	}

	if (!flowId) {
		return { fields: [] };
	}

	let flow: any;
	try {
		flow = await noperatorsSearchRequest(this, `/flows/${encodeURIComponent(flowId)}`);
	} catch {
		return { fields: [] };
	}

	const defaultInputs = flow?.default_inputs;
	if (!defaultInputs || typeof defaultInputs !== 'object' || Array.isArray(defaultInputs)) {
		return { fields: [], emptyFieldsNotice: 'This flow has no default inputs defined.' };
	}

	const fields = Object.entries(defaultInputs).map(([key, value]) => ({
		id: key,
		displayName: key,
		required: false,
		defaultMatch: false,
		canBeUsedToMatch: false,
		display: true,
		type: inferFieldType(value),
	}));

	return { fields };
}
