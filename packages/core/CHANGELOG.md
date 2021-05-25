# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
