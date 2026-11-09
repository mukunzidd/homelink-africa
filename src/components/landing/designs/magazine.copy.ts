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
  coverLines: string;
  talkTitle: string;
  talkBody: string;
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
    coverLines: "On the cover",
    talkTitle: "Talk to a person",
    talkBody: "Write to the Kigali team before you book, or while you are here. A person reads every message.",
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
    coverLines: "En couverture",
    talkTitle: "Parler à quelqu'un",
    talkBody: "Écrivez à l'équipe de Kigali avant de réserver, ou pendant votre séjour. Chaque message est lu par une personne.",
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
    coverLines: "Ku gifubiko",
    talkTitle: "Vugana n'umuntu",
    talkBody: "Andikira itsinda rya Kigali mbere yo gutumiza, cyangwa igihe uri hano. Buri butumwa busomwa n'umuntu.",
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
    coverLines: "Kwenye jalada",
    talkTitle: "Ongea na mtu",
    talkBody: "Andikia timu ya Kigali kabla ya kuweka nafasi, au ukiwa hapa. Kila ujumbe unasomwa na mtu.",
  },
};
