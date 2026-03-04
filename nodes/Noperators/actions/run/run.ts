import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { noperatorsApiRequest } from '../../utils';

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
	{
		displayName: 'Flow Identifier',
		name: 'flowIdentifier',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. flow_id, ULID, or classifier',
		description: 'The flow ID, ULID, or classifier',
		displayOptions: {
			show: {
				resource: ['run'],
			},
		},
	},
	{
		displayName: 'Run ID',
		name: 'runId',
		type: 'number',
		required: true,
		default: 0,
		description: 'The ID of the run',
		displayOptions: {
			show: {
				resource: ['run'],
				operation: ['get', 'getResult'],
			},
		},
	},
	{
		displayName: 'Status Filter',
		name: 'status',
		type: 'options',
		default: '',
		description: 'Filter runs by status',
		options: [
			{ name: 'All', value: '' },
			{ name: 'Pending', value: 'pending' },
			{ name: 'Running', value: 'running' },
			{ name: 'Completed', value: 'completed' },
			{ name: 'Failed', value: 'failed' },
			{ name: 'Killed', value: 'killed' },
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
	const identifier = this.getNodeParameter('flowIdentifier', itemIndex, '') as string;
	const runId = this.getNodeParameter('runId', itemIndex, 0) as number;

	const response = await noperatorsApiRequest.call(
		this,
		'GET',
		`/flows/${encodeURIComponent(identifier)}/runs/${runId}`,
	);

	return [{ json: response as IDataObject, pairedItem: itemIndex }];
}

async function getManyRuns(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const identifier = this.getNodeParameter('flowIdentifier', itemIndex, '') as string;
	const status = this.getNodeParameter('status', itemIndex, '') as string;
	const perPage = this.getNodeParameter('perPage', itemIndex, 20) as number;
	const page = this.getNodeParameter('page', itemIndex, 1) as number;

	const qs: Record<string, string | number> = {
		per_page: perPage,
		page,
	};

	if (status) {
		qs.status = status;
	}

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
	const identifier = this.getNodeParameter('flowIdentifier', itemIndex, '') as string;
	const runId = this.getNodeParameter('runId', itemIndex, 0) as number;

	const response = await noperatorsApiRequest.call(
		this,
		'GET',
		`/flows/${encodeURIComponent(identifier)}/runs/${runId}/result`,
	);

	return [{ json: response as IDataObject, pairedItem: itemIndex }];
}
