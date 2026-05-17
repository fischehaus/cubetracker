// SPDX-License-Identifier: GPL-3.0-or-later
//
// Vendored from csTimer (https://github.com/cs0x7f/cstimer)
// Original file: src/js/scramble/1x3x3.js
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
	var solv = new mathlib.Solver(4, 1, [[0, doMove, 384]]);
	var movePieces = [
		[0, 1],
		[2, 3],
		[0, 3],
		[1, 2]
	];

	function doMove(idx, m) {
		var arr = mathlib.setNPerm([], idx >> 4, 4);
		mathlib.acycle(arr, movePieces[m]);
		return (mathlib.getNPerm(arr, 4) << 4) + ((idx & 15) ^ (1 << m));
	}

	function generateScramble() {
		var c = 1 + mathlib.rn(191);
		c = c * 2 + ((mathlib.getNParity(c >> 3, 4) ^ (c >> 1) ^ (c >> 2) ^ c) & 1);
		return solv.toStr(solv.search([c], 0), "RLFB", [""]);
	}
	scrMgr.reg('133', generateScramble);
})();
