Java.performNow(function () {
  // console.log("[*] Avvio bypass dinamico definitivo - Caccia globale a $$a...");

  // 1. Intercettiamo le chiamate tramite Reflection
  var Method = Java.use("java.lang.reflect.Method");
  Method.invoke.implementation = function (obj, args) {
    var methodName = this.getName();
    var declaringClass = this.getDeclaringClass().getName();

    // Invece di una blacklist, blocchiamo QUALSIASI metodo chiamato "$$a"
    // Questo trancia alla radice l'albero di esecuzione del packer
    if (methodName === "$$a") {
      // console.log("[*] BOOM! Disinnescata chiamata nascosta $$a in: " + declaringClass);
      return null; // Blocca l'esecuzione ritornando null
    }

    return this.invoke(obj, args);
  };

  // 2. Setup del ClassLoader e bypass di ScrtyManager
  var Application = Java.use("android.app.Application");
  Application.attachBaseContext.implementation = function (ctx) {
    // console.log("[*] attachBaseContext - inizio");

    // Impostiamo il ClassLoader di Frida su quello reale dell'app
    var contextClass = Java.use("android.content.Context");
    var appClassLoader = Java.cast(ctx, contextClass).getClassLoader();
    Java.classFactory.loader = appClassLoader;

    // Hook di ScrtyManager
    try {
      var SM = Java.use("com.hitachiapp.utils.ScrtyManager");
      // console.log("[*] ScrtyManager trovato! Applico i bypass...");

      SM.hkCallback.implementation = function (j, j2) {
        // console.log("[*] hkCallback BLOCCATA");
      };
      SM.dbgCallback.implementation = function (j, j2) {
        // console.log("[*] dbgCallback BLOCCATA");
      };
      SM.rtCallback.implementation = function (j) {
        // console.log("[*] rtCallback BLOCCATA");
      };
      SM.mltrCallback.implementation = function (j, j2) {
        // console.log("[*] mltrCallback BLOCCATA");
      };
      SM.crtfcttmprCallback.implementation = function (j, j2) {
        // console.log("[*] crtfcttmprCallback BLOCCATA");
      };

      // console.log("[*] Tutte le callback neutralizzate!");
    } catch (e) {
      // console.log("[-] Impossibile hookare ScrtyManager: " + e);
    }

    // Proseguiamo l'avvio
    try {
      this.attachBaseContext(ctx);
      // console.log("[*] attachBaseContext - completata con successo");
    } catch (e) {
      // console.log("[-] Eccezione in attachBaseContext: " + e);
    }
  };

  console.log("[*] Hook attivi, in attesa del boot...");
});
