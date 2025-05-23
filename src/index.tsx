import React from "react";
import { ImageResponse } from "@cloudflare/pages-plugin-vercel-og/api";
import { marked, RendererObject } from "marked";
import { Buffer } from 'node:buffer';
import parse from 'html-react-parser';
import * as cheerio from 'cheerio';
import { fonts } from "./fonts";

// satori doesn't support headings/strong/em/code it seems?
const renderer = {
	heading({ tokens, depth }) {
		const text = this.parser.parseInline(tokens);
		return `<span style="font-size: ${60 - (depth - 1) * 10}px;">${text}</span>`;
	},
	strong({ tokens }) {
		const text = this.parser.parseInline(tokens);
		return `<span style="font-weight: bold;">${text}</span>`;
	},
	em({ tokens }) {
		const text = this.parser.parseInline(tokens);
		return `<span style="font-style: italic;">${text}</span>`;
	},
	codespan({ text }) {
		return `<div style="background: #2b2b2b; padding: 2px 4px; border-radius: 5px;">${text}</div>`;
	},
	blockquote({ text }) {
		return `<span><div style="background: #2b2b2b; width: 8px; height: 100%; margin-right: 10px;"></div> ${text}</span>`;
	},
} satisfies RendererObject;

marked.use({ renderer });

async function fetchAsset(asset: URL, env: Env) {
	const file = await env.ASSETS.fetch(asset);

	if (!file.ok) {
		return ``;
	}

	const arrayBuffer = await file.arrayBuffer();
	const base64 = Buffer.from(arrayBuffer).toString('base64');

	return `data:image/png;base64,${base64}`;
}

async function getImageUrl(url: URL, env: Env) {
	if (url.searchParams.has('image')) {
		return `url(${url.searchParams.get('image')})`;
	}

	const asset = new URL('/bg_embed_2.png', url);
	const fetched = await fetchAsset(asset, env);
	return `url("${fetched}")`;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname.startsWith('/api/og')) {
			const text = await marked(url.searchParams.get('text') ?? '', { gfm: true, breaks: true });

			const $ = cheerio.load(text);
			await Promise.all($('img')
				.map(async (i, element) => {
					const src = $(element).attr('src');
					if (src && src.startsWith('/')) {
						const fetchedSrc = await fetchAsset(new URL(src, url), env);
						$(element).attr('src', fetchedSrc);
					}
				})
				.get());
			const html = $("body").html() ?? '';

			const parsed = parse(html);
			const imageUrl = await getImageUrl(url, env);
			
			return new ImageResponse(
				<div
					style={{
						display: 'flex',
						color: 'white',
						background: imageUrl,
						backgroundRepeat: 'no-repeat',
						backgroundSize: '100% 100%',
						width: '100%',
						height: '100%',
						flexDirection: 'column',
						justifyContent: 'center',
						alignItems: 'center',
					}}
				>
					{parsed}
				</div>,
				{
					width: 1200,
					height: 630,
					fonts
				}
			);
		} else if (url.pathname === '/robots.txt') {
			return new Response('User-agent: *\nDisallow: /');
		} else {
			const response = await env.ASSETS.fetch(request);
			if (response.ok) {
				return response;
			} else {
				return new Response(`
					<!DOCTYPE html>
					<html lang="en">
					<head>
						<meta charset="UTF-8" />
						<meta name="color-scheme" content="light dark" />
						<meta name="viewport" content="width=device-width, initial-scale=1.0" />
						<title>API Documentation</title>
						<style>
						body {
							font-family: system-ui, sans-serif;
							max-width: 640px;
							margin: 2rem auto;
							padding: 1rem;
							line-height: 1.6;
							background-color: var(--bg, white);
							color: var(--fg, black);
						}

						@media (prefers-color-scheme: dark) {
							:root {
							--bg: #121212;
							--fg: #f0f0f0;
							}
						}

						code {
							background: rgba(128, 128, 128, 0.1);
							padding: 0.2em 0.4em;
							border-radius: 4px;
							font-size: 0.95em;
						}

						h1 {
							font-size: 2rem;
							margin-bottom: 0.5em;
						}

						h2 {
							margin-top: 2rem;
							font-size: 1.5rem;
						}

						.endpoint {
							font-weight: bold;
							font-family: monospace;
						}
						</style>
					</head>
					<body>
						<h1>API Documentation</h1>

						<p class="endpoint">GET /api/og</p>

						<h2>Query Parameters</h2>
						<ul>
						<li>
							<code>text</code> (optional): A string of <strong>Markdown-formatted</strong> text to render on the image.
							<br />
							<small>Example: <code># Hello **world**</code></small>
						</li>
						<li>
							<code>image</code> (optional): URL of a background image to use.
							<br />
							<small>Example: <code>https://example.com/bg.png</code></small>
						</li>
						</ul>

						<h2>Example</h2>
						<p>
						<code
							>/api/og?text=%23%20Hello%20World&image=https://example.com/bg.png</code
						>
						</p>
					</body>
					</html>
				`, { headers: { 'Content-Type': 'text/html' }})
			}
		}
	},
} satisfies ExportedHandler<Env>;