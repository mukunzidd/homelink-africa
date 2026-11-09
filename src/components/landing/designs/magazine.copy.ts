import type { DesignCopy } from "./copy";

/** The words the magazine design adds; everything else reuses the message files. */
export const copy: DesignCopy<{
  issue: string;
  coverAlt: string;
  newest: string;
  contents: string;
  inspection: string;
  note: string;
  signed: string;
  rooms: (bedrooms: number, sleeps: number) => string;
}> = {
  en: {
    issue: "The Kigali issue",
    coverAlt: "Two women walking along a lit pedestrian street in Kigali at night",
    newest: "Newest inspection",
    contents: "Contents",
    inspection: "The inspection",
    note: "Editor's note",
    signed: "The HomeLink team, Kigali",
    rooms: (b, s) => `${b} ${b === 1 ? "bedroom" : "bedrooms"}, sleeps ${s}`,
  },
  fr: {
    issue: "Le numéro Kigali",
    coverAlt: "Deux femmes marchent dans une rue piétonne éclairée de Kigali, la nuit",
    newest: "Dernière inspection",
    contents: "Sommaire",
    inspection: "L'inspection",
    note: "Le mot de la rédaction",
    signed: "L'équipe HomeLink, Kigali",
    rooms: (b, s) => `${b} ${b === 1 ? "chambre" : "chambres"}, ${s} personnes`,
  },
  rw: {
    issue: "Nimero ya Kigali",
    coverAlt: "Abagore babiri bagenda mu muhanda w'abanyamaguru ucanye amatara i Kigali nijoro",
    newest: "Igenzura riheruka",
    contents: "Ibirimo",
    inspection: "Igenzura",
    note: "Ijambo ry'ubwanditsi",
    signed: "Itsinda rya HomeLink, Kigali",
    rooms: (b, s) => `${b === 1 ? "Icyumba 1 cyo kuraramo" : `Ibyumba ${b} byo kuraramo`}, abantu ${s}`,
  },
  sw: {
    issue: "Toleo la Kigali",
    coverAlt: "Wanawake wawili wakitembea kwenye mtaa wa waenda kwa miguu wenye taa mjini Kigali usiku",
    newest: "Ukaguzi wa hivi karibuni",
    contents: "Yaliyomo",
    inspection: "Ukaguzi",
    note: "Neno la mhariri",
    signed: "Timu ya HomeLink, Kigali",
    rooms: (b, s) => `${b === 1 ? "Chumba 1 cha kulala" : `Vyumba ${b} vya kulala`}, watu ${s}`,
  },
};
