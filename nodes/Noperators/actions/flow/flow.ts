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
				description: 'Trigger a flow and return immediately (async)',
				action: 'Trigger a flow',
			},
			{
				name: 'Trigger & Wait',
				value: 'triggerSync',
				description: 'Trigger a flow and wait for it to complete before continuing',
				action: 'Trigger a flow and wait',
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
		show: { resource: ['flow'], operation: ['trigger', 'triggerSync'] },
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
				operation: ['trigger', 'triggerSync'],
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
				operation: ['trigger', 'triggerSync'],
			},
		},
	},
	{
		displayName: 'Timeout (seconds)',
		name: 'timeout',
		type: 'number',
		default: 300,
		required: true,
		typeOptions: { minValue: 1 },
		description: 'Maximum number of seconds to wait for the run to complete. Cannot exceed the flow\'s configured timeout.',
		displayOptions: {
			show: {
				resource: ['flow'],
				operation: ['triggerSync'],
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
	if (operation === 'triggerSync') {
		return triggerFlowSync.call(this, itemIndex);
	}
	throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`);
}

function buildBody(
	ctx: IExecuteFunctions,
	itemIndex: number,
): object {
	const passInputItem = ctx.getNodeParameter('passInputItem', itemIndex, false) as boolean;
	const inputJsonRaw = ctx.getNodeParameter('inputJson', itemIndex, '{}') as string | object;

	let extra: Record<string, unknown> = {};
	if (typeof inputJsonRaw === 'string') {
		try {
			extra = JSON.parse(inputJsonRaw || '{}');
		} catch {
			throw new NodeOperationError(ctx.getNode(), 'Invalid JSON in Input field');
		}
	} else if (typeof inputJsonRaw === 'object' && inputJsonRaw !== null) {
		extra = inputJsonRaw as Record<string, unknown>;
	}

	if (passInputItem) {
		const inputItem = ctx.getInputData()?.[itemIndex]?.json ?? {};
		return { ...inputItem, ...extra };
	}
	return extra;
}

async function triggerFlow(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const identifier = getResourceId(this.getNodeParameter('flowIdentifier', itemIndex, ''));
	const body = buildBody(this, itemIndex);

	const response = await noperatorsApiRequest.call(
		this,
		'POST',
		`/flows/${encodeURIComponent(identifier)}/trigger/async`,
		body,
	);

	return [{ json: response as IDataObject, pairedItem: itemIndex }];
}

async function triggerFlowSync(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const identifier = getResourceId(this.getNodeParameter('flowIdentifier', itemIndex, ''));
	const timeout = this.getNodeParameter('timeout', itemIndex, 300) as number;
	const body = buildBody(this, itemIndex);

	const response = await noperatorsApiRequest.call(
		this,
		'POST',
		`/flows/${encodeURIComponent(identifier)}/trigger/sync`,
		body,
		{ timeout: String(timeout) },
		{ timeout: (timeout + 30) * 1000 },
	);

	return [{ json: response as IDataObject, pairedItem: itemIndex }];
}
