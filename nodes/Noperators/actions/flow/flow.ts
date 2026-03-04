import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { noperatorsApiRequest } from '../../utils';

export const flowOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['flow'],
			},
		},
		options: [
			{
				name: 'Trigger',
				value: 'trigger',
				description: 'Trigger a flow and start a new run',
				action: 'Trigger a flow',
			},
		],
		default: 'trigger',
	},
];

export const flowParameters: INodeProperties[] = [
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
				resource: ['flow'],
				operation: ['trigger'],
			},
		},
	},
	{
		displayName: 'Input (JSON)',
		name: 'inputJson',
		type: 'json',
		default: '{}',
		description: 'Optional JSON input to pass to the flow',
		displayOptions: {
			show: {
				resource: ['flow'],
				operation: ['trigger'],
			},
		},
	},
];

export async function executeFlowOperation(
	this: IExecuteFunctions,
	item: INodeExecutionData,
	itemIndex: number,
	operation: string,
): Promise<INodeExecutionData[]> {
	if (operation === 'trigger') {
		return triggerFlow.call(this, itemIndex);
	}
	throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`);
}

async function triggerFlow(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const identifier = this.getNodeParameter('flowIdentifier', itemIndex, '') as string;
	const inputJsonRaw = this.getNodeParameter('inputJson', itemIndex, '{}') as string | object;

	let body: object = {};
	if (typeof inputJsonRaw === 'string') {
		try {
			body = JSON.parse(inputJsonRaw || '{}');
		} catch {
			throw new NodeOperationError(this.getNode(), 'Invalid JSON in Input field');
		}
	} else if (typeof inputJsonRaw === 'object' && inputJsonRaw !== null) {
		body = inputJsonRaw;
	}

	const response = await noperatorsApiRequest.call(
		this,
		'POST',
		`/flows/${encodeURIComponent(identifier)}/trigger`,
		body,
	);

	return [{ json: response as IDataObject, pairedItem: itemIndex }];
}
