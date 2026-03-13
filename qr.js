Java.perform(function () {
  Java.use("java.lang.ClassLoader")
    .loadClass.overload("java.lang.String")
    .implementation = function (name) {
      var clazz = this.loadClass(name);
      if (name === "it.aep_italia.vts.sdk.utils.BitmapUtils") {
        console.log("[*] BitmapUtils caricata - hooking");
        var BitmapUtils = Java.use("it.aep_italia.vts.sdk.utils.BitmapUtils");

      }
      return clazz;
    };
});
