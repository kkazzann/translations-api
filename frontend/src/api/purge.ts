import axios from 'axios';
import { toast } from 'sonner';

export async function purge({ key }: { key: string }): Promise<void> {
  let response;

  if (key.startsWith('dynamic_')) {
    response = await axios.post(`/dynamic/${key}`);
  } else if (key.startsWith('static_')) {
    response = await axios.post(`/static/${key}`);
  }

  if (!response || response.status !== 200) {
    throw new Error(`Failed to purge ${key}`);
  }

  toast.success(`Purged ${key} successfully`);

  return;
}
