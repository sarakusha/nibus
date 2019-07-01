## Установка
### node.js
Требуется установить актуальную версию [node.js](https://nodejs.org).
Для <b>*nix</b> систем рекомендуется использовать [Node Version Manager (nvm)](https://github.com/creationix/nvm).
Просто запустите скрипт с помощью curl
```bash
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
```
или wget
```bash
wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
```
Закройте терминал и откройте его опять. Установите node.js нужной версии, например
```bash
nvm install 10
nvm alias default node
```
### Windows
1. Загрузите скрипты для автоматической установки [setup.cmd](ftp://ftp.nata-info.ru/software/nibus.js/setup.cmd)
и [nibus-installer.ps1](ftp://ftp.nata-info.ru/software/nibus.js/nibus-installer.ps1). Они должны находится в одной папке.
2. В проводнике найдите загруженный файл `nibus-installer.ps1` правой кнопкой мыши Свойства/Общие/Разблокировать
3. Запустите скрипт `setup.cmd` с правами администратора.
4. Когда появится окно установщика `Node.JS` подтвердите установку, выполните что он потребует
5. Тоже при установке `Git for Windows`
6. Дождитесь установки `Visual Studio Build Tools`, если он еще не установлен.
7. Возможно будет установлен `.NET Framework`, если он еще не установлен.
8. В конце рекомендуется запустить в командной строке (если *UAC/Контроль учетных записей* включен запускайте **без прав администратора**)
```bash
nibus start
pm2 save
pm2-startup install
```

### Ubuntu
1. Убедитесь что установлен [Python 2.7](https://www.python.org/downloads/) <sub><sup>(требуется для node-gyp)</sup></sub>
  ```bash
  sudo apt install -y python2.7 python-pip build-essential libudev-dev
  ```
2. Добавьте себя в группу dialout <sub><sup>(если вы еще не там)</sup></sub> и <strong>перезагрузитесь</strong>
  ```bash
  sudo usermod -a -G dialout $USER
  ```

### macOS
1. [Python 2.7](https://www.python.org/downloads/)
2. [Xcode](https://developer.apple.com/xcode/download/)
3. Command Line Tools `xcode-select --install`

## Установка/обновление пакета `@nibus/cli`
Чтобы установить или обновить пакет выполните команду
```bash
nibus stop
npm i -g @nibus/cli --registry https://npm.nata-info.ru
nibus start
```

## Запуск сервиса `nibus.js` и команды
* запуск
```bash
nibus start
```
* остановка
```bash
nibus stop
```
* справка
```bash
nibus --help
nibus <команда> --help
```
* список подключенных устройств
```bash
nibus list
```
* дамп непосредственно подключенных устройств
```bash
nibus dump
```
* дамп устройств за `Siolunx` с указанным `mib` или адресом  `mac`
```bash
nibus dump --mib pconsole
nibus dump --mac ::23:56
```
* чтение одной переменной
```bash
nibus read --mac ::45:35 --id brightness
```
* запись переменных
```bash
nibus write --mac ::56:78 brightness=23 hofs=100 vofs=300
```
* выгрузка домена
```bash
nibus upload --mac 255.255.1 --domain MODUL --size 6 --hex
```
* загрузить домен
```bash
nibus download --mac ::23:74 --domain NVRAM --src data.bin --offset=1024
```
* посмотреть лог
```bash
nibus log --level hex
nibus log --level nibus --omit priority
```
* залить прошивку в нулевой модуль и выполнть update
```bash
nibus flash -m ::1 -k ctrl moduleSelect=0 --src Slim_Ctrl_v5_Mcu_v1.2.txt --exec update
```

