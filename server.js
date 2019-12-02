const { execSync} = require('child_process')
const program = require('commander')
const express = require('express')
const { existsSync } = require('fs')
const { networkInterfaces } = require('os')
const wifiName = (() => { try { return require('wifi-name').sync() } catch (e) { return "" } })()

const log = require('bunyan').createLogger({ name: 'server' })

function errQuit(message) {
  log.error(message)
  process.exit(1)
}

function createConfig(args) {
  const config = Object.assign({}, args)
  config.apk = `${__dirname}/${config.apk}`
  config.apk_checksum = execSync(`cat "${config.apk}" | openssl dgst -binary -sha256`)
    .toString('base64').replace(/\+/g, '-').replace(/\//g, "_").replace('=', '')
  config.urls = []
  const ifaces = networkInterfaces()
  Object.keys(ifaces).forEach((name) => {
    ifaces[name].forEach((iface) => {
      if (iface.family == 'IPv4' && !iface.internal) {
        config.urls.push(`http://${iface.address}:${config.port}/`)
      }
    })
  })

  if (!existsSync(config.apk)) {
    errQuit(`Given APK not found: ${config.apk}`);
  }
  if (!config.wifiSsid) {
    errQuit("Not connected to wifi - give --wifi-ssid <ssid>")
  }

  return config
}

function runServer(config) {
  const app = express()

  app.get('/app.apk', (req, res) => {
    // User-Agent is like AndroidDownloadManager/9 (Linux; U; $AndroidVer$; $ProductName$ $Build$)
    log.warn(`Provisioning ${req.ip}: ${req.header('user-agent')}`)
    res.sendFile(config.apk)
  })

  app.get('/qr.js', (req, res) => {
    const location = `http://${config.serverIp || req.ip}:${config.port}/app.apk`
    const qr = {
      "android.app.extra.PROVISIONING_WIFI_SSID": config.wifiSsid,
      "android.app.extra.PROVISIONING_WIFI_PASSWORD": config.wifiPassword,
      "android.app.extra.PROVISIONING_WIFI_SECURITY_TYPE": "WPA",
      "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": location,
      "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": config.adminComponent,
      "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM": config.apk_checksum
    }
    // XHR made simple; just assign to global browser variable
    res.status(200).send(`qr = ${JSON.stringify(qr)}`)
  })

  // Middleware to point to external server from localhost (when candidate is found)
  if (config.urls.length >= 1) {
    app.use((req, res, next) => {
      const external = config.urls[0]
      if (req.hostname == 'localhost' || req.hostname == '127.0.0.1') {
        log.info(`QR doesn't work from ${req.hostname}, redirecting to ${external}`)
        res.redirect(external)
      } else {
        next()
      }
    })
  }

  app.use(express.static('static'))

  app.listen(config.port, '0.0.0.0', () => {   // Listening at 0.0.0.0 enforces IPv4
    log.info(`Server listening at http://localhost:${config.port}`)
    log.info('Detected external server URLs:')
    config.urls.map(url => log.info(`- ${url}`))
  })
}

const args = program
  .description('Server for Android QR provision')
  .requiredOption('--wifi-ssid <ssid>', 'Wifi name/SSID', wifiName)
  .requiredOption('--wifi-password <password>', 'Wifi password')
  .requiredOption('--apk <file>', 'APK file')
  .option('--server-ip <ipv4_address>', 'External IP address of server. If not defined, address of HTTP request is used.')
  .requiredOption('--port <port>', 'Server port', 3000)
  .requiredOption('--admin-component <classname>', 'Apk admin component name')
  .parse(process.argv);

const config = createConfig(args)
log.info(`Wifi SSID:       ${config.wifiSsid}`)
log.info(`Wifi password:   ${config.wifiPassword.replace(/./g, 'x')}`)
log.info(`Server IP:       ${config.serverIp || '(detect from HTTP request)'}`)
log.info(`Server port:     ${config.port}`)
log.info(`APK file:        ${config.apk}`)
log.info(`APK checksum:    ${config.apk_checksum}`)
log.info(`Admin component: ${config.adminComponent}`)

runServer(config)
