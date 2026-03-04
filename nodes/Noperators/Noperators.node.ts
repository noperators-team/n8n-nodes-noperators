import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { flowOperations, flowParameters, executeFlowOperation } from './actions/flow/flow';
import { searchFlows } from './actions/flow/search';
import { runOperations, runParameters, executeRunOperation } from './actions/run/run';
import { searchRuns } from './actions/run/search';
import { artifactOperations, artifactParameters, executeArtifactOperation } from './actions/artifact/artifact';

export class Noperators implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Noperators',
		name: 'noperators',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:noperators.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Trigger browser automation flows, fetch run results, and download artifacts via the Noperators API',
		defaults: {
			name: 'Noperators',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'noperatorsApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Artifact',
						value: 'artifact',
					},
					{
						name: 'Flow',
						value: 'flow',
					},
					{
						name: 'Run',
						value: 'run',
					},
				],
				default: 'flow',
			},
			...flowOperations,
			...runOperations,
			...artifactOperations,
			...flowParameters,
			...runParameters,
			...artifactParameters,
		],
	};

	methods = {
		listSearch: {
			searchFlows,
			searchRuns,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0, 'flow') as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i, '') as string;
				let results: INodeExecutionData[];

				switch (resource) {
					case 'flow':
						results = await executeFlowOperation.call(this, items[i], i, operation);
						break;
					case 'run':
						results = await executeRunOperation.call(this, items[i], i, operation);
						break;
					case 'artifact':
						results = await executeArtifactOperation.call(this, items[i], i, operation);
						break;
					default:
						throw new NodeOperationError(this.getNode(), `Unsupported resource: ${resource}`);
				}

				returnData.push(...results);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: i,
					});
				} else {
					if ((error as NodeOperationError).context) {
						(error as NodeOperationError).context.itemIndex = i;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
				}
			}
		}

		return [returnData];
	}
}
