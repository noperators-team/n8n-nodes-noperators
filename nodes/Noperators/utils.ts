import type { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';

const API_BASE = '/api/v1';

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
