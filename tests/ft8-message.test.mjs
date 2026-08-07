import assert from 'node:assert/strict';
import test from 'node:test';
import { parseFt8Message, impliesCompletedExchange, otherStationCall } from '../.test-build/src/lib/ft8/message.js';

test('parses a bare CQ', () => {
  assert.deepEqual(parseFt8Message('CQ UT1AAA KO50'), { type: 'CQ', caller: 'UT1AAA', grid: 'KO50' });
  assert.deepEqual(parseFt8Message('CQ UT1AAA'), { type: 'CQ', caller: 'UT1AAA' });
});

test('parses a directed CQ', () => {
  assert.deepEqual(parseFt8Message('CQ DX UT1AAA KO50'), { type: 'CQ', directed: 'DX', caller: 'UT1AAA', grid: 'KO50' });
  assert.deepEqual(parseFt8Message('CQ POTA UT1AAA'), { type: 'CQ', directed: 'POTA', caller: 'UT1AAA' });
});

test('parses a grid exchange', () => {
  assert.deepEqual(parseFt8Message('DL1ABC UT1AAA KO50'), { type: 'GRID', to: 'DL1ABC', from: 'UT1AAA', grid: 'KO50' });
});

test('parses signal reports with and without roger', () => {
  assert.deepEqual(parseFt8Message('DL1ABC UT1AAA -10'), { type: 'REPORT', to: 'DL1ABC', from: 'UT1AAA', report: '-10', roger: false });
  assert.deepEqual(parseFt8Message('DL1ABC UT1AAA R-10'), { type: 'REPORT', to: 'DL1ABC', from: 'UT1AAA', report: '-10', roger: true });
});

test('parses RRR, RR73, and 73', () => {
  assert.deepEqual(parseFt8Message('DL1ABC UT1AAA RRR'), { type: 'RRR', to: 'DL1ABC', from: 'UT1AAA' });
  assert.deepEqual(parseFt8Message('DL1ABC UT1AAA RR73'), { type: 'RR73', to: 'DL1ABC', from: 'UT1AAA' });
  assert.deepEqual(parseFt8Message('DL1ABC UT1AAA 73'), { type: '73', to: 'DL1ABC', from: 'UT1AAA' });
});

test('falls back to UNKNOWN for free text and unrecognized shapes', () => {
  assert.deepEqual(parseFt8Message('HELLO WORLD TEST'), { type: 'UNKNOWN', text: 'HELLO WORLD TEST' });
  assert.deepEqual(parseFt8Message('CQ'), { type: 'UNKNOWN', text: 'CQ' });
});

test('impliesCompletedExchange is true only for two-station exchange types', () => {
  assert.equal(impliesCompletedExchange(parseFt8Message('DL1ABC UT1AAA 73')), true);
  assert.equal(impliesCompletedExchange(parseFt8Message('DL1ABC UT1AAA R-10')), true);
  assert.equal(impliesCompletedExchange(parseFt8Message('CQ UT1AAA KO50')), false);
  assert.equal(impliesCompletedExchange(parseFt8Message('gibberish')), false);
});

test('otherStationCall picks the call that is not mine, falling back to `from`', () => {
  const exchange = { to: 'DL1ABC', from: 'UT1AAA' };
  assert.equal(otherStationCall(exchange, 'UT1AAA'), 'DL1ABC');
  assert.equal(otherStationCall(exchange, 'DL1ABC'), 'UT1AAA');
  assert.equal(otherStationCall(exchange, ''), 'UT1AAA');
});
