import test from 'ava';
// @ts-expect-error 7016
import anyBip44Constants from 'bip44-constants';

import { registeredCoinTypes } from '.';

const bip44Constants = anyBip44Constants as Array<[number, string, string]>;

test('Contains everything from `bip44-constants`', t => {
	for (const row of bip44Constants) {
		const [ derivationPathComponent_ ] = row;
		t.true(
			registeredCoinTypes.some(([ /* coinType */, derivationPathComponent ]) => derivationPathComponent === derivationPathComponent_),
			`Coin type ${JSON.stringify(row)} from 'bip44-constants' exists.`,
		);
	}
});

const snapshotSymbols = new Set([
	'BTC',
	'XMR',
	'DASH',
	'VASH',
]);

for (const symbol of snapshotSymbols) {
	test(`${symbol} snapshot`, t => {
		const records = registeredCoinTypes.filter(coin => coin[2] === symbol);
		t.snapshot(records);
	});
}
