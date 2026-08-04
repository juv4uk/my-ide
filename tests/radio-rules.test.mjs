import assert from 'node:assert/strict';
import test from 'node:test';
import { qsoToRuleContext } from '../.test-build/src/lib/radio-rules.js';

test('converts ADIF watts to explicit milliwatts for Radio Rules', () => {
  const context = qsoToRuleContext({
    call: 'dl1abc', band: '20M', mode: 'CW', txPower: '0.1',
    rstSent: '599', rstRcvd: '579'
  });

  assert.deepEqual(context, {
    call: 'dl1abc', band: '20M', mode: 'CW', txPowerMw: 100,
    rstSent: '599', rstReceived: '579'
  });
});

test('uses zero for an empty or invalid power value', () => {
  assert.equal(qsoToRuleContext({
    call: '', band: '20M', mode: 'SSB', txPower: '', rstSent: '59', rstRcvd: '59'
  }).txPowerMw, 0);
});
