import openapi from '@elysiajs/openapi';
import { registerAdminGroup } from '../endpoints/admin.endpoint';
import { registerMiscGroup } from '../endpoints/misc.endpoint';

import {
  registerCategoryLinksGroup,
  registerCategoryTitlesGroup,
  registerFooterGroup,
  registerHeaderGroup,
  registerTemplatesGroup,
} from '../endpoints/static';
import Elysia from 'elysia';
import { t } from 'elysia';

export function registerStatic(app: any) {
  registerHeaderGroup(app);
  registerFooterGroup(app);
  registerTemplatesGroup(app);
  registerCategoryTitlesGroup(app);
  registerCategoryLinksGroup(app);
}

export function registerOther(app: Elysia) {
  registerAdminGroup(app);
  registerMiscGroup(app);
}
