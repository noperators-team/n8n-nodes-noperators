import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { noperatorsApiRequest, noperatorsApiRequestBinary, newResourceLocator, getResourceId } from '../../utils';

export const artifactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['artifact'],
			},
		},
		options: [
			{
				name: 'Download Artifact',
				value: 'downloadArtifact',
				description: 'Download a specific artifact file',
				action: 'Download an artifact',
			},
			{
				name: 'Download Recording',
				value: 'downloadRecording',
				description: 'Download the session recording (video/mp4)',
				action: 'Download recording',
			},
			{
				name: 'List Artifacts',
				value: 'listArtifacts',
				description: 'List artifact files for a given type',
				action: 'List artifacts',
			},
		],
		default: 'listArtifacts',
	},
];

export const artifactParameters: INodeProperties[] = [
	newResourceLocator({
		displayName: 'Flow',
		name: 'flowIdentifier',
		label: 'flow',
		searchListMethod: 'searchFlows',
		show: { resource: ['artifact'] },
	}),
	newResourceLocator({
		displayName: 'Run',
		name: 'runId',
		label: 'run',
		searchListMethod: 'searchRuns',
		show: { resource: ['artifact'] },
	}),
	{
		displayName: 'Artifact Type',
		name: 'artifactType',
		type: 'options',
		required: true,
		default: 'screenshots',
		options: [
			{ name: 'Screenshots', value: 'screenshots' },
			{ name: 'Downloads', value: 'downloads' },
		],
		displayOptions: {
			show: {
				resource: ['artifact'],
				operation: ['listArtifacts', 'downloadArtifact'],
			},
		},
	},
	{
		displayName: 'Filename',
		name: 'filename',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. screenshot-1.png',
		description: 'The name of the artifact file to download',
		displayOptions: {
			show: {
				resource: ['artifact'],
				operation: ['downloadArtifact'],
			},
		},
	},
	{
		displayName: 'Binary Property',
		name: 'binaryProperty',
		type: 'string',
		default: 'data',
		description: 'Name of the binary property to write the downloaded file to',
		displayOptions: {
			show: {
				resource: ['artifact'],
				operation: ['downloadRecording', 'downloadArtifact'],
			},
		},
	},
];

export async function executeArtifactOperation(
	this: IExecuteFunctions,
	item: INodeExecutionData,
	itemIndex: number,
	operation: string,
): Promise<INodeExecutionData[]> {
	switch (operation) {
		case 'listArtifacts':
			return listArtifacts.call(this, itemIndex);
		case 'downloadRecording':
			return downloadRecording.call(this, itemIndex);
		case 'downloadArtifact':
			return downloadArtifact.call(this, itemIndex);
		default:
			throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`);
	}
}

async function listArtifacts(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const identifier = getResourceId(this.getNodeParameter('flowIdentifier', itemIndex, ''));
	const runId = getResourceId(this.getNodeParameter('runId', itemIndex, ''));
	const artifactType = this.getNodeParameter('artifactType', itemIndex, 'screenshots') as string;

	const response = await noperatorsApiRequest.call(
		this,
		'GET',
		`/flows/${encodeURIComponent(identifier)}/runs/${runId}/artifacts/${artifactType}`,
	);

	if (Array.isArray(response)) {
		return response.map((file: IDataObject) => ({
			json: file,
			pairedItem: itemIndex,
		}));
	}

	return [{ json: response as IDataObject, pairedItem: itemIndex }];
}

async function downloadRecording(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const identifier = getResourceId(this.getNodeParameter('flowIdentifier', itemIndex, ''));
	const runId = getResourceId(this.getNodeParameter('runId', itemIndex, ''));
	const binaryProperty = this.getNodeParameter('binaryProperty', itemIndex, 'data') as string;

	const response = await noperatorsApiRequestBinary.call(
		this,
		`/flows/${encodeURIComponent(identifier)}/runs/${runId}/recording`,
	);

	const binaryData = await this.helpers.prepareBinaryData(
		Buffer.from(response.body),
		`recording-run-${runId}.mp4`,
		'video/mp4',
	);

	return [{
		json: { run_id: runId } as IDataObject,
		binary: { [binaryProperty]: binaryData },
		pairedItem: itemIndex,
	}];
}

async function downloadArtifact(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const identifier = getResourceId(this.getNodeParameter('flowIdentifier', itemIndex, ''));
	const runId = getResourceId(this.getNodeParameter('runId', itemIndex, ''));
	const artifactType = this.getNodeParameter('artifactType', itemIndex, 'screenshots') as string;
	const filename = this.getNodeParameter('filename', itemIndex, '') as string;
	const binaryProperty = this.getNodeParameter('binaryProperty', itemIndex, 'data') as string;

	const response = await noperatorsApiRequestBinary.call(
		this,
		`/flows/${encodeURIComponent(identifier)}/runs/${runId}/artifacts/${artifactType}/${encodeURIComponent(filename)}`,
	);

	const contentType = response.headers?.['content-type'] || 'application/octet-stream';

	const binaryData = await this.helpers.prepareBinaryData(
		Buffer.from(response.body),
		filename,
		contentType,
	);

	return [{
		json: { run_id: runId, artifact_type: artifactType, filename } as IDataObject,
		binary: { [binaryProperty]: binaryData },
		pairedItem: itemIndex,
	}];
}
