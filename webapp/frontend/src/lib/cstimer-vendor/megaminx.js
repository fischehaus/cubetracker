// SPDX-License-Identifier: GPL-3.0-or-later
//
// Vendored from csTimer (https://github.com/cs0x7f/cstimer)
// Original file: src/js/scramble/megaminx.js
// Original copyright (C) 2010-2024 csTimer contributors, GPL-3.0-or-later
//
// Modifications: top-level `var X = (function...)()` rewritten to
// `window.X = (function...)()` so IIFE-globals survive ESM-module
// wrapping. No other changes — mechanical adaptation only.
//
// Loaded by ./index.ts.

/* eslint-disable */
/* @ts-nocheck */

(function() {
	"use strict";

	function getKiloScramble() {
		var cc = new mgmsolver.MgmCubie();
		cc.corn = mathlib.rndPerm(20, true);
		var chksum = 60;
		for (var i = 0; i < 19; i++) {
			var t = mathlib.rn(3);
			cc.twst[i] = t;
			chksum -= t;
		}
		cc.twst[19] = chksum % 3;
		return mgmsolver.solveKlmCubie(cc, true);
	}

	function getMegaScramble() {
		var cc = new mgmsolver.MgmCubie();
		cc.corn = mathlib.rndPerm(20, true);
		cc.edge = mathlib.rndPerm(30, true);
		var chksum = 60;
		for (var i = 0; i < 19; i++) {
			var t = mathlib.rn(3);
			cc.twst[i] = t;
			chksum -= t;
		}
		cc.twst[19] = chksum % 3;
		chksum = 0;
		for (var i = 0; i < 29; i++) {
			var t = mathlib.rn(2);
			cc.flip[i] = t;
			chksum ^= t;
		}
		cc.flip[29] = chksum;
		return mgmsolver.solveMgmCubie(cc, true);
	}

	scrMgr.reg('klmso', getKiloScramble)
			  ('mgmso', getMegaScramble);
})();
