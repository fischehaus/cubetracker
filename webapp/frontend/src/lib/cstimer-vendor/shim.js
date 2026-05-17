// SPDX-License-Identifier: GPL-3.0-or-later
//
// Mini-jQuery-Shim fuer die vendored csTimer-Module.
// csTimer wurde ursprueglich mit jQuery 1.8 gebaut und nutzt eine
// Handvoll der einfachen jQuery-Utility-Funktionen. Statt 250KB jQuery
// mitzuziehen, polyfillen wir die genutzten Methoden minimal.
//
// Gefunden via grep: $.noop, $.isArray, $.each, $.map, $.now,
// $.clipboardCopy — die letzten drei werden im Scramble-Pfad nicht
// aufgerufen (sind in Stats/Export-Code von csTimer), aber wir
// definieren sie defensive trotzdem, damit beim Init nichts crasht.

/* eslint-disable */
/* @ts-nocheck */

(function () {
  if (typeof window === "undefined") return;
  if (window.$ && window.$.noop) return; // schon polyfilled

  // csTimer-Module nutzen ein globales DEBUG-Flag fuer optional Console-
  // Logging. Bei csTimer wird das in cstimer.js gesetzt — fuer unseren
  // Vendor-Subset polyfillen wir den Default (false).
  if (typeof window.DEBUG === "undefined") {
    window.DEBUG = false;
  }

  // ISCSTIMER ist ein csTimer-internes Feature-Flag: TRUE wenn der Code
  // in csTimer's eigener Web-UI laeuft, FALSE in headless / library-Modus.
  // `var scramble = ISCSTIMER && execMain(...)` in scramble.js skipped
  // den UI-Init-Block — wir brauchen NUR die scrMgr-Registrierung darueber.
  if (typeof window.ISCSTIMER === "undefined") {
    window.ISCSTIMER = false;
  }

  function each(obj, cb) {
    if (Array.isArray(obj)) {
      for (var i = 0; i < obj.length; i++) {
        if (cb.call(obj[i], i, obj[i]) === false) break;
      }
    } else if (obj && typeof obj === "object") {
      for (var k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          if (cb.call(obj[k], k, obj[k]) === false) break;
        }
      }
    }
    return obj;
  }

  function map(obj, cb) {
    var out = [];
    each(obj, function (i, v) {
      var r = cb(v, i);
      if (r != null) out.push(r);
    });
    return out;
  }

  window.$ = {
    noop: function () {},
    isArray: Array.isArray,
    each: each,
    map: map,
    now: Date.now,
    clipboardCopy: function () {
      // No-op stub — Clipboard-Funktionalitaet wird vom Scramble-Pfad
      // nie aufgerufen. Falls doch mal noetig: navigator.clipboard nutzen.
    },
    extend: function (target) {
      // Minimal extend (Object.assign-like)
      for (var i = 1; i < arguments.length; i++) {
        var src = arguments[i];
        if (src) {
          for (var k in src) {
            if (Object.prototype.hasOwnProperty.call(src, k)) {
              target[k] = src[k];
            }
          }
        }
      }
      return target;
    },
  };
})();
