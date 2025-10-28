import { registerAdminGroup } from '../endpoints/admin.endpoint';
import { registerMiscGroup } from '../endpoints/misc.endpoint';

export function registerOther(app: any) {
  registerAdminGroup(app);
  registerMiscGroup(app);
}
