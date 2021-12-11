# slip44

> TypeScript version of https://github.com/satoshilabs/slips/blob/master/slip-0044.md

[![npm](https://shields.io/npm/v/slip44)](https://www.npmjs.com/package/slip44) [![Coverage Status](https://coveralls.io/repos/github/futpib/slip44/badge.svg?branch=master)](https://coveralls.io/github/futpib/slip44?branch=master)

TypeScript code is [updated daily automatically](https://github.com/futpib/slip44/actions/workflows/generate.yml) from [slips](https://github.com/satoshilabs/slips/blob/master/slip-0044.md).

## Usage

```typescript
import { registeredCoinTypes } from 'slip44';

registeredCoinTypes.find(([
	_coinType,
	_derivationPathComponent,
	symbol,
	_name,
	_url,
	_comment
]) => {
	return symbol === 'BTC';
});

//  [ 0, 2147483648, 'BTC', 'Bitcoin', 'https://bitcoin.org', undefined ]
```
