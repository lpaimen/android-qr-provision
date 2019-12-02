
# Android QR code provision server

Server to provision Android device via QR code

## Getting started

1. Setup NodeJS or `nvm`
2. Git clone the repository
3. `./server.sh --wifi-password wifiPassword --apk apkFile.apk --admin-component com.package.name/.AdminReceiverClass` 
4. Open http://localhost:3000 in browser
5. Tap 6 times in Android welcome screen and scan the QR

All options with `./server.sh --help`

## How it works

Android reads the QR code and connects to the Wifi. It then proceeds to download and install the APK. App is set as device admin and can now manage the device.

Learn more:
 - [Provision information](https://developers.google.com/android/work/play/emm-api/prov-devices#qr_code_method)
 - [Device admin documentation](https://developer.android.com/guide/topics/admin/device-admin)

## Troubleshooting

 - `android.app.extra.PROVISIONING_WIFI_SSID` is empty
    - SSID detection failed? Give SSID with `--wifi-ssid=SSID`
 - Wifi was connected but download failed
    - Multiple network interfaces? Browse to http://<ip_of_preferred_interface>:3000/ instead
    - External IP detection failed? Manually give IP with `--server-ip=IP`
 - Apk was downloaded but install failed
    - Check that Apk contains class extending `DeviceAdminReceiver`
    - And the class is defined in `AndroidManifest.xml`
    - And the `--admin-component` is correct
 - Security?
    - Server is not secured. Server will listen all interfaces. Don't host on public network.

Sample provision JSON:
```
{
  "android.app.extra.PROVISIONING_WIFI_SSID": "wifi",
  "android.app.extra.PROVISIONING_WIFI_PASSWORD": "wifipassword",
  "android.app.extra.PROVISIONING_WIFI_SECURITY_TYPE": "WPA",
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": "http://computer_ip:3000/app.apk",
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "com.package.name/.AdminReceiverClass",
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM": "apk_file_checksum"
}
```

As QR:

<img src="sample.png" alt="JSON in QR code" width=256 height=256>

 [(Bigger image)](sample.png)


## Sample APK / Device Admin app

Google also provides open-source [Test Device Policy Control app](https://github.com/googlesamples/android-testdpc), which is available for download at at https://testdpc-latest-apk.appspot.com.

Download it:
```
wget https://testdpc-latest-apk.appspot.com -O test.apk
```

Then start the server:
```
./server.sh --apk test.apk \
  --admin-component com.afwsamples.testdpc/com.afwsamples.testdpc.DeviceAdminReceiver \
  --wifi-password yourWifiPassword
```
