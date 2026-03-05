import type { IExecuteFunctions, IHttpRequestOptions, INodeProperties } from 'n8n-workflow';

const API_BASE = '/api/v1';

export function getResourceId(resourceLocatorValue: any): string {
	if (typeof resourceLocatorValue === 'string') {
		return resourceLocatorValue;
	}
	if (typeof resourceLocatorValue === 'number') {
		return String(resourceLocatorValue);
	}
	if (resourceLocatorValue?.value !== undefined && resourceLocatorValue?.value !== null) {
		return String(resourceLocatorValue.value);
	}
	throw new Error('Invalid resource locator value');
}

interface ResourceLocatorOptions {
	displayName: string;
	name: string;
	label?: string;
	searchListMethod: string;
	placeholder?: string;
	show?: Record<string, string[]>;
	hide?: Record<string, string[]>;
	required?: boolean;
}

export function newResourceLocator({
	displayName, name, label, searchListMethod, placeholder, show, hide, required = true,
}: ResourceLocatorOptions): INodeProperties {
	const properties: INodeProperties = {
		displayName,
		name,
		type: 'resourceLocator',
		required,
		default: { mode: 'list', value: '' },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: placeholder || `Select a ${label || 'item'}...`,
				typeOptions: {
					searchListMethod,
					searchable: true,
				},
			},
			{
				displayName: 'By ID / ULID / Classifier',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 42, 01HXYZ..., my-flow-slug',
			},
		],
	};

	if (show) {
		properties.displayOptions = { ...properties.displayOptions, show };
	}
	if (hide) {
		properties.displayOptions = { ...properties.displayOptions, hide };
	}

	return properties;
}

export async function noperatorsApiRequest(
	this: IExecuteFunctions,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE',
	path: string,
	body?: object,
	qs?: Record<string, string | number>,
): Promise<unknown> {
	const credentials = await this.getCredentials('noperatorsApi') as {
		instanceUrl?: string;
		apiKey?: string;
	};
	const baseUrl = credentials?.instanceUrl?.replace(/\/$/, '');

	let url = `${baseUrl}${API_BASE}${path}`;

	if (qs) {
		const parts: string[] = [];
		for (const [key, value] of Object.entries(qs)) {
			if (value !== undefined && value !== null && value !== '') {
				parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
			}
		}
		if (parts.length > 0) {
			url += `?${parts.join('&')}`;
		}
	}

	const options: IHttpRequestOptions = {
		method,
		url,
		json: true,
		headers: {
			'Content-Type': 'application/json',
		},
	};

	if (body && Object.keys(body).length > 0) {
		options.body = body;
	}

	return this.helpers.httpRequestWithAuthentication.call(
		this,
		'noperatorsApi',
		options,
	);
}

export async function noperatorsSearchRequest(
	context: { helpers: any; getCredentials: (name: string) => Promise<any> },
	path: string,
	qs?: Record<string, string>,
): Promise<any> {
	const credentials = await context.getCredentials('noperatorsApi') as {
		instanceUrl?: string;
		apiKey?: string;
	};
	const baseUrl = credentials?.instanceUrl?.replace(/\/$/, '');
	let url = `${baseUrl}${API_BASE}${path}`;

	if (qs) {
		const parts: string[] = [];
		for (const [key, value] of Object.entries(qs)) {
			if (value !== undefined && value !== null && value !== '') {
				parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
			}
		}
		if (parts.length > 0) {
			url += `?${parts.join('&')}`;
		}
	}

	const response = await context.helpers.httpRequestWithAuthentication.call(context, 'noperatorsApi', {
		method: 'GET',
		url,
		json: true,
	});

	return response;
}

export async function noperatorsApiRequestBinary(
	this: IExecuteFunctions,
	path: string,
): Promise<{ body: Buffer; headers: Record<string, string> }> {
	const credentials = await this.getCredentials('noperatorsApi') as {
		instanceUrl?: string;
		apiKey?: string;
	};
	const baseUrl = credentials?.instanceUrl?.replace(/\/$/, '');
	const url = `${baseUrl}${API_BASE}${path}`;

	const response = await this.helpers.httpRequestWithAuthentication.call(
		this,
		'noperatorsApi',
		{
			method: 'GET',
			url,
			returnFullResponse: true,
			encoding: 'arraybuffer',
			json: false,
		},
	) as { body: Buffer; headers: Record<string, string> };

	return response;
}
