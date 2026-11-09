import type { DesignCopy } from "./copy";

/** Words the "report" candidate needs that no message file has yet. */
export const copy: DesignCopy<{
  masthead: string;
  latest: string;
  browse: string;
  talk: string;
  points: (n: number) => string;
  registerTitle: string;
  registerBody: string;
  colHome: string;
  colInspector: string;
  colDate: string;
  colNight: string;
}> = {
  en: {
    masthead: "Field report, Kigali",
    latest: "Latest inspection",
    browse: "Or go straight to",
    talk: "Talk to the team in Kigali",
    points: (n) => `Checked against a ${n}-point list`,
    registerTitle: "The register",
    registerBody: "Each line is one home, the person who inspected it, the day they did, and the price of a night",
    colHome: "Home",
    colInspector: "Inspected by",
    colDate: "Date",
    colNight: "Per night",
  },
  fr: {
    masthead: "Rapport de terrain, Kigali",
    latest: "Dernière inspection",
    browse: "Ou allez directement à",
    talk: "Parler à l'équipe de Kigali",
    points: (n) => `Contrôlé sur une liste de ${n} points`,
    registerTitle: "Le registre",
    registerBody: "Chaque ligne est un logement, la personne qui l'a inspecté, le jour de sa visite et le prix d'une nuit",
    colHome: "Logement",
    colInspector: "Inspecté par",
    colDate: "Date",
    colNight: "Par nuit",
  },
  rw: {
    masthead: "Raporo y'igenzura, Kigali",
    latest: "Igenzura riheruka",
    browse: "Cyangwa ujye aho ushaka",
    talk: "Vugana n'itsinda ryacu i Kigali",
    points: (n) => `Byagenzuwe hakurikijwe urutonde rw'ingingo ${n}`,
    registerTitle: "Igitabo cy'ibyagenzuwe",
    registerBody: "Buri murongo ni inzu imwe, uwayigenzuye, umunsi yayigenzuyeho n'igiciro cy'ijoro rimwe",
    colHome: "Inzu",
    colInspector: "Yagenzuwe na",
    colDate: "Itariki",
    colNight: "Ijoro rimwe",
  },
  sw: {
    masthead: "Ripoti ya ukaguzi, Kigali",
    latest: "Ukaguzi wa karibuni",
    browse: "Au nenda moja kwa moja",
    talk: "Ongea na timu yetu ya Kigali",
    points: (n) => `Imekaguliwa kwa orodha ya vipengele ${n}`,
    registerTitle: "Daftari la ukaguzi",
    registerBody: "Kila mstari ni nyumba moja, aliyeikagua, siku aliyoikagua na bei ya usiku mmoja",
    colHome: "Nyumba",
    colInspector: "Imekaguliwa na",
    colDate: "Tarehe",
    colNight: "Kwa usiku",
  },
};
