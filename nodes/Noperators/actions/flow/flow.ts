import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject, ResourceMapperValue } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { noperatorsApiRequest, newResourceLocator, getResourceId } from '../../utils';

const TERMINAL_STATUSES = ['success', 'error', 'cancelled'];

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
				description: 'Trigger a flow and return immediately',
				action: 'Trigger a flow',
			},
			{
				name: 'Trigger & Poll',
				value: 'triggerPoll',
				description: 'Trigger a flow and poll until it completes',
				action: 'Trigger a flow and poll',
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
		show: { resource: ['flow'], operation: ['trigger', 'triggerPoll'] },
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
				operation: ['trigger', 'triggerPoll'],
			},
		},
	},
	{
		displayName: 'Flow Input Fields',
		name: 'flowInputFields',
		type: 'resourceMapper',
		noDataExpression: true,
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		typeOptions: {
			loadOptionsDependsOn: ['flowIdentifier.value'],
			resourceMapper: {
				resourceMapperMethod: 'getFlowInputFields',
				mode: 'add',
				fieldWords: {
					singular: 'input field',
					plural: 'input fields',
				},
				addAllFields: true,
				supportAutoMap: true,
				multiKeyMatch: false,
			},
		},
		displayOptions: {
			show: {
				resource: ['flow'],
				operation: ['trigger', 'triggerPoll'],
			},
		},
		description: 'Fields from the flow\'s default inputs. Fill in values to override them when triggering.',
	},
	{
		displayName: 'Additional JSON Input Data',
		name: 'inputJson',
		type: 'json',
		default: '{}',
		description: 'JSON input to pass to the flow. When "Pass Input Item as Data" is enabled, this is merged on top of the incoming item. Merged after Flow Input Fields.',
		displayOptions: {
			show: {
				resource: ['flow'],
				operation: ['trigger', 'triggerPoll'],
			},
		},
	},
	{
		displayName: 'Polling Interval (Seconds)',
		name: 'pollInterval',
		type: 'number',
		default: 5,
		required: true,
		typeOptions: { minValue: 1 },
		description: 'How often to check if the run has completed',
		displayOptions: {
			show: {
				resource: ['flow'],
				operation: ['triggerPoll'],
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
	if (operation === 'triggerPoll') {
		return triggerFlowPoll.call(this, itemIndex);
	}
	throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`);
}

function buildBody(ctx: IExecuteFunctions, itemIndex: number): object {
	const passInputItem = ctx.getNodeParameter('passInputItem', itemIndex, false) as boolean;
	const inputJsonRaw = ctx.getNodeParameter('inputJson', itemIndex, '{}') as string | object;

	let mappedValues: Record<string, unknown> = {};
	try {
		const mapped = ctx.getNodeParameter('flowInputFields', itemIndex, {}) as Partial<ResourceMapperValue>;
		if (mapped?.value && typeof mapped.value === 'object') {
			for (const [k, v] of Object.entries(mapped.value)) {
				if (v !== null && v !== undefined && v !== '') {
					mappedValues[k] = v;
				}
			}
		}
	} catch {
		// field not available yet (no flow selected)
	}

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
		return { ...inputItem, ...mappedValues, ...extra };
	}
	return { ...mappedValues, ...extra };
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
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
		`/flows/${encodeURIComponent(identifier)}/trigger`,
		body,
	);

	return [{ json: response as IDataObject, pairedItem: itemIndex }];
}

async function triggerFlowPoll(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const identifier = getResourceId(this.getNodeParameter('flowIdentifier', itemIndex, ''));
	const pollInterval = this.getNodeParameter('pollInterval', itemIndex, 5) as number;
	const body = buildBody(this, itemIndex);

	const triggerResponse = await noperatorsApiRequest.call(
		this,
		'POST',
		`/flows/${encodeURIComponent(identifier)}/trigger`,
		body,
	) as { run_id: number };

	const basePath = `/flows/${encodeURIComponent(identifier)}/runs/${triggerResponse.run_id}`;

	while (true) {
		await sleep(pollInterval * 1000);

		const run = await noperatorsApiRequest.call(this, 'GET', basePath) as Record<string, unknown>;

		if (TERMINAL_STATUSES.includes(run.status as string)) {
			return [{ json: run as IDataObject, pairedItem: itemIndex }];
		}
	}
}
