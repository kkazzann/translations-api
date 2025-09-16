import { createCache } from 'cache-manager';
import { getMilisFromHours, getMilisFromMinutes, getMilisFromSeconds } from './timeUtils';

const cache = createCache({
  ttl: getMilisFromHours(3), // Keep data for 3 hours max (hard expiry)
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
