![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n-nodes-noperators

This is an n8n community node. It lets you use the [Noperators](https://noperators.com/) browser automation API in your n8n workflows.

Noperators is a browser automation platform that lets you trigger flows, monitor runs, and retrieve artifacts (screenshots, downloads, recordings).

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Resources](#resources)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

> Flow
- Trigger a flow (with optional JSON input)

> Run
- List runs (paginated, with status filter)
- Get a run
- Get run result (output, timing, status)

> Artifact
- List artifacts (screenshots or downloads)
- Download a specific artifact file
- Download session recording (video/mp4)

## Credentials

To use this node, you need:

1. A Noperators account at [noperators.com](https://noperators.com/)
2. Your instance URL (e.g. `https://your-team.noperators.com`)
3. An API key generated from your profile page

## Compatibility

This node is compatible with n8n version 1.0.0 and above.

## Usage

1. **Trigger a flow**: Start a browser automation flow by its ID, ULID, or classifier. Optionally pass JSON input data.
2. **Monitor runs**: List all runs for a flow (filter by status), get details of a specific run, or fetch the output of a completed run.
3. **Download artifacts**: Retrieve screenshots, downloaded files, or session recordings from completed runs.

## Development

```bash
npm install
npm link
npm run dev
```

In a separate terminal, link the package into your n8n custom nodes directory:

```bash
cd ~/.n8n
mkdir -p custom && cd custom
npm init -y
npm link n8n-nodes-noperators
n8n start
```

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [Noperators website](https://noperators.com/)
