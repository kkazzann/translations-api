import { createCache } from 'cache-manager';
import { getMilisFromMinutes, getMilisFromSeconds } from './timeUtils';

const cache = createCache({
  ttl: getMilisFromMinutes(1),
  refreshThreshold: getMilisFromSeconds(1),
});

let PREWARM_DONE = false;

export function checkIfPrewarmIsDone() {
  if (!PREWARM_DONE) {
    throw new Error(
      JSON.stringify({
        status: 500,
        message: 'Static content is being prewarmed, please try again shortly.',
      })
    );
  }
}

export function setPrewarmDone(boolean: boolean) {
  PREWARM_DONE = boolean;
}

export default cache;
