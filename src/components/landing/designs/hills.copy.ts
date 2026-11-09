import type { DesignCopy } from "./copy";

type Dir = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

type HillsCopy = {
  eyebrow: string;
  mapLabel: string;
  mapNote: string;
  north: string;
  km: string;
  night: string;
  neighbourhoodLink: string;
  latestTitle: string;
  beyondTitle: string;
  inKigali: string;
  byRoad: (hours: string) => string;
  dir: Record<Dir, string>;
};

export const copy: DesignCopy<HillsCopy> = {
  en: {
    eyebrow: "Kigali, hill by hill",
    mapLabel: "Map of Kigali's neighbourhoods with how many verified places each one has",
    mapNote: "Shown by neighbourhood. The exact address comes with your booking",
    north: "N",
    km: "1 km",
    night: "a night",
    neighbourhoodLink: "About the neighbourhood",
    latestTitle: "The newest inspection",
    beyondTitle: "Beyond the hills",
    inKigali: "In Kigali",
    byRoad: (h) => `${h} h by road`,
    dir: { n: "North", ne: "North-east", e: "East", se: "South-east", s: "South", sw: "South-west", w: "West", nw: "North-west" },
  },
  fr: {
    eyebrow: "Kigali, colline par colline",
    mapLabel: "Carte des quartiers de Kigali avec le nombre de logements vérifiés dans chacun",
    mapNote: "Affiché par quartier. L'adresse exacte vous est donnée à la réservation",
    north: "N",
    km: "1 km",
    night: "la nuit",
    neighbourhoodLink: "Découvrir le quartier",
    latestTitle: "La dernière inspection",
    beyondTitle: "Au-delà des collines",
    inKigali: "Dans Kigali",
    byRoad: (h) => `${h} h de route`,
    dir: { n: "Nord", ne: "Nord-est", e: "Est", se: "Sud-est", s: "Sud", sw: "Sud-ouest", w: "Ouest", nw: "Nord-ouest" },
  },
  rw: {
    eyebrow: "Kigali, umusozi ku wundi",
    mapLabel: "Ikarita y'uduce twa Kigali n'umubare w'aho kuba hagenzuwe muri buri gace",
    mapNote: "Herekanwa ku gace. Aderesi nyayo uyihabwa umaze kubika",
    north: "N",
    km: "km 1",
    night: "ijoro rimwe",
    neighbourhoodLink: "Menya agace",
    latestTitle: "Igenzura riheruka",
    beyondTitle: "Hirya y'imisozi",
    inKigali: "Muri Kigali",
    byRoad: (h) => `Amasaha ${h} mu modoka`,
    dir: {
      n: "Amajyaruguru",
      ne: "Amajyaruguru y'iburasirazuba",
      e: "Iburasirazuba",
      se: "Amajyepfo y'iburasirazuba",
      s: "Amajyepfo",
      sw: "Amajyepfo y'iburengerazuba",
      w: "Iburengerazuba",
      nw: "Amajyaruguru y'iburengerazuba",
    },
  },
  sw: {
    eyebrow: "Kigali, kilima kwa kilima",
    mapLabel: "Ramani ya mitaa ya Kigali na idadi ya makazi yaliyothibitishwa katika kila mtaa",
    mapNote: "Inaonyeshwa kwa mtaa. Anwani kamili unaipata ukishahifadhi",
    north: "K",
    km: "km 1",
    night: "kwa usiku",
    neighbourhoodLink: "Kuhusu mtaa huu",
    latestTitle: "Ukaguzi wa karibuni",
    beyondTitle: "Ng'ambo ya vilima",
    inKigali: "Ndani ya Kigali",
    byRoad: (h) => `Saa ${h} kwa barabara`,
    dir: {
      n: "Kaskazini",
      ne: "Kaskazini mashariki",
      e: "Mashariki",
      se: "Kusini mashariki",
      s: "Kusini",
      sw: "Kusini magharibi",
      w: "Magharibi",
      nw: "Kaskazini magharibi",
    },
  },
};

export type { Dir };
