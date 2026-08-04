export * from './protocol.js';
export * from './relay-transport.js';

/**
 * Future transports implement QsoConnectTransport:
 * - WebRtcTransport: direct browser/device DataChannel with relay fallback.
 * - LoRaTransport: small encrypted envelopes split into radio-sized frames.
 */
