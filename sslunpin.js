/**
 * Frida Script — Disable OkHttp3 SSL Pinning (All Methods)
 *
 * Covers:
 *   1. CertificatePinner.check (String, List<Certificate>)
 *   2. CertificatePinner.check$okhttp (String, Function0)  [Kotlin variant]
 *   3. CertificatePinner.Builder.add — returns empty pins
 *   4. OkHostnameVerifier — always returns true
 *   5. SSLSocketFactory / X509TrustManager — trust-all overrides
 *   6. TrustManagerImpl (Android) — bypass
 *   7. Custom CertificateChainCleaner — passthrough
 *
 * Usage:
 *   frida -U -f <package> -l disable_okhttp3_ssl_pinning.js --no-pause
 */

"use strict";

Java.perform(function () {
  console.log("[*] OkHttp3 SSL Pinning Bypass — loaded");

  // ──────────────────────────────────────────────
  // 1. CertificatePinner.check(String, List)
  // ──────────────────────────────────────────────
  try {
    var CertificatePinner = Java.use("okhttp3.CertificatePinner");

    // Standard check(String, List<Certificate>)
    try {
      CertificatePinner.check.overload(
        "java.lang.String",
        "java.util.List"
      ).implementation = function (hostname, peerCertificates) {
        console.log("[+] CertificatePinner.check(String, List) bypassed for: " + hostname);
      };
    } catch (_) { }

    // check(String, Function0) — Kotlin/OkHttp 4.x variant
    try {
      CertificatePinner.check$okhttp.overload(
        "java.lang.String",
        "kotlin.jvm.functions.Function0"
      ).implementation = function (hostname, cleanedCertificates) {
        console.log("[+] CertificatePinner.check$okhttp bypassed for: " + hostname);
      };
    } catch (_) { }

    // Older single-arg variant: check(String)
    try {
      CertificatePinner.check.overload("java.lang.String").implementation = function (hostname) {
        console.log("[+] CertificatePinner.check(String) bypassed for: " + hostname);
      };
    } catch (_) { }

    console.log("[*] CertificatePinner.check hooks installed");
  } catch (e) {
    console.log("[-] CertificatePinner not found: " + e.message);
  }

  // ──────────────────────────────────────────────
  // 2. CertificatePinner.Builder.add — neuter pin
  // ──────────────────────────────────────────────
  try {
    var CertPinnerBuilder = Java.use("okhttp3.CertificatePinner$Builder");
    CertPinnerBuilder.add.overload(
      "java.lang.String",
      "[Ljava.lang.String;"
    ).implementation = function (hostname, pins) {
      console.log("[+] CertificatePinner.Builder.add bypassed for: " + hostname);
      // Return builder without actually adding pins
      return this;
    };
    console.log("[*] CertificatePinner.Builder.add hook installed");
  } catch (e) {
    console.log("[-] CertificatePinner.Builder not found: " + e.message);
  }

  // ──────────────────────────────────────────────
  // 3. OkHostnameVerifier.verify
  // ──────────────────────────────────────────────
  try {
    var OkHostnameVerifier = Java.use("okhttp3.internal.tls.OkHostnameVerifier");

    try {
      OkHostnameVerifier.verify.overload(
        "java.lang.String",
        "java.security.cert.X509Certificate"
      ).implementation = function (hostname, certificate) {
        console.log("[+] OkHostnameVerifier.verify(X509) bypassed for: " + hostname);
        return true;
      };
    } catch (_) { }

    try {
      OkHostnameVerifier.verify.overload(
        "java.lang.String",
        "javax.net.ssl.SSLSession"
      ).implementation = function (hostname, session) {
        console.log("[+] OkHostnameVerifier.verify(SSLSession) bypassed for: " + hostname);
        return true;
      };
    } catch (_) { }

    console.log("[*] OkHostnameVerifier hooks installed");
  } catch (e) {
    console.log("[-] OkHostnameVerifier not found: " + e.message);
  }

  // ──────────────────────────────────────────────
  // 4. TrustManagerImpl (Android platform)
  // ──────────────────────────────────────────────
  try {
    var TrustManagerImpl = Java.use("com.android.org.conscrypt.TrustManagerImpl");
    TrustManagerImpl.verifyChain.implementation = function (
      untrustedChain, trustAnchorChain, host, clientAuth, ocspData, tlsSctData
    ) {
      console.log("[+] TrustManagerImpl.verifyChain bypassed for: " + host);
      return untrustedChain;
    };
    console.log("[*] TrustManagerImpl hook installed");
  } catch (e) {
    console.log("[-] TrustManagerImpl not found: " + e.message);
  }

  // ──────────────────────────────────────────────
  // 5. X509TrustManager — trust everything
  // ──────────────────────────────────────────────
  try {
    var X509TrustManager = Java.use("javax.net.ssl.X509TrustManager");
    var SSLContext = Java.use("javax.net.ssl.SSLContext");

    var TrustAllManager = Java.registerClass({
      name: "com.frida.TrustAllManager",
      implements: [X509TrustManager],
      methods: {
        checkClientTrusted: function (chain, authType) { },
        checkServerTrusted: function (chain, authType) { },
        getAcceptedIssuers: function () {
          return [];
        },
      },
    });

    var trustAllArray = Java.array(
      "javax.net.ssl.TrustManager",
      [TrustAllManager.$new()]
    );

    // Hook SSLContext.init to inject our TrustManager
    SSLContext.init.overload(
      "[Ljavax.net.ssl.KeyManager;",
      "[Ljavax.net.ssl.TrustManager;",
      "java.security.SecureRandom"
    ).implementation = function (keyManagers, trustManagers, secureRandom) {
      console.log("[+] SSLContext.init — injecting TrustAll manager");
      this.init(keyManagers, trustAllArray, secureRandom);
    };

    console.log("[*] X509TrustManager + SSLContext hooks installed");
  } catch (e) {
    console.log("[-] X509TrustManager hook failed: " + e.message);
  }

  // ──────────────────────────────────────────────
  // 6. OkHttp CertificateChainCleaner
  // ──────────────────────────────────────────────
  try {
    var CertChainCleaner = Java.use("okhttp3.internal.tls.CertificateChainCleaner");
    CertChainCleaner.clean.overload(
      "java.util.List",
      "java.lang.String"
    ).implementation = function (chain, hostname) {
      console.log("[+] CertificateChainCleaner.clean bypassed for: " + hostname);
      return chain;
    };
    console.log("[*] CertificateChainCleaner hook installed");
  } catch (e) {
    console.log("[-] CertificateChainCleaner not found: " + e.message);
  }

  // ──────────────────────────────────────────────
  // 7. Conscrypt / OpenSSLSocketImpl (newer Android)
  // ──────────────────────────────────────────────
  try {
    var OpenSSLSocketImpl = Java.use("com.android.org.conscrypt.OpenSSLSocketImpl");
    OpenSSLSocketImpl.verifyCertificateChain.implementation = function (
      certRefs, authMethod
    ) {
      console.log("[+] OpenSSLSocketImpl.verifyCertificateChain bypassed");
    };
    console.log("[*] OpenSSLSocketImpl hook installed");
  } catch (e) {
    console.log("[-] OpenSSLSocketImpl not found: " + e.message);
  }

  // ──────────────────────────────────────────────
  // 8. NetworkSecurityConfig (Android 7+)
  // ──────────────────────────────────────────────
  try {
    var NetworkSecurityTrustManager = Java.use(
      "android.security.net.config.NetworkSecurityTrustManager"
    );
    NetworkSecurityTrustManager.checkServerTrusted.overload(
      "[Ljava.security.cert.X509Certificate;",
      "java.lang.String"
    ).implementation = function (certs, authType) {
      console.log("[+] NetworkSecurityTrustManager.checkServerTrusted bypassed");
    };
    console.log("[*] NetworkSecurityTrustManager hook installed");
  } catch (e) {
    console.log("[-] NetworkSecurityTrustManager not found: " + e.message);
  }

  console.log("\n[*] === All SSL pinning bypass hooks applied ===\n");
});

