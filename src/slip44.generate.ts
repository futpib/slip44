import fs from 'node:fs/promises';
import path from 'node:path';
import fetch from 'node-fetch';
import { outdent } from 'outdent';

interface ParsedCoin {
	title: undefined | string;
	url: undefined | string;
}

interface ParsedRow extends ParsedCoin {
	coinType: number;
	derivationPathComponent: number;
	symbol: undefined | string;
}

function parseCoin(
	coin: string,
): ParsedCoin {
	let title;
	let url;

	if (coin) {
		const regExpExecArray = /^\[(.+?)]\((.+?)\)$/.exec(coin);

		if (regExpExecArray) {
			[ /* match */, title, url ] = regExpExecArray;
		} else {
			title = coin;
		}
	}

	return { title, url };
}

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

	const rows = (
		text
			.split('\n')
			.map(line => line.split('|'))
			.filter(columns => columns.length === 4)
			.map(columns => columns.map(column => column.trim()))
			.map(([
				coinType,
				derivationPathComponent,
				symbol,
				coin,
			]): ParsedRow => ({
				coinType: Number.parseInt(coinType, 10),
				derivationPathComponent: Number.parseInt(derivationPathComponent, 16),
				symbol: symbol ? symbol : undefined,
				...parseCoin(coin),
			}))
			.filter(({
				coinType,
				derivationPathComponent,
				title,
			}) => (
				Number.isSafeInteger(coinType)
					&& Number.isSafeInteger(derivationPathComponent)
					&& title
			))
	);

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
			];

			export const registeredCoinTypes: RegisteredCoinType[] = [
		`,
		...rows.map(({
			coinType,
			derivationPathComponent,
			symbol,
			title,
			url,
		}) => (
			outdent`
				[
					${stringify(coinType)},
					${stringifyHex(derivationPathComponent)},
					${stringify(symbol)},
					${stringify(title)},
					${stringify(url)},
				],
			`
		)),
		'];',
	].join('\n');

	await fs.writeFile(path.join(__dirname, 'slip44.ts'), typescript);
}

void main();
