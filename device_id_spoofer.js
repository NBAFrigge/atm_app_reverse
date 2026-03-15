Java.perform(function () {
  const FAKE_DEVICE_ID = "be4e72c8cb681f7b";
  const FAKE_DEVICE_UID_LONG = Java.use("java.lang.Long").parseUnsignedLong(FAKE_DEVICE_ID, 16);

  try {
    const OkHttpClient = Java.use("okhttp3.OkHttpClient");
    OkHttpClient.newCall.overload("okhttp3.Request").implementation = function (request) {
      const headers = request.headers();
      const count = headers.size();
      let hasDeviceId = false;

      for (let i = 0; i < count; i++) {
        const lower = headers.name(i).toLowerCase();
        if (lower === "deviceid" || lower === "deviceuniqueidaep") {
          hasDeviceId = true;
          break;
        }
      }

      if (!hasDeviceId) return this.newCall(request);

      const builder = request.newBuilder();
      builder.removeHeader("deviceid");
      builder.removeHeader("deviceuniqueidaep");
      builder.addHeader("deviceid", FAKE_DEVICE_ID);
      builder.addHeader("deviceuniqueidaep", FAKE_DEVICE_ID);
      console.log("[OkHttp] deviceid spoofed → " + request.url().toString());
      return this.newCall(builder.build());
    };
    console.log("[+] OkHttp hook attivo.");
  } catch (e) {
    console.log("[-] OkHttp hook fallito: " + e);
  }

  try {
    const VtsSdk = Java.use("it.aep_italia.vts.sdk.core.VtsSdk");

    VtsSdk["getDeviceUID"].implementation = function () {
      const original = this["getDeviceUID"]();
      console.log("[VTS] getDeviceUID originale: " + original + " (0x" + original.toString(16) + ")");
      console.log("[VTS] getDeviceUID spoofed:   " + FAKE_DEVICE_UID_LONG + " (0x" + FAKE_DEVICE_ID + ")");
      return FAKE_DEVICE_UID_LONG;
    };

    console.log("[+] VtsSdk.getDeviceUID hook attivo.");
  } catch (e) {
    console.log("[-] VtsSdk.getDeviceUID hook fallito: " + e);
  }

  console.log("[+] Frida ATM spoof attivo.");
  console.log("    deviceid → " + FAKE_DEVICE_ID);
  console.log("    DeviceUID long → " + FAKE_DEVICE_UID_LONG);
});
