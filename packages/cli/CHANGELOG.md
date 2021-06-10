# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [3.2.4](https://github.com/sarakusha/nibus/compare/v3.2.2...v3.2.4) (2021-06-10)


### Bug Fixes

* increase initial timeout ([b3a1d57](https://github.com/sarakusha/nibus/commit/b3a1d57e5a87877df076301278615a010cb8f965))
* **bonjour:** catch errors ([0570c09](https://github.com/sarakusha/nibus/commit/0570c0901b1eca54347a08c2818e9078dd18741a))





## [3.2.3](https://github.com/sarakusha/nibus/compare/v3.2.1...v3.2.3) (2021-06-08)


### Bug Fixes

* increase initial timeout ([b3a1d57](https://github.com/sarakusha/nibus/commit/b3a1d57e5a87877df076301278615a010cb8f965))
* **bonjour:** catch errors ([0570c09](https://github.com/sarakusha/nibus/commit/0570c0901b1eca54347a08c2818e9078dd18741a))





## [3.2.2](https://github.com/sarakusha/nibus/compare/v3.2.1...v3.2.2) (2021-05-25)

**Note:** Version bump only for package @nibus/cli

# 2.0.5
- **New Feature**
  - не требует запуска сервиса
# 1.6.9
- **New Feature**
  - Добавлена опция --hex для парсинга текстовых hex-файлов

# 1.6.8
- **Bug Fix**
  - Исправлена ошибка проверки hex-файлов на валидность для опреации download segment
# 1.6.7
- **Internal**
  - используется оригинальный usb-detection

# 1.6.6
- **New Feature**
  - добавлена команда parse для парсинга бинарных дампов
- **Bug Fix**
  - В detection.yml добавлена отсутствующая категория для minihost из-за чего он не определялся
# 1.6.5
- **New Feature**
  - Возможно не указывать в detection.yml device
  - Minihost_V3 определяется только по pid, vid
# 1.6.1
- **New Feature**
  - Добавлено устойство Minihost_V3 vid: 2047, pid: 0a3d
  - Добавлены типы прошивок mpu, fpga
# 1.5.9
- **New Feature**
  - добавлена опция timeout
  - при прошивке (flash) тип прошивки определяется по расширению
  - добавлен тип прошивки ttc
- **Breaking Change**
  - удалена опция fw
# 1.5.8
- **Bug Fix**
  - На Windows увеличено время поиска устройства
# 1.3.7
- **Bug Fix**
  - при поиске по типу проверяется тип ответившего устройства  
  - C22 even применяется только для win32
# 1.3.6
- **Internal**
  - замена require(.json) на JSON.parse(fs.readFileSync) для попытки сборки под electron

# 1.3.5
- skipped
# 1.3.4
- **Bug Fix**
  - увеличен таймаут для Windows при определении устройства
- **Internal**
  - добален cross-env и rimraf для кроссплатформенности

# 1.3.0
- **Braking Change**
  - Разделение кода на серверную + CLI и клиентскую части  
- **Internal**
  - Добавление в исходный код Copyright © Nata-Info
  - Корректное удаление и обновление декларативных файлов

# 1.2.3b
- **Bug Fix**
  - не сохранялись декларационные файлы *.d.ts

# 1.2.3a
- **Bug Fix**
  - в реестр осталась старая откомпилированная версия

# 1.2.3
- **Bug Fix**
  - выход по ^C из пинга
  - зависание при отсутствии устройств на ping
 
- **New Feature**
  - при отстутствии ping совсем возвращается не нулевой код
  - при задании --raw в stdout отправляется количество успешных ping-ов

# 1.2.2
- **Bug Fix**
  - исправлена ошибка с запуском в Linux
  
# 1.2.1
- **New Feature**
  - добавлен флаг `--no-term` для команды `download`
  - добавлено свойство `timeout` для `NmsDatagram`
- **Internal**
  - Скрыт вывод стека при ошибке
  - изменены таймауты для операций 
   `InitiateDownloadSeq`, `VerifyDomainChecksum`, `TerminateDownloadSeq`, `ExecuteProgramInv` 
- **Bug Fix**
  - не выводился лог в `production`
- **Documentation**
  - В описании исправлен адрес npm-реестра Ната-Инфо
  

# 1.2.0
- **Breaking Change**
  - change `isResponsible` to `notReply` in `NmsDatagram`
- **New Feature**
  - add command `flash` for flashing minihosts
  - add command `execute` for execute program on device
  - add `execute` in `IDevice`
  - add support multi-version for mib-files
  - change `mib` to `type` property for multi-version devices in `detection.yml`
- **Internal**
  - add <abbr title="Run Type Type Information">RTTI</abbr> and validation to mib file parser
  - change `responce` to `response` and remove `service` type in some mib-files
