# ser-kit

Companion library for ser, the smart execution router.

Features:

- query execution routes from ser
- rank execution routes for choosing the most frictionless alternative
- encode calls through a given execution route

## Concepts

**Avatar** – The smart contract account that is being controlled

**Initiator** – The EOA that provides the signature for the transaction

**Route** – A list of waypoint along which the execution of the meta transaction flows, from the initiator to the avatar

**Waypoint** – Each waypoint represents a blockchain address. The waypoint properties identify the type of the account or contract at that address as well as how it is connected to the previous waypoint.

## Usage

```ts
import { queryRoutes, rankRoutes, encodeExecution } from 'ser-kit'

// 1. retrieve all execution routes from `eoaSignerAddress` as initiator, controlling `safeAddress` as avatar
const routes = await queryRoutes(eoaSignerAddress, safeAddress)

// 2. choose the most frictionless route
const rankedRoutes = rankRoutes(routes)
const bestRoute = rankedRoutes[0]

// 3. determine actions for getting the transaction executed through that route
const actions = planExecution(metaTx, bestRoute)

// 4. execute these actions using the provided EIP-1193 provider
const result = execute(actions, provider)
```

## Contributing

This project uses [Bun](https://bun.sh), a fast all-in-one JavaScript runtime.
To install bun follow the instructions at https://bun.sh/docs/installation.

To install project dependencies:

```bash
bun install
```

To run tests:

```bash
bun test
```
