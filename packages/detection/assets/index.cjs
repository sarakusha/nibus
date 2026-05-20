const path = require('path');

const detectionPath = path.join(__dirname, 'detection.yml');
const detection = {
  "mibCategories": {
    "siolynx": {
      "mib": "siolynx",
      "link": true,
      "find": "version",
      "type": 7
    },
    "minihost": {
      "type": 43974,
      "find": "sarp",
      "link": true
    },
    "fancontrol": {
      "mib": "fan_control",
      "find": "version",
      "link": true
    },
    "c22": {
      "link": true,
      "win32": {
        "parity": "even"
      }
    },
    "sensor": {
      "mib": "ti_lux_2_3",
      "find": "sarp",
      "disableBatchReading": true
    },
    "ftdi": {
      "select": [
        "siolynx",
        "minihost",
        "c22"
      ]
    },
    "novastar": {
      "foreign": true
    }
  },
  "knownDevices": [
    {
      "vid": 8263,
      "pid": 2621,
      "category": "minihost"
    },
    {
      "vid": 8263,
      "pid": 2877,
      "category": "minihost"
    },
    {
      "vid": 1027,
      "pid": 24577,
      "device": "Siolynx2",
      "category": "siolynx"
    },
    {
      "vid": 8263,
      "pid": 2880,
      "device": "Siolynx3",
      "category": "siolynx"
    },
    {
      "vid": 1027,
      "pid": 24577,
      "device": "FT232R USB UART",
      "manufacturer": "FTDI",
      "category": "siolynx"
    },
    {
      "vid": 1027,
      "pid": 24577,
      "device": "FanControl",
      "manufacturer": "NATA",
      "category": "fancontrol"
    },
    {
      "vid": 1027,
      "pid": 24577,
      "device": "C22 USB to RS422 Converter",
      "manufacturer": "NATA",
      "category": "c22"
    },
    {
      "vid": 1027,
      "pid": 24577,
      "device": "C22 USB to RS422 Converter",
      "manufacturer": "Nata-Info",
      "category": "c22"
    },
    {
      "vid": 1027,
      "pid": 24577,
      "device": "AlphaHostControl",
      "manufacturer": "Nata-Info",
      "category": "minihost"
    },
    {
      "vid": 1027,
      "pid": 24597,
      "device": "AlphaHostControl",
      "manufacturer": "Nata-Info",
      "category": "minihost"
    },
    {
      "vid": 1027,
      "pid": 24597,
      "device": "MiniHost_alfa",
      "category": "minihost"
    },
    {
      "vid": 1027,
      "pid": 24577,
      "device": "HostControlMini",
      "manufacturer": "SlimDVI",
      "category": "minihost"
    },
    {
      "vid": 1027,
      "pid": 24577,
      "device": "MiniHost_alfa",
      "manufacturer": "Nata-Info",
      "category": "minihost"
    },
    {
      "vid": 1027,
      "pid": 24597,
      "device": "FT230X Basic UART",
      "manufacturer": "FTDI",
      "category": "ftdi"
    },
    {
      "vid": 1240,
      "pid": 10,
      "device": "Ke-USB24R",
      "serialNumber": "K_Ke-USB24R",
      "category": "relay"
    },
    {
      "vid": 4292,
      "pid": 60000,
      "category": "novastar"
    },
    {
      "vid": 1155,
      "pid": 22304,
      "category": "novastar"
    }
  ]
};

module.exports = {
  detectionPath,
  detection,
};
