import { invoke } from '@tauri-apps/api/core';
import type { Qso } from './qso.js';

/** Data visible to a Radio Rules program. No other application state is exposed. */
export interface RadioRuleContext {
  call: string;
  band: string;
  mode: string;
  txPowerMw: number;
  rstSent: string;
  rstReceived: string;
}

/** Safe suggestions returned by Rust; the caller decides whether to apply them. */
export interface RadioRuleEvaluation {
  matchedRules: string[];
  tags: string[];
  notes: string[];
}

/** Structured parser/evaluator error with a source location suitable for an editor. */
export interface RadioRuleError {
  kind: 'syntax' | 'validation' | 'type' | 'limit';
  message: string;
  line: number;
  column: number;
}

/**
 * Converts the ADIF-compatible power value (watts) into the language's explicit
 * milliwatt field. / Перетворює вати ADIF у мілівати правил. /
 * Wandelt den ADIF-Wert in Watt in Milliwatt für die Regeln um.
 */
export function qsoToRuleContext(qso: Qso): RadioRuleContext {
  const watts = Number.parseFloat(qso.txPower.replace(',', '.'));
  return {
    call: qso.call,
    band: qso.band,
    mode: qso.mode,
    txPowerMw: Number.isFinite(watts) ? watts * 1000 : 0,
    rstSent: qso.rstSent,
    rstReceived: qso.rstRcvd
  };
}

/** Runs the capability-free evaluator in Rust without applying its suggestions. */
export function evaluateRadioRules(
  source: string,
  context: RadioRuleContext
): Promise<RadioRuleEvaluation> {
  return invoke<RadioRuleEvaluation>('evaluate_radio_rules', { source, context });
}
