# ser-kit

Companion library for ser, the smart execution router.

Features:

- query execution routes from ser
- rank execution routes for choosing the most frictionless option
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
const state = [] // mutable execution state
const result = execute(actions, state, provider)
```

ser-kit uses two phases, planning and execution. Planning yields a sequence of actions (see `ExecutionAction` type).
This indirection allows giving users a sense of all steps required for execution before prompting for the first signature.
It also allows customization of individual execution steps, for example for setting the gas price or using a specific transaction nonce.

The `execute` function sequentially executes the actions using the given provider.
It updates the given state array in place, so that the outcome of the action at index `i` is written at `state[i]`.
If execution fails half-way through the plan, the partial state can be passed as input when retrying so execution is picked up again from that point on.

## Contributing

### Prerequisites

#### bun

This project uses [Bun](https://bun.sh), a fast all-in-one JavaScript runtime.
To install bun follow the instructions at https://bun.sh/docs/installation.

#### anvil

Install through `foundryup`: https://book.getfoundry.sh/getting-started/installation#using-foundryup

To install project dependencies:

```bash
bun install
```

To run tests:

```bash
bun test
```
