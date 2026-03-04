import {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class NoperatorsApi implements ICredentialType {
	name = 'noperatorsApi';
	displayName = 'Noperators API';
	icon: Icon = { light: 'file:noperators.svg', dark: 'file:noperators.svg' };
	documentationUrl = 'https://noperators.com/';
	properties: INodeProperties[] = [
		{
			displayName: 'Instance URL',
			name: 'instanceUrl',
			type: 'string',
			required: true,
			typeOptions: {
				url: true,
			},
			default: 'https://your-team.noperators.com',
			description: 'Your Noperators instance URL (e.g. https://your-team.noperators.com)',
			placeholder: 'https://your-team.noperators.com',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			required: true,
			default: '',
			description: 'API key generated from your Noperators profile page',
			placeholder: 'Enter your API key here',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Authorization': '=Bearer {{ $credentials?.apiKey }}',
			},
		},
	};
	test: ICredentialTestRequest = {
		request: {
			method: 'GET',
			baseURL: '={{$credentials?.instanceUrl}}',
			url: '/api/v1/flows/test/runs',
			ignoreHttpStatusErrors: true,
			skipSslCertificateValidation: true
		},
	};
}
