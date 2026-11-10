import type { DesignCopy } from "./copy";

/** Words the experimental "wall" candidate needs that no message file has yet. */
export const copy: DesignCopy<{
  title: string;
  slider: string;
  fit: (n: number, total: number) => string;
  orLess: string;
  aNight: string;
  see: (n: number) => string;
  wallLabel: string;
  cheapest: string;
  dearest: string;
  more: string;
  cars: string;
  days: string;
  from: string;
}> = {
  en: {
    title: "Pick a price. Every home in Kigali under it lights up.",
    slider: "Most you want to pay a night",
    fit: (n, total) => `${n} of ${total} homes`,
    orLess: "or less",
    aNight: "a night",
    see: (n) => `See the ${n} homes`,
    wallLabel: "Every home on HomeLink, cheapest first",
    cheapest: "Cheapest",
    dearest: "Dearest",
    more: "Each photograph was taken by our team when they inspected the home.",
    cars: "Cars",
    days: "Days out",
    from: "from",
  },
  fr: {
    title: "Choisissez un prix. Chaque logement de Kigali en dessous s'allume.",
    slider: "Le maximum par nuit",
    fit: (n, total) => `${n} logements sur ${total}`,
    orLess: "ou moins",
    aNight: "la nuit",
    see: (n) => `Voir les ${n} logements`,
    wallLabel: "Tous les logements de HomeLink, du moins cher au plus cher",
    cheapest: "Moins cher",
    dearest: "Plus cher",
    more: "Chaque photo a été prise par notre équipe lors de l'inspection du logement.",
    cars: "Voitures",
    days: "Sorties",
    from: "dès",
  },
  rw: {
    title: "Hitamo igiciro. Inzu zose z'i Kigali ziri munsi yacyo ziraka.",
    slider: "Amafaranga menshi wishyura ijoro rimwe",
    fit: (n, total) => `Inzu ${n} kuri ${total}`,
    orLess: "cyangwa munsi",
    aNight: "ijoro rimwe",
    see: (n) => `Reba inzu ${n}`,
    wallLabel: "Inzu zose ziri kuri HomeLink, uhereye ku ihendutse",
    cheapest: "Ihendutse",
    dearest: "Ihenze",
    more: "Buri foto yafashwe n'itsinda ryacu igihe ryagenzuraga inzu.",
    cars: "Imodoka",
    days: "Ingendo",
    from: "guhera",
  },
  sw: {
    title: "Chagua bei. Kila nyumba ya Kigali chini yake inawaka.",
    slider: "Kiwango cha juu kwa usiku",
    fit: (n, total) => `Nyumba ${n} kati ya ${total}`,
    orLess: "au chini",
    aNight: "kwa usiku",
    see: (n) => `Ona nyumba ${n}`,
    wallLabel: "Kila nyumba kwenye HomeLink, nafuu kwanza",
    cheapest: "Nafuu zaidi",
    dearest: "Ghali zaidi",
    more: "Kila picha ilipigwa na timu yetu walipokagua nyumba.",
    cars: "Magari",
    days: "Safari za siku",
    from: "kuanzia",
  },
};
