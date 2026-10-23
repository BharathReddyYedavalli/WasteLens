/* Explicit, staff-configured item categories. No AI-to-bin matching. */
export const KIOSK_ITEMS=[
  {id:"empty_plastic_bottle",label:"Empty plastic bottle"},
  {id:"empty_metal_can",label:"Empty metal can"},
  {id:"empty_glass_bottle",label:"Empty glass bottle"},
  {id:"clean_paper",label:"Clean paper"},
  {id:"clean_cardboard",label:"Clean cardboard"},
  {id:"plastic_cutlery",label:"Plastic fork or spoon"},
  {id:"paper_plate",label:"Paper plate"},
  {id:"empty_food_container",label:"Empty food container"},
  {id:"disposable_cup",label:"Disposable cup"},
  {id:"food_scraps",label:"Food scraps"},
  {id:"plastic_film",label:"Plastic bag or film"}
] as const;
export type KioskItem = typeof KIOSK_ITEMS[number]["id"];
export type KioskBin = {id:string;name:string};
export type KioskRule = {item_type:KioskItem;bin_id:string};
export type KioskProfile = {
  configured:boolean;
  organization:string;source:string;
  bins:KioskBin[];rules:KioskRule[];reviewed_at:string|null;
};
export function kioskItemLabel(item:KioskItem) {
  return KIOSK_ITEMS.find(row=>row.id===item)?.label??item;
}
