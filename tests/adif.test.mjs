import assert from 'node:assert/strict';
import test from 'node:test';
import { exportAdif, parseAdif } from '../.test-build/src/lib/adif.js';
import { emptyQso } from '../.test-build/src/lib/qso.js';

const profile = {
  callsign: 'UR5ABC', operator: 'UR5ABC', gridSquare: 'KO50', defaultBand: '20M',
  defaultMode: 'SSB', defaultPower: '100', language: 'uk'
};

test('parses standard ADI fields by their declared length', () => {
  const [qso] = parseAdif('<ADIF_VER:5>3.1.7<EOH><CALL:6>UT1AAA<COMMENT:14>Kyiv, 12:30 PM<EOR>', profile);
  assert.equal(qso.call, 'UT1AAA');
  assert.equal(qso.comment, 'Kyiv, 12:30 PM');
});

test('preserves unknown ADIF fields', () => {
  const [qso] = parseAdif('<CALL:6>UT1AAA<POTA_REF:7>UR-0001<EOR>', profile);
  assert.equal(qso.extraFields.POTA_REF, 'UR-0001');
});

test('round-trips Ukrainian text and angle brackets', () => {
  const qso = emptyQso(profile, new Date('2026-08-04T18:30:00Z'));
  qso.call = 'UT1AAA'; qso.comment = 'Київ <центр>';
  const [parsed] = parseAdif(exportAdif([qso], '0.3.0'), profile);
  assert.equal(parsed.comment, qso.comment);
  assert.equal(parsed.qsoDate, '20260804');
});

test('rejects malformed lengths', () => {
  assert.throws(() => parseAdif('<CALL:x>UT1AAA<EOR>', profile), /Invalid length/);
});
