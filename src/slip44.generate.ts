import fs from 'node:fs/promises';
import path from 'node:path';
import fetch from 'node-fetch';
import { outdent } from 'outdent';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkGfm from 'remark-gfm';
import unified from 'unified';
import visit from 'unist-util-visit';
import type { Text, Link, TableRow, TableCell } from 'mdast';
import { z } from 'zod';

export const remark = unified().use(remarkParse).use(remarkStringify).use(remarkGfm).freeze();

const parsedRowSchema = z.object({
	coinType: z.number().int().nonnegative(),
	derivationPathComponent: z.number().int().gte(0x80_00_00_00),
	symbol: z.string().optional(),
	title: z.string().optional(),
	url: z.string().optional(),
	comment: z.string().optional(),
});

type ParsedRow = z.infer<typeof parsedRowSchema>;

function stringify(x: undefined | number | string): string {
	if (x === undefined) {
		return 'undefined';
	}

	return JSON.stringify(x);
}

function stringifyHex(x: number): string {
	return `0x${x.toString(16)}`;
}

async function main() {
	const response = await fetch('https://raw.githubusercontent.com/satoshilabs/slips/master/slip-0044.md');
	const text = await response.text();

	const rootMarkdownAst = remark.parse(text);
	const rows: ParsedRow[] = [];

	visit<TableRow>(rootMarkdownAst, 'tableRow', tableRow => {
		const [
			coinTypeTableCell,
			derivationPathComponentTableCell,
			symbolTableCell,
			coinDescriptionTableCell,
		] = tableRow.children as Array<undefined | TableCell>;

		const coinType = (
			coinTypeTableCell
				&& Number.parseInt(remark.stringify(coinTypeTableCell).trim(), 10)
		);

		const derivationPathComponent = (
			derivationPathComponentTableCell
				&& Number.parseInt(remark.stringify(derivationPathComponentTableCell).trim(), 16)
		);

		const symbol = (
			symbolTableCell
				&& remark.stringify(symbolTableCell).trim()
		) || undefined;

		let title: undefined | string;
		let url: undefined | string;
		let comment: undefined | string;

		if (coinDescriptionTableCell) {
			visit<Text>(coinDescriptionTableCell, 'text', node => {
				if (title) {
					comment = node.value.trim();
				} else {
					title = node.value.trim();
				}
			});

			visit<Link>(coinDescriptionTableCell, 'link', node => {
				url = node.url;
				title = (
					node.children
						.map(child => remark.stringify(child).trim())
						.join(' ')
				).trim();
			});
		}

		const parsedRow = parsedRowSchema.safeParse({
			coinType,
			derivationPathComponent,
			/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
			symbol: symbol?.trim() || undefined,
			title: title?.trim() || undefined,
			url: url?.trim() || undefined,
			comment: comment?.trim() || undefined,
			/* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
		});

		if (
			parsedRow.success
				&& (
					parsedRow.data.symbol
						|| parsedRow.data.title
						|| parsedRow.data.url
						|| parsedRow.data.comment
				)
		) {
			rows.push(parsedRow.data);
		}
	});

	const typescript = [
		outdent`
			export type RegisteredCoinSymbol =
		`,
		...rows.flatMap(({ symbol }) => symbol ? [ symbol ] : []).map(symbol => (
			outdent`
				| ${stringify(symbol)}
			`
		)),
		';',

		outdent`
			export type RegisteredCoinType = [
				coinType: number,
				derivationPathComponent: number,
				symbol: undefined | RegisteredCoinSymbol,
				name: string,
				url: undefined | string,
				comment: undefined | string,
			];

			export const registeredCoinTypes: RegisteredCoinType[] = [
		`,
		...rows.map(({
			coinType,
			derivationPathComponent,
			symbol,
			title,
			url,
			comment,
		}) => (
			outdent`
				[
					${stringify(coinType)},
					${stringifyHex(derivationPathComponent)},
					${stringify(symbol)},
					${stringify(title)},
					${stringify(url)},
					${stringify(comment)},
				],
			`
		)),
		'];',
	].join('\n');

	await fs.writeFile(path.join(__dirname, 'slip44.ts'), typescript);
}

void main();
