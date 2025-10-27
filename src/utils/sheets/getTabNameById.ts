import { getDynamicTranslations } from '../../googleAuth';

export async function getTabNameById(id: number) {
  const document = await getDynamicTranslations();
  const sheet = document.sheetsById?.[id];
  return sheet?.title;
}
