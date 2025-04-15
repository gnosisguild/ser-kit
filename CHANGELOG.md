# Changelog

## [3.7.0](https://github.com/gnosisguild/ser-kit/compare/v3.6.0...v3.7.0) (2025-04-15)


### Features

* add sonic, celo, berachain support ([#69](https://github.com/gnosisguild/ser-kit/issues/69)) ([dbbaa6d](https://github.com/gnosisguild/ser-kit/commit/dbbaa6d1b285e43b13e92b13c49be1f5e60980aa))

## [3.6.0](https://github.com/gnosisguild/ser-kit/compare/v3.5.1...v3.6.0) (2025-03-19)


### Features

* determine allowing role if there are multiple candidates in `planExecution` ([#67](https://github.com/gnosisguild/ser-kit/issues/67)) ([936e090](https://github.com/gnosisguild/ser-kit/commit/936e09007ea085d243ba3164fc26df07bc04eb7b))

## [3.5.1](https://github.com/gnosisguild/ser-kit/compare/v3.5.0...v3.5.1) (2025-03-18)


### Bug Fixes

* checkPermissions should never throw ([#64](https://github.com/gnosisguild/ser-kit/issues/64)) ([64c476e](https://github.com/gnosisguild/ser-kit/commit/64c476e4914bce50bcf663a3028c56306f09f153))

## [3.5.0](https://github.com/gnosisguild/ser-kit/compare/v3.4.1...v3.5.0) (2025-03-17)


### Features

* a friendly API for manual route building ([#62](https://github.com/gnosisguild/ser-kit/issues/62)) ([f2fe217](https://github.com/gnosisguild/ser-kit/commit/f2fe21735925cf6c668c13591b4a3dca6cde91d3))

## [3.4.1](https://github.com/gnosisguild/ser-kit/compare/v3.4.0...v3.4.1) (2025-03-14)


### Bug Fixes

* in some cases revert data was not detected in permission check ([#60](https://github.com/gnosisguild/ser-kit/issues/60)) ([22106a2](https://github.com/gnosisguild/ser-kit/commit/22106a2bd3dd2b5446191e5843f7927aa747d1f3))

## [3.4.0](https://github.com/gnosisguild/ser-kit/compare/v3.3.0...v3.4.0) (2025-03-14)


### Features

* better error message when trying to execute without a role ([#56](https://github.com/gnosisguild/ser-kit/issues/56)) ([8dbd927](https://github.com/gnosisguild/ser-kit/commit/8dbd927140d376ba97f3370f1627a29b1f2b0bef))


### Bug Fixes

* don't throw if permission check reverts without revert data ([#59](https://github.com/gnosisguild/ser-kit/issues/59)) ([80ae6e1](https://github.com/gnosisguild/ser-kit/commit/80ae6e1dc383a6d2780fa674c6406a32044f23e9))

## [3.3.0](https://github.com/gnosisguild/ser-kit/compare/v3.2.0...v3.3.0) (2025-03-10)


### Features

* execute immediately as owner of Safe with threshold `1` ([#52](https://github.com/gnosisguild/ser-kit/issues/52)) ([4cdfe2e](https://github.com/gnosisguild/ser-kit/commit/4cdfe2e864f671de67010f7beb40141f9da174e6))

## [3.2.0](https://github.com/gnosisguild/ser-kit/compare/v3.1.1...v3.2.0) (2025-03-07)


### Features

* check role permissions ([#51](https://github.com/gnosisguild/ser-kit/issues/51)) ([c6ccf18](https://github.com/gnosisguild/ser-kit/commit/c6ccf180c5274b70df3feafe7a35189a3e017e2e))

## [3.1.1](https://github.com/gnosisguild/ser-kit/compare/v3.1.0...v3.1.1) (2025-02-19)


### Bug Fixes

* pass safe address as checksum-address to safekit ([#46](https://github.com/gnosisguild/ser-kit/issues/46)) ([c07f607](https://github.com/gnosisguild/ser-kit/commit/c07f6075816aef1952bc66a81d1cd13d903376bb))

## [3.1.0](https://github.com/gnosisguild/ser-kit/compare/v3.0.0...v3.1.0) (2025-02-17)


### Features

* export `calculateRouteId` ([#43](https://github.com/gnosisguild/ser-kit/issues/43)) ([0667504](https://github.com/gnosisguild/ser-kit/commit/06675047cc5758efe54d7382d9f8a7779b97c6bc))
* export type `Contract` ([#45](https://github.com/gnosisguild/ser-kit/issues/45)) ([441a43a](https://github.com/gnosisguild/ser-kit/commit/441a43abcd2e9f69074602112f1fe774ca5cc7df))

## [3.0.0](https://github.com/gnosisguild/ser-kit/compare/v2.0.1...v3.0.0) (2025-02-13)


### ⚠ BREAKING CHANGES

* `queryAvatars` does **not** return a list of routes anymore, but a list of prefixed addresses
* `queryInitiators` does **not** return a list of routes anymore, but a list of addresses

### Features

* adds export for the `rankRoutes` method ([09d7a29](https://github.com/gnosisguild/ser-kit/commit/09d7a29bd1cb82b4bc1d50ce311f4ff20fe8115c))


### Bug Fixes

* `queryAvatars` does **not** return a list of routes anymore, but a list of prefixed addresses ([09d7a29](https://github.com/gnosisguild/ser-kit/commit/09d7a29bd1cb82b4bc1d50ce311f4ff20fe8115c))
* `queryInitiators` does **not** return a list of routes anymore, but a list of addresses ([09d7a29](https://github.com/gnosisguild/ser-kit/commit/09d7a29bd1cb82b4bc1d50ce311f4ff20fe8115c))

## [2.0.1](https://github.com/gnosisguild/ser-kit/compare/v2.0.0...v2.0.1) (2025-02-09)


### Bug Fixes

* api base url ([#37](https://github.com/gnosisguild/ser-kit/issues/37)) ([6901e1d](https://github.com/gnosisguild/ser-kit/commit/6901e1d84ac5e7fa023beaa1e8bef27e2458f0a9))

## [2.0.0](https://github.com/gnosisguild/ser-kit/compare/v1.1.0...v2.0.0) (2025-01-30)


### ⚠ BREAKING CHANGES

* `formatPrefixedAddress` renamed to `prefixAddress`
* `parsePrefixedAddress` renamed to `unprefixAddress`
* generally handle addresses in lowercase representation ([#35](https://github.com/gnosisguild/ser-kit/issues/35))

### Bug Fixes

* generally handle addresses in lowercase representation ([#35](https://github.com/gnosisguild/ser-kit/issues/35)) ([ea31896](https://github.com/gnosisguild/ser-kit/commit/ea31896b99bbfa564281f0cf9b0af245b454fc4c)), closes [#31](https://github.com/gnosisguild/ser-kit/issues/31)
* narrow `TransactionRequest` type to indicate it's serializable ([#33](https://github.com/gnosisguild/ser-kit/issues/33)) ([946b81b](https://github.com/gnosisguild/ser-kit/commit/946b81b80106bb96ebe9a73e0614a314ac0e81b0)), closes [#32](https://github.com/gnosisguild/ser-kit/issues/32)


### Miscellaneous Chores

* `formatPrefixedAddress` renamed to `prefixAddress` ([ea31896](https://github.com/gnosisguild/ser-kit/commit/ea31896b99bbfa564281f0cf9b0af245b454fc4c))
* `parsePrefixedAddress` renamed to `unprefixAddress` ([ea31896](https://github.com/gnosisguild/ser-kit/commit/ea31896b99bbfa564281f0cf9b0af245b454fc4c))

## [1.1.0](https://github.com/gnosisguild/ser-kit/compare/v1.0.7...v1.1.0) (2025-01-09)


### Features

* new options for Safe transaction `nonce`: override and enqueue ([#28](https://github.com/gnosisguild/ser-kit/issues/28)) ([2ed336c](https://github.com/gnosisguild/ser-kit/commit/2ed336cbad514bfd3072fa47ad53fed8be0fe4b2)), closes [#24](https://github.com/gnosisguild/ser-kit/issues/24)
* normalize routes ([#27](https://github.com/gnosisguild/ser-kit/issues/27)) ([173c892](https://github.com/gnosisguild/ser-kit/commit/173c892394378aaff698484e9cde5f4296351cbd)), closes [#26](https://github.com/gnosisguild/ser-kit/issues/26)
* replace assert with invariant in code to not require node environment ([#30](https://github.com/gnosisguild/ser-kit/issues/30)) ([de85648](https://github.com/gnosisguild/ser-kit/commit/de856483635c76a51c338df23f4eb9107383b390)), closes [#20](https://github.com/gnosisguild/ser-kit/issues/20)

## [1.0.7](https://github.com/gnosisguild/ser-kit/compare/v1.0.6...v1.0.7) (2024-12-20)


### Bug Fixes

* Safe as Initiator ([#22](https://github.com/gnosisguild/ser-kit/issues/22)) ([f37793b](https://github.com/gnosisguild/ser-kit/commit/f37793bbe0dfe1bd4a696fc7e433f3570f012eab))

## [1.0.6](https://github.com/gnosisguild/ser-kit/compare/v1.0.5...v1.0.6) (2024-12-16)


### Bug Fixes

* TxService Checksum ([#18](https://github.com/gnosisguild/ser-kit/issues/18)) ([e58d0f7](https://github.com/gnosisguild/ser-kit/commit/e58d0f73e30248af35bbf6cfd14587a901b2ecb9))

## [1.0.5](https://github.com/gnosisguild/ser-kit/compare/v1.0.4...v1.0.5) (2024-12-16)


### Bug Fixes

* work around cjs interop quirks of api-kit ([#16](https://github.com/gnosisguild/ser-kit/issues/16)) ([3d7a898](https://github.com/gnosisguild/ser-kit/commit/3d7a898e20acbf41af261374cb61aca0f04724d4))

## [1.0.4](https://github.com/gnosisguild/ser-kit/compare/v1.0.3...v1.0.4) (2024-12-14)


### Bug Fixes

* error when not supplying a provider ([#13](https://github.com/gnosisguild/ser-kit/issues/13)) ([80ccfe1](https://github.com/gnosisguild/ser-kit/commit/80ccfe144eb8504151b13125ec948fc9f9f624f8))

## [1.0.3](https://github.com/gnosisguild/ser-kit/compare/v1.0.2...v1.0.3) (2024-12-11)


### Bug Fixes

* parsePrefixedAddress handles prefixed addresses and regular ones ([#10](https://github.com/gnosisguild/ser-kit/issues/10)) ([2ba9351](https://github.com/gnosisguild/ser-kit/commit/2ba93514e3572270d5458bda537078d5988cdf33))

## [1.0.2](https://github.com/gnosisguild/ser-kit/compare/v1.0.1...v1.0.2) (2024-12-11)


### Bug Fixes

* export enums not only as types ([#8](https://github.com/gnosisguild/ser-kit/issues/8)) ([e0b248d](https://github.com/gnosisguild/ser-kit/commit/e0b248d0141bf4cae20f0b3e540b7a1c3e98709f))

## [1.0.1](https://github.com/gnosisguild/ser-kit/compare/v1.0.0...v1.0.1) (2024-12-11)


### Bug Fixes

* make options for planExecution really optional ([#6](https://github.com/gnosisguild/ser-kit/issues/6)) ([3ad7c0c](https://github.com/gnosisguild/ser-kit/commit/3ad7c0c0a5574264884fe5ab02bd9a6e3ffa77ea))

## 1.0.0 (2024-11-18)


### ⚠ BREAKING CHANGES

* reorganized package exports

### Features

* Planning and Execution for foundation route topologies ([#3](https://github.com/gnosisguild/ser-kit/issues/3)) ([4756138](https://github.com/gnosisguild/ser-kit/commit/4756138645a21068f3b5dcd76bbf5b619102112d))
