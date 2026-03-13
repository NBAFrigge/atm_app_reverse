Java.perform(function () {
  var VtsLog = Java.use("it.aep_italia.vts.sdk.core.VtsLog");
  VtsLog["d"].implementation = function (str, objArr) {
    console.log(`VtsLog.d is called: str=${str}, objArr=${objArr}`);
    this["d"](str, objArr);
  };
});
