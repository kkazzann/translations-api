import axios from 'axios';
import { toast } from 'sonner';

export async function purge({ key }: { key: string }): Promise<void> {
  let response;

  if (key.startsWith('dynamic_')) {
    // dynamic keys are now prefixed with year: dynamic_<year>_<sheetTab>
    const rest = key.slice('dynamic_'.length);
    const parts = rest.split('_');
    const year = parts.shift();
    const sheet = parts.join('_');
    if (!year || !sheet) throw new Error(`Invalid dynamic key: ${key}`);
    // call the force-refresh endpoint
    response = await axios.get(`/dynamic/${year}/${sheet}/force-refresh`);
  } else if (key.startsWith('static_')) {
    const sheet = key.replace(/^static_/, '');
    response = await axios.get(`/static/${sheet}/force-refresh`);
  }

  if (!response || response.status !== 200) {
    throw new Error(`Failed to purge ${key}`);
  }

  toast.success(`Purged ${key} successfully`);

  return;
}
