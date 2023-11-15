# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [4.0.4](https://github.com/sarakusha/nibus/compare/v4.0.3...v4.0.4) (2023-11-15)


### Bug Fixes

* повторный вывод hex-дампа ([a62603e](https://github.com/sarakusha/nibus/commit/a62603e589370d926674aaf2092d1eb1359199ba))





## [4.0.3](https://github.com/sarakusha/nibus/compare/v4.0.2...v4.0.3) (2023-10-02)

**Note:** Version bump only for package root





## [4.0.2](https://github.com/sarakusha/nibus/compare/v4.0.1...v4.0.2) (2023-10-02)

**Note:** Version bump only for package root





## [4.0.1](https://github.com/sarakusha/nibus/compare/v4.0.0...v4.0.1) (2023-03-01)

**Note:** Version bump only for package root





# [4.0.0](https://github.com/sarakusha/nibus/compare/v3.8.0...v4.0.0) (2023-02-02)


### Bug Fixes

* improved device detection in Windows ([9f60023](https://github.com/sarakusha/nibus/commit/9f600234103ae0ae10e2f1fb9670c3d70cb95a6c))


### Code Refactoring

* divided into two packages, usb detection replaced with usb ([ae5cc69](https://github.com/sarakusha/nibus/commit/ae5cc69671d61826ef1e578680920b001867b989))


### Features

* added old minihost_v2.06.mib.json ([0844041](https://github.com/sarakusha/nibus/commit/0844041e9e4c34230657bbc7c8a4757a8332a8af))


### BREAKING CHANGES

* service API moved to a separate package





# [3.8.0](https://github.com/sarakusha/nibus/compare/v3.7.0...v3.8.0) (2022-12-13)


### Features

* minihost4 ([bf55f21](https://github.com/sarakusha/nibus/commit/bf55f211a41f27b938ddcfc1e2c94937177e200c))





# [3.7.0](https://github.com/sarakusha/nibus/compare/v3.6.0...v3.7.0) (2022-10-31)


### Features

* force reopen existing devices on reload ([d4e8607](https://github.com/sarakusha/nibus/commit/d4e8607ffa63a8cd0bc5b4967fc1db318ba6583a))





# [3.6.0](https://github.com/sarakusha/nibus/compare/v3.5.4...v3.6.0) (2022-10-28)


### Bug Fixes

* boolean converter ([e03b01c](https://github.com/sarakusha/nibus/commit/e03b01cc9f93e0ec70ced57939ced56a921cbf05))
* crashes when quitting electron and closing nibus ([6840b10](https://github.com/sarakusha/nibus/commit/6840b10405ae8824cf8c97bbe4dcc4ad809faebe))
* **detection:** removed manufacturer restriction ([2c9b295](https://github.com/sarakusha/nibus/commit/2c9b2955ead360b9aaac316d440f3cf174e92e1c))
* nibus log ([ce890bc](https://github.com/sarakusha/nibus/commit/ce890bcc2d3d5bbb6c11f87644ea77f49eac6e25))
* update timeout ([a733b50](https://github.com/sarakusha/nibus/commit/a733b5091c14231a322d52c42fe9f5b55f741a73))
* wrong endianness and address offset ([3eb32ff](https://github.com/sarakusha/nibus/commit/3eb32ff26344952729096edf5c7b53f365938d2e))


### Features

* **AccordionList:** looks like a button (hover/selected) ([b11ef75](https://github.com/sarakusha/nibus/commit/b11ef7566d6d3522ddc55f029219307902eef74f))
* add novastar mctrl300 ([60cd05b](https://github.com/sarakusha/nibus/commit/60cd05b64b25bc97b60ea91fe3d7221c7567b161))
* all library files became hybrid (cjs/mjs) ([5eb289d](https://github.com/sarakusha/nibus/commit/5eb289d8ad8c700ef74770e0670b96ba419799a9))
* increment/decrement brightness buttons ([90b542c](https://github.com/sarakusha/nibus/commit/90b542cb87a179266bd04126687edadabd44d96c))
* increment/decrement brightness buttons ([c14222a](https://github.com/sarakusha/nibus/commit/c14222a1f7963bbd07de37415233ec05dd9f1970))
* novastar rgbv/gamma/mode control ([070d4bb](https://github.com/sarakusha/nibus/commit/070d4bbbfde3b8a83a342e13c461089ba45d20b3))
* novastar rgbv/gamma/mode control ([4104f0e](https://github.com/sarakusha/nibus/commit/4104f0e2ee442d8a4c57d7ca5ecb0bea23c6c9ca))
* novastar telemetry tab ([e939d78](https://github.com/sarakusha/nibus/commit/e939d78e6db99b376e34341485fcf075f8dc83e4))
* novastar telemetry tab ([0f2193b](https://github.com/sarakusha/nibus/commit/0f2193b0f2bf95a4db4b9e1dd1baca24f076576e))





## [3.5.5](https://github.com/sarakusha/nibus/compare/v3.5.4...v3.5.5) (2022-05-25)


### Bug Fixes

* crashes when quitting electron and closing nibus ([6840b10](https://github.com/sarakusha/nibus/commit/6840b10405ae8824cf8c97bbe4dcc4ad809faebe))


### Features

* **AccordionList:** looks like a button (hover/selected) ([b11ef75](https://github.com/sarakusha/nibus/commit/b11ef7566d6d3522ddc55f029219307902eef74f))
* all library files became hybrid (cjs/mjs) ([5eb289d](https://github.com/sarakusha/nibus/commit/5eb289d8ad8c700ef74770e0670b96ba419799a9))
* increment/decrement brightness buttons ([c14222a](https://github.com/sarakusha/nibus/commit/c14222a1f7963bbd07de37415233ec05dd9f1970))
* novastar rgbv/gamma/mode control ([4104f0e](https://github.com/sarakusha/nibus/commit/4104f0e2ee442d8a4c57d7ca5ecb0bea23c6c9ca))
* novastar telemetry tab ([0f2193b](https://github.com/sarakusha/nibus/commit/0f2193b0f2bf95a4db4b9e1dd1baca24f076576e))





## [3.5.4](https://github.com/sarakusha/nibus/compare/v3.5.3...v3.5.4) (2022-01-14)


### Bug Fixes

* **detection:** removed manufacturer restriction ([e51b51b](https://github.com/sarakusha/nibus/commit/e51b51b600afa29470892f65a779720121cc59cd))
* update timeout ([cc78561](https://github.com/sarakusha/nibus/commit/cc78561e31e537a0b04db0d035b6013b34c998ad))





## [3.5.3](https://github.com/sarakusha/nibus/compare/v3.5.2...v3.5.3) (2021-09-13)


### Bug Fixes

* add source-map-support to dependencies ([1fc9f31](https://github.com/sarakusha/nibus/commit/1fc9f31ceeb41563348f0157a68ea23f9d0f0e08))
* resolve promise when cancelled ([5ac707e](https://github.com/sarakusha/nibus/commit/5ac707e8efdc500440e522c107b42a7acd37594a))





## [3.5.2](https://github.com/sarakusha/nibus/compare/v3.5.1...v3.5.2) (2021-09-13)


### Bug Fixes

* freeze react-imask@6.1 ([831045a](https://github.com/sarakusha/nibus/commit/831045a95b68ee3a60909db3ad237eae58b38196))





## [3.5.1](https://github.com/sarakusha/nibus/compare/v3.2.2...v3.5.1) (2021-09-13)


### Bug Fixes

* **bonjour:** catch errors ([0570c09](https://github.com/sarakusha/nibus/commit/0570c0901b1eca54347a08c2818e9078dd18741a))
* call terminate on error ([9576d1b](https://github.com/sarakusha/nibus/commit/9576d1b24c730ced0088ba7c2982d27770290ccf))
* **config:** skip null values ([3deaef6](https://github.com/sarakusha/nibus/commit/3deaef6cff1a9dbd443c7219619865bc7f05a215))
* **desktop-entry:** add option --no-sandbox for linux ([3447bf7](https://github.com/sarakusha/nibus/commit/3447bf725cc5bba8ad2e7adbff27fe606fcdd768))
* global setTimeout ([551248c](https://github.com/sarakusha/nibus/commit/551248c7c54d3680d8bcd3ba3f72703997f41317))
* increase initial timeout ([b3a1d57](https://github.com/sarakusha/nibus/commit/b3a1d57e5a87877df076301278615a010cb8f965))
* **knownports:** all options may be null ([56b300e](https://github.com/sarakusha/nibus/commit/56b300e1030b50e5c9fe5bb1a6e11a516fd9a333))
* **KnownPorts:** pnpId maybe null ([a8e2449](https://github.com/sarakusha/nibus/commit/a8e24499b64eecde35a638eaea9786d93bbf6082))
* **minihost2:** invalid property names ([c1fb21d](https://github.com/sarakusha/nibus/commit/c1fb21db37212f768fc2647ae4512f4b24c40a34))
* **minihost:** invert vertical direction ([a25a78c](https://github.com/sarakusha/nibus/commit/a25a78ca7904fdc5ff6157d84fc10be6f7ee2802))
* **quit:** application does not close if a test was shown ([e48f240](https://github.com/sarakusha/nibus/commit/e48f240756cfdf7bc73ad87b7df5bee8f7557d83))
* **screen:** parsing the screen address with offset and size ([ac67858](https://github.com/sarakusha/nibus/commit/ac6785884477a78a04aba05ab25126ba2beb3ba7))
* **TelemetryTab:** update toolbar ([99e11c9](https://github.com/sarakusha/nibus/commit/99e11c9e1668c2082525e5df3cd6019227066dad))
* transparent test window for some Windows PC ([e8e348f](https://github.com/sarakusha/nibus/commit/e8e348f7bee06d3bae95f4532939534b4da1f9be))
* **tray:** change icon in astra linux ([c939a41](https://github.com/sarakusha/nibus/commit/c939a414269d96702f9e159b405424c6002f3150))


### Features

* add `health` event ([2114345](https://github.com/sarakusha/nibus/commit/211434543d5c4a01eacd060a1e3e5f657ee5ed2d))
* added overheating protection ([32aa432](https://github.com/sarakusha/nibus/commit/32aa432b53294f8ef205f5acdad90134f9162400))
* **flasher:** added module reset ([6e142c9](https://github.com/sarakusha/nibus/commit/6e142c9817579cdcd8e20c1ed9bb9e23c0c55bd7))





# [3.5.0](https://github.com/sarakusha/nibus/compare/v3.2.2...v3.5.0) (2021-09-07)


### Bug Fixes

* **KnownPorts:** pnpId maybe null ([a8e2449](https://github.com/sarakusha/nibus/commit/a8e24499b64eecde35a638eaea9786d93bbf6082))
* **minihost:** invert vertical direction ([a25a78c](https://github.com/sarakusha/nibus/commit/a25a78ca7904fdc5ff6157d84fc10be6f7ee2802))


# [3.4.0](https://github.com/sarakusha/nibus/compare/v3.2.2...v3.4.0) (2021-09-07)


### Bug Fixes

* **bonjour:** catch errors ([0570c09](https://github.com/sarakusha/nibus/commit/0570c0901b1eca54347a08c2818e9078dd18741a))
* call terminate on error ([9576d1b](https://github.com/sarakusha/nibus/commit/9576d1b24c730ced0088ba7c2982d27770290ccf))
* **config:** skip null values ([3deaef6](https://github.com/sarakusha/nibus/commit/3deaef6cff1a9dbd443c7219619865bc7f05a215))
* **desktop-entry:** add option --no-sandbox for linux ([3447bf7](https://github.com/sarakusha/nibus/commit/3447bf725cc5bba8ad2e7adbff27fe606fcdd768))
* global setTimeout ([551248c](https://github.com/sarakusha/nibus/commit/551248c7c54d3680d8bcd3ba3f72703997f41317))
* increase initial timeout ([b3a1d57](https://github.com/sarakusha/nibus/commit/b3a1d57e5a87877df076301278615a010cb8f965))
* **minihost2:** invalid property names ([c1fb21d](https://github.com/sarakusha/nibus/commit/c1fb21db37212f768fc2647ae4512f4b24c40a34))
* **quit:** application does not close if a test was shown ([e48f240](https://github.com/sarakusha/nibus/commit/e48f240756cfdf7bc73ad87b7df5bee8f7557d83))
* **screen:** parsing the screen address with offset and size ([ac67858](https://github.com/sarakusha/nibus/commit/ac6785884477a78a04aba05ab25126ba2beb3ba7))
* **TelemetryTab:** update toolbar ([99e11c9](https://github.com/sarakusha/nibus/commit/99e11c9e1668c2082525e5df3cd6019227066dad))
* transparent test window for some Windows PC ([e8e348f](https://github.com/sarakusha/nibus/commit/e8e348f7bee06d3bae95f4532939534b4da1f9be))
* **tray:** change icon in astra linux ([c939a41](https://github.com/sarakusha/nibus/commit/c939a414269d96702f9e159b405424c6002f3150))


### Features

* add `health` event ([2114345](https://github.com/sarakusha/nibus/commit/211434543d5c4a01eacd060a1e3e5f657ee5ed2d))
* added overheating protection ([32aa432](https://github.com/sarakusha/nibus/commit/32aa432b53294f8ef205f5acdad90134f9162400))
* **flasher:** added module reset ([6e142c9](https://github.com/sarakusha/nibus/commit/6e142c9817579cdcd8e20c1ed9bb9e23c0c55bd7))





# [3.3.0](https://github.com/sarakusha/nibus/compare/v3.2.2...v3.3.0) (2021-07-02)


### Bug Fixes

* call terminate on error ([9576d1b](https://github.com/sarakusha/nibus/commit/9576d1b24c730ced0088ba7c2982d27770290ccf))
* **bonjour:** catch errors ([0570c09](https://github.com/sarakusha/nibus/commit/0570c0901b1eca54347a08c2818e9078dd18741a))
* **config:** skip null values ([3deaef6](https://github.com/sarakusha/nibus/commit/3deaef6cff1a9dbd443c7219619865bc7f05a215))
* **desktop-entry:** add option --no-sandbox for linux ([3447bf7](https://github.com/sarakusha/nibus/commit/3447bf725cc5bba8ad2e7adbff27fe606fcdd768))
* **minihost2:** invalid property names ([c1fb21d](https://github.com/sarakusha/nibus/commit/c1fb21db37212f768fc2647ae4512f4b24c40a34))
* **quit:** application does not close if a test was shown ([e48f240](https://github.com/sarakusha/nibus/commit/e48f240756cfdf7bc73ad87b7df5bee8f7557d83))
* **screen:** parsing the screen address with offset and size ([ac67858](https://github.com/sarakusha/nibus/commit/ac6785884477a78a04aba05ab25126ba2beb3ba7))
* **TelemetryTab:** update toolbar ([99e11c9](https://github.com/sarakusha/nibus/commit/99e11c9e1668c2082525e5df3cd6019227066dad))
* **tray:** change icon in astra linux ([c939a41](https://github.com/sarakusha/nibus/commit/c939a414269d96702f9e159b405424c6002f3150))
* global setTimeout ([551248c](https://github.com/sarakusha/nibus/commit/551248c7c54d3680d8bcd3ba3f72703997f41317))
* increase initial timeout ([b3a1d57](https://github.com/sarakusha/nibus/commit/b3a1d57e5a87877df076301278615a010cb8f965))


### Features

* add `health` event ([2114345](https://github.com/sarakusha/nibus/commit/211434543d5c4a01eacd060a1e3e5f657ee5ed2d))
* added overheating protection ([32aa432](https://github.com/sarakusha/nibus/commit/32aa432b53294f8ef205f5acdad90134f9162400))





## [3.2.4](https://github.com/sarakusha/nibus/compare/v3.2.2...v3.2.4) (2021-06-10)


### Bug Fixes

* **bonjour:** catch errors ([0570c09](https://github.com/sarakusha/nibus/commit/0570c0901b1eca54347a08c2818e9078dd18741a))
* **config:** skip null values ([3deaef6](https://github.com/sarakusha/nibus/commit/3deaef6cff1a9dbd443c7219619865bc7f05a215))
* **desktop-entry:** add option --no-sandbox for linux ([3447bf7](https://github.com/sarakusha/nibus/commit/3447bf725cc5bba8ad2e7adbff27fe606fcdd768))
* **minihost2:** invalid property names ([c1fb21d](https://github.com/sarakusha/nibus/commit/c1fb21db37212f768fc2647ae4512f4b24c40a34))
* **quit:** application does not close if a test was shown ([e48f240](https://github.com/sarakusha/nibus/commit/e48f240756cfdf7bc73ad87b7df5bee8f7557d83))
* **screen:** parsing the screen address with offset and size ([ac67858](https://github.com/sarakusha/nibus/commit/ac6785884477a78a04aba05ab25126ba2beb3ba7))
* **TelemetryTab:** update toolbar ([99e11c9](https://github.com/sarakusha/nibus/commit/99e11c9e1668c2082525e5df3cd6019227066dad))
* **tray:** change icon in astra linux ([c939a41](https://github.com/sarakusha/nibus/commit/c939a414269d96702f9e159b405424c6002f3150))
* global setTimeout ([551248c](https://github.com/sarakusha/nibus/commit/551248c7c54d3680d8bcd3ba3f72703997f41317))
* increase initial timeout ([b3a1d57](https://github.com/sarakusha/nibus/commit/b3a1d57e5a87877df076301278615a010cb8f965))





## [3.2.3](https://github.com/sarakusha/nibus/compare/v3.2.1...v3.2.3) (2021-06-08)

### Bug Fixes

* **desktop-entry:** add option --no-sandbox for linux ([3447bf7](https://github.com/sarakusha/nibus/commit/3447bf725cc5bba8ad2e7adbff27fe606fcdd768))
* **tray:** change icon in astra linux ([c939a41](https://github.com/sarakusha/nibus/commit/c939a414269d96702f9e159b405424c6002f3150))
* global setTimeout ([551248c](https://github.com/sarakusha/nibus/commit/551248c7c54d3680d8bcd3ba3f72703997f41317))
* increase initial timeout ([b3a1d57](https://github.com/sarakusha/nibus/commit/b3a1d57e5a87877df076301278615a010cb8f965))
* **bonjour:** catch errors ([0570c09](https://github.com/sarakusha/nibus/commit/0570c0901b1eca54347a08c2818e9078dd18741a))
* **config:** skip null values ([3deaef6](https://github.com/sarakusha/nibus/commit/3deaef6cff1a9dbd443c7219619865bc7f05a215))

## [3.2.2](https://github.com/sarakusha/nibus/compare/v3.2.1...v3.2.2) (2021-05-25)


### Bug Fixes

* **editcell:** invalid initial value ([0294cc2](https://github.com/sarakusha/nibus/commit/0294cc27aa6922e1215f89a04cd9dc336e8dfec2))







**Note:** Version bump only for package root
