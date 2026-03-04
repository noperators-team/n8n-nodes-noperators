import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { noperatorsApiRequest, newResourceLocator, getResourceId } from '../../utils';

export const runOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['run'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get the full details of a specific run',
				action: 'Get a run',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Get a paginated list of runs for a flow',
				action: 'Get many runs',
			},
			{
				name: 'Get Result',
				value: 'getResult',
				description: 'Get the output and timing of a completed run',
				action: 'Get run result',
			},
		],
		default: 'getMany',
	},
];

export const runParameters: INodeProperties[] = [
	newResourceLocator({
		displayName: 'Flow',
		name: 'flowIdentifier',
		label: 'flow',
		searchListMethod: 'searchFlows',
		show: { resource: ['run'] },
	}),
	newResourceLocator({
		displayName: 'Run',
		name: 'runId',
		label: 'run',
		searchListMethod: 'searchRuns',
		show: { resource: ['run'], operation: ['get', 'getResult'] },
	}),
	{
		displayName: 'Status Filter',
		name: 'status',
		type: 'options',
		default: '',
		description: 'Filter runs by status',
		options: [
			{ name: 'All', value: '' },
			{ name: 'Completed', value: 'completed' },
			{ name: 'Failed', value: 'failed' },
			{ name: 'Killed', value: 'killed' },
			{ name: 'Pending', value: 'pending' },
			{ name: 'Running', value: 'running' },
		],
		displayOptions: {
			show: {
				resource: ['run'],
				operation: ['getMany'],
			},
		},
	},
	{
		displayName: 'Per Page',
		name: 'perPage',
		type: 'number',
		default: 20,
		description: 'Number of items per page',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: ['run'],
				operation: ['getMany'],
			},
		},
	},
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		default: 1,
		description: 'Page number',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['run'],
				operation: ['getMany'],
			},
		},
	},
	{
		displayName: 'Include Logs',
		name: 'logs',
		type: 'boolean',
		default: false,
		description: 'Whether to include console_logs in the response',
		displayOptions: {
			show: {
				resource: ['run'],
				operation: ['get', 'getMany'],
			},
		},
	},
	{
		displayName: 'Include Code Snapshot',
		name: 'code',
		type: 'boolean',
		default: false,
		description: 'Whether to include code_snapshot in the response',
		displayOptions: {
			show: {
				resource: ['run'],
				operation: ['get', 'getMany'],
			},
		},
	},
	{
		displayName: 'Show Secrets',
		name: 'secrets',
		type: 'boolean',
		default: false,
		description: 'Whether to show secret values in plain text instead of masking them',
		displayOptions: {
			show: {
				resource: ['run'],
				operation: ['get', 'getMany', 'getResult'],
			},
		},
	},
];

export async function executeRunOperation(
	this: IExecuteFunctions,
	item: INodeExecutionData,
	itemIndex: number,
	operation: string,
): Promise<INodeExecutionData[]> {
	switch (operation) {
		case 'get':
			return getRun.call(this, itemIndex);
		case 'getMany':
			return getManyRuns.call(this, itemIndex);
		case 'getResult':
			return getRunResult.call(this, itemIndex);
		default:
			throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`);
	}
}

async function getRun(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const identifier = getResourceId(this.getNodeParameter('flowIdentifier', itemIndex, ''));
	const runId = getResourceId(this.getNodeParameter('runId', itemIndex, ''));
	const logs = this.getNodeParameter('logs', itemIndex, false) as boolean;
	const code = this.getNodeParameter('code', itemIndex, false) as boolean;
	const secrets = this.getNodeParameter('secrets', itemIndex, false) as boolean;

	const qs: Record<string, string | number> = {};
	if (logs) qs.logs = 1;
	if (code) qs.code = 1;
	if (secrets) qs.secrets = 1;

	const response = await noperatorsApiRequest.call(
		this,
		'GET',
		`/flows/${encodeURIComponent(identifier)}/runs/${runId}`,
		undefined,
		qs,
	);

	return [{ json: response as IDataObject, pairedItem: itemIndex }];
}

async function getManyRuns(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const identifier = getResourceId(this.getNodeParameter('flowIdentifier', itemIndex, ''));
	const status = this.getNodeParameter('status', itemIndex, '') as string;
	const perPage = this.getNodeParameter('perPage', itemIndex, 20) as number;
	const page = this.getNodeParameter('page', itemIndex, 1) as number;
	const logs = this.getNodeParameter('logs', itemIndex, false) as boolean;
	const code = this.getNodeParameter('code', itemIndex, false) as boolean;
	const secrets = this.getNodeParameter('secrets', itemIndex, false) as boolean;

	const qs: Record<string, string | number> = {
		per_page: perPage,
		page,
	};

	if (status) qs.status = status;
	if (logs) qs.logs = 1;
	if (code) qs.code = 1;
	if (secrets) qs.secrets = 1;

	const response = await noperatorsApiRequest.call(
		this,
		'GET',
		`/flows/${encodeURIComponent(identifier)}/runs`,
		undefined,
		qs,
	);

	return [{ json: response as IDataObject, pairedItem: itemIndex }];
}

async function getRunResult(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const identifier = getResourceId(this.getNodeParameter('flowIdentifier', itemIndex, ''));
	const runId = getResourceId(this.getNodeParameter('runId', itemIndex, ''));
	const secrets = this.getNodeParameter('secrets', itemIndex, false) as boolean;

	const qs: Record<string, string | number> = {};
	if (secrets) qs.secrets = 1;

	const response = await noperatorsApiRequest.call(
		this,
		'GET',
		`/flows/${encodeURIComponent(identifier)}/runs/${runId}/result`,
		undefined,
		qs,
	);

	return [{ json: response as IDataObject, pairedItem: itemIndex }];
}
