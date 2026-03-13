Java.performNow(function () {

  // Blocca solo $$a dei vettori noti - necessario per il boot iniziale
  var BLACKLIST_INVOKE = [
    "com.bumptech.glide.load.engine.bitmap_recycle.LruArrayPool$Key",
    "ch.qos.logback.classic.joran.action.ConditionalIncludeAction$State",
    "com.google.android.gms.internal.mlkit_vision_barcode.zzrh"
  ];

  var Method = Java.use("java.lang.reflect.Method");
  Method.invoke.implementation = function (obj, args) {
    var methodName = this.getName();
    var declaring = this.getDeclaringClass().getName();
    if (methodName === "$$a" && BLACKLIST_INVOKE.indexOf(declaring) !== -1) {
      console.log("[*] Bloccato $$a: " + declaring);
      return null;
    }
    return this.invoke(obj, args);
  };

  // Aspetta che ScrtyManager venga caricata e blocca tutte le callback
  Java.use("java.lang.ClassLoader")
    .loadClass.overload("java.lang.String")
    .implementation = function (name) {
      var clazz = this.loadClass(name);
      if (name === "com.hitachiapp.utils.ScrtyManager") {
        console.log("[*] ScrtyManager caricata - blocco tutte le callback");
        var SM = Java.use("com.hitachiapp.utils.ScrtyManager");

        SM.hkCallback.implementation = function (j, j2) {
          console.log("[*] hkCallback BLOCCATA - hook detection");
        };
        SM.dbgCallback.implementation = function (j, j2) {
          console.log("[*] dbgCallback BLOCCATA - debug detection");
        };
        SM.rtCallback.implementation = function (j) {
          console.log("[*] rtCallback BLOCCATA - root detection");
        };
        SM.mltrCallback.implementation = function (j, j2) {
          console.log("[*] mltrCallback BLOCCATA - emulator detection");
        };
        SM.crtfcttmprCallback.implementation = function (j, j2) {
          console.log("[*] crtfcttmprCallback BLOCCATA - cert tampering");
        };

        // Rimuovi hook Method.invoke - non serve piu
        Method.invoke.implementation = null;
        console.log("[*] Hook Method.invoke rimosso");
      }
      return clazz;
    };

  var Application = Java.use("android.app.Application");
  Application.attachBaseContext.implementation = function (ctx) {
    console.log("[*] attachBaseContext - inizio");
    try {
      this.attachBaseContext(ctx);
      console.log("[*] attachBaseContext - completata");
    } catch (e) {
      console.log("[*] attachBaseContext - eccezione soppressa: " + e);
    }
  };

  console.log("[*] Hook attivi");
});
