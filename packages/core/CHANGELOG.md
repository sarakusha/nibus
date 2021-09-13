# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [3.5.1](https://github.com/sarakusha/nibus/compare/v3.2.2...v3.5.1) (2021-09-13)


### Bug Fixes

* call terminate on error ([9576d1b](https://github.com/sarakusha/nibus/commit/9576d1b24c730ced0088ba7c2982d27770290ccf))
* global setTimeout ([551248c](https://github.com/sarakusha/nibus/commit/551248c7c54d3680d8bcd3ba3f72703997f41317))
* **knownports:** all options may be null ([56b300e](https://github.com/sarakusha/nibus/commit/56b300e1030b50e5c9fe5bb1a6e11a516fd9a333))
* **KnownPorts:** pnpId maybe null ([a8e2449](https://github.com/sarakusha/nibus/commit/a8e24499b64eecde35a638eaea9786d93bbf6082))
* **minihost:** invert vertical direction ([a25a78c](https://github.com/sarakusha/nibus/commit/a25a78ca7904fdc5ff6157d84fc10be6f7ee2802))


### Features

* add `health` event ([2114345](https://github.com/sarakusha/nibus/commit/211434543d5c4a01eacd060a1e3e5f657ee5ed2d))
* **flasher:** added module reset ([6e142c9](https://github.com/sarakusha/nibus/commit/6e142c9817579cdcd8e20c1ed9bb9e23c0c55bd7))





# [3.5.0](https://github.com/sarakusha/nibus/compare/v3.2.2...v3.5.0) (2021-09-07)


### Bug Fixes

* call terminate on error ([9576d1b](https://github.com/sarakusha/nibus/commit/9576d1b24c730ced0088ba7c2982d27770290ccf))
* global setTimeout ([551248c](https://github.com/sarakusha/nibus/commit/551248c7c54d3680d8bcd3ba3f72703997f41317))
* **KnownPorts:** pnpId maybe null ([a8e2449](https://github.com/sarakusha/nibus/commit/a8e24499b64eecde35a638eaea9786d93bbf6082))
* **minihost:** invert vertical direction ([a25a78c](https://github.com/sarakusha/nibus/commit/a25a78ca7904fdc5ff6157d84fc10be6f7ee2802))


### Features

* add `health` event ([2114345](https://github.com/sarakusha/nibus/commit/211434543d5c4a01eacd060a1e3e5f657ee5ed2d))
* **flasher:** added module reset ([6e142c9](https://github.com/sarakusha/nibus/commit/6e142c9817579cdcd8e20c1ed9bb9e23c0c55bd7))





# [3.4.0](https://github.com/sarakusha/nibus/compare/v3.2.2...v3.4.0) (2021-09-07)


### Bug Fixes

* call terminate on error ([9576d1b](https://github.com/sarakusha/nibus/commit/9576d1b24c730ced0088ba7c2982d27770290ccf))
* global setTimeout ([551248c](https://github.com/sarakusha/nibus/commit/551248c7c54d3680d8bcd3ba3f72703997f41317))


### Features

* add `health` event ([2114345](https://github.com/sarakusha/nibus/commit/211434543d5c4a01eacd060a1e3e5f657ee5ed2d))
* **flasher:** added module reset ([6e142c9](https://github.com/sarakusha/nibus/commit/6e142c9817579cdcd8e20c1ed9bb9e23c0c55bd7))





# [3.3.0](https://github.com/sarakusha/nibus/compare/v3.2.2...v3.3.0) (2021-07-02)


### Bug Fixes

* call terminate on error ([9576d1b](https://github.com/sarakusha/nibus/commit/9576d1b24c730ced0088ba7c2982d27770290ccf))
* global setTimeout ([551248c](https://github.com/sarakusha/nibus/commit/551248c7c54d3680d8bcd3ba3f72703997f41317))


### Features

* add `health` event ([2114345](https://github.com/sarakusha/nibus/commit/211434543d5c4a01eacd060a1e3e5f657ee5ed2d))





## [3.2.4](https://github.com/sarakusha/nibus/compare/v3.2.2...v3.2.4) (2021-06-10)


### Bug Fixes

* global setTimeout ([551248c](https://github.com/sarakusha/nibus/commit/551248c7c54d3680d8bcd3ba3f72703997f41317))





## [3.2.3](https://github.com/sarakusha/nibus/compare/v3.2.1...v3.2.3) (2021-06-08)


### Bug Fixes

* global setTimeout ([551248c](https://github.com/sarakusha/nibus/commit/551248c7c54d3680d8bcd3ba3f72703997f41317))





## [3.2.2](https://github.com/sarakusha/nibus/compare/v3.2.1...v3.2.2) (2021-05-25)

**Note:** Version bump only for package @nibus/core

# 2.0.5
- **Bug Fix**
  - Исправлен подсчет X синей вершины
# 1.5.7
- **Breaking Change**
  - device.drain, device.write возвращают Promise<number[]> из id записанных перменных, если данный id не записался или была ошибка, он возвращается со снаком минус
- **Bug Fix**
  - Если в переменную записывалось значение больше чем мог вместить Buffer (например 345 в Uint8), то выбрасывалось исключение. Теперь -id в массиве с результатом
  - Исправлена ошибка с неправильной кодировкой в mib2json
# 1.3.7
- **New Feature**
  - SarpDatagram::deviceType
  - getMibTypes()
  - NibusSession::event('pureConnection')
- **Internal**
  - изменен webpack.renderer.config для поддержки iconv-lite
  - session.close() на закрытие сокета
  - IMibDescripton.win32

# 1.3.6
- **Breaking Change**
  - свойство device.address меняется при изменении serno
  - отказ от уникальности устройства с данным адресом. Devices.find(address): IDevice[]
- **New Feature**
  - при смене serno и device.address генерируется событие 'serno'
- **Internal**
  - значение gamma minihost3 приведено в соответствие с gamma minihost_2.06b (с точностью и границами)
  - разрешены пустые mac-адреса
  - замена require(.json) на JSON.parse(fs.readFileSync) для попытки собрать на electron

# 1.3.5
- **Braking Change**
  - если новое значение свойства не отличается от старого и нет ошибки, свойство не меняется и не становится dirty
- **Bug Fix**
  - если не удалось подключить сокет при старте => reject.
# 1.3.4
- **Internal**
  - удален повторяющийся MibDescription
- **Bug Fix**
  - исправлен метод NmsDatagram.isResponseFor, теперь точное соответствие отпраленного и принятого ответа.
  Раньше могло привести к таймауту при двух запросах version, один на ::0 и второй на цель
  - изменен алгоритм определения устройства на Windows
# 1.3.3
- **Internal**
  - device.readAll отсоритрован по nms_id
# 1.3.2
- **Bug Fix**
  - Контроль min, max для числовых типов на основании базового типа
- **Internal**
  - При повторном вызове readAll, если предыдущий вызов еще не завершен, выполнится
  только первый, последующие получат результат первого

# 1.3.1
- **Bug Fix**
  - session.start всегда возвращает количество доступных портов
