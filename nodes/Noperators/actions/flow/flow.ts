import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { noperatorsApiRequest, newResourceLocator, getResourceId } from '../../utils';

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
	newResourceLocator({
		displayName: 'Flow',
		name: 'flowIdentifier',
		label: 'flow',
		searchListMethod: 'searchFlows',
		show: { resource: ['flow'], operation: ['trigger'] },
	}),
	{
		displayName: 'Pass Input Item as Data',
		name: 'passInputItem',
		type: 'boolean',
		default: false,
		description: 'Whether to send the whole incoming JSON item as the flow input. When enabled, the JSON field below acts as additional data merged on top.',
		displayOptions: {
			show: {
				resource: ['flow'],
				operation: ['trigger'],
			},
		},
	},
	{
		displayName: 'Additional JSON Input Data',
		name: 'inputJson',
		type: 'json',
		default: '{}',
		description: 'JSON input to pass to the flow. When "Pass Input Item as Data" is enabled, this is merged on top of the incoming item.',
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
	const identifier = getResourceId(this.getNodeParameter('flowIdentifier', itemIndex, ''));
	const passInputItem = this.getNodeParameter('passInputItem', itemIndex, false) as boolean;
	const inputJsonRaw = this.getNodeParameter('inputJson', itemIndex, '{}') as string | object;

	let extra: Record<string, unknown> = {};
	if (typeof inputJsonRaw === 'string') {
		try {
			extra = JSON.parse(inputJsonRaw || '{}');
		} catch {
			throw new NodeOperationError(this.getNode(), 'Invalid JSON in Input field');
		}
	} else if (typeof inputJsonRaw === 'object' && inputJsonRaw !== null) {
		extra = inputJsonRaw as Record<string, unknown>;
	}

	let body: object;
	if (passInputItem) {
		const inputItem = this.getInputData()?.[itemIndex]?.json ?? {};
		body = { ...inputItem, ...extra };
	} else {
		body = extra;
	}

	const response = await noperatorsApiRequest.call(
		this,
		'POST',
		`/flows/${encodeURIComponent(identifier)}/trigger`,
		body,
	);

	return [{ json: response as IDataObject, pairedItem: itemIndex }];
}
