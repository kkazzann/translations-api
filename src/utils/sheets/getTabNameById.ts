import { getDynamicTranslations } from '../../googleAuth';

export async function getTabNameById(id: number, year?: string) {
  const document = await getDynamicTranslations(year);
  const sheet = document.sheetsById?.[id];
  return sheet?.title;
}
