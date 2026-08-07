import assert from 'node:assert/strict';
import test from 'node:test';
import {
  utcQsoDate, utcQsoTime, defaultRst, createLocalId, emptyQso, normalizeCallsign
} from '../.test-build/src/lib/qso.js';

const profile = {
  callsign: 'UR5ABC', operator: 'UR5ABC', gridSquare: 'KO50', defaultBand: '20M',
  defaultMode: 'FT8', defaultPower: '0.5', language: 'uk'
};

test('utcQsoDate formats as YYYYMMDD in UTC', () => {
  assert.equal(utcQsoDate(new Date('2026-03-05T18:30:00Z')), '20260305');
});

test('utcQsoTime formats as HHMM in UTC', () => {
  assert.equal(utcQsoTime(new Date('2026-03-05T08:07:00Z')), '0807');
});

test('defaultRst picks the report convention per mode', () => {
  assert.equal(defaultRst('CW'), '599');
  assert.equal(defaultRst('cw'), '599');
  assert.equal(defaultRst('RTTY'), '599');
  assert.equal(defaultRst('FT8'), '-10');
  assert.equal(defaultRst('FT4'), '-10');
  assert.equal(defaultRst('SSB'), '59');
  assert.equal(defaultRst('unknown-mode'), '59');
});

test('createLocalId returns a well-formed UUID v4', () => {
  const id = createLocalId();
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.notEqual(id, createLocalId());
});

test('emptyQso copies station profile defaults and derives RST from the default mode', () => {
  const now = new Date('2026-03-05T18:30:00Z');
  const qso = emptyQso(profile, now);
  assert.equal(qso.call, '');
  assert.equal(qso.band, profile.defaultBand);
  assert.equal(qso.mode, profile.defaultMode);
  assert.equal(qso.rstSent, '-10');
  assert.equal(qso.rstRcvd, '-10');
  assert.equal(qso.stationCallsign, profile.callsign);
  assert.equal(qso.myGridSquare, profile.gridSquare);
  assert.equal(qso.txPower, profile.defaultPower);
  assert.equal(qso.qsoDate, '20260305');
  assert.equal(qso.timeOn, '1830');
  assert.deepEqual(qso.extraFields, {});
});

test('normalizeCallsign trims and uppercases', () => {
  assert.equal(normalizeCallsign('  ut1aaa '), 'UT1AAA');
  assert.equal(normalizeCallsign('Dl1aBc'), 'DL1ABC');
});
