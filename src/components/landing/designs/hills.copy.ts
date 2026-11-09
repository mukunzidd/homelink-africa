import type { DesignCopy } from "./copy";

type Dir = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

type HillsCopy = {
  eyebrow: string;
  mapLabel: string;
  distanceNote: string;
  legendCount: string;
  legend: string;
  terrain: string;
  newest: (place: string, name: string, date: string) => string;
  toRent: (n: number) => string;
  forSale: (n: number) => string;
  toAirport: (km: number) => string;
  toCentre: (km: number) => string;
  contact: string;
  pickup: string;
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
    distanceNote: "Distances in a straight line from the middle of each neighbourhood, as on the map",
    eyebrow: "Kigali, hill by hill",
    mapLabel: "Map of Kigali's neighbourhoods with how many verified places each one has",
    legendCount: "Beside each name, the number of verified places to stay.",
    legend: "Beside each name, the verified places to stay and the cheapest night.",
    terrain: "The hills are an impression of the land; only the neighbourhood positions are real.",
    newest: (p, n, d) => `Newest inspection: ${p}, by ${n} on ${d}`,
    toRent: (n) => `${n} to rent by the month`,
    forSale: (n) => `${n} for sale`,
    toAirport: (m) => `${m} km from the airport`,
    toCentre: (m) => `${m} km from the city centre`,
    contact: "Write to the team",
    pickup: "Airport pickup and other extras",
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
    distanceNote: "Distances à vol d'oiseau depuis le centre de chaque quartier, comme sur la carte",
    eyebrow: "Kigali, colline par colline",
    mapLabel: "Carte des quartiers de Kigali avec le nombre de logements vérifiés dans chacun",
    legendCount: "À côté de chaque nom, le nombre de logements vérifiés.",
    legend: "À côté de chaque nom, les logements vérifiés et la nuit la moins chère.",
    terrain: "Les collines donnent une idée du relief ; seule la position des quartiers est exacte.",
    newest: (p, n, d) => `Dernière inspection : ${p}, par ${n} le ${d}`,
    toRent: (n) => `${n} à louer au mois`,
    forSale: (n) => `${n} à vendre`,
    toAirport: (m) => `${m} km de l'aéroport`,
    toCentre: (m) => `${m} km du centre-ville`,
    contact: "Écrire à l'équipe",
    pickup: "Transfert depuis l'aéroport et autres services",
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
    distanceNote: "Intera mu murongo ugororotse uhereye hagati muri buri gace, nk'uko biri ku ikarita",
    eyebrow: "Kigali, umusozi ku wundi",
    mapLabel: "Ikarita y'uduce twa Kigali n'umubare w'aho kuba hagenzuwe muri buri gace",
    legendCount: "Iruhande rwa buri zina, umubare w'aho kuba hagenzuwe.",
    legend: "Iruhande rwa buri zina, aho kuba hagenzuwe n'ijoro rihendutse kurusha ayandi.",
    terrain: "Imisozi ni igishushanyo cy'uko ubutaka bumeze; aho uduce duherereye ni ho nyaho.",
    newest: (p, n, d) => `Igenzura riheruka: ${p}, ryakozwe na ${n} ku wa ${d}`,
    toRent: (n) => (n === 1 ? "inzu 1 ikodeshwa ku kwezi" : `inzu ${n} zikodeshwa ku kwezi`),
    forSale: (n) => (n === 1 ? "inzu 1 igurishwa" : `inzu ${n} zigurishwa`),
    toAirport: (m) => `km ${m} uvuye ku kibuga cy'indege`,
    toCentre: (m) => `km ${m} uvuye mu mujyi rwagati`,
    contact: "Andikira itsinda",
    pickup: "Kwakirwa ku kibuga cy'indege n'izindi serivisi",
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
    distanceNote: "Umbali kwa mstari mnyoofu kutoka katikati ya kila mtaa, kama kwenye ramani",
    eyebrow: "Kigali, kilima kwa kilima",
    mapLabel: "Ramani ya mitaa ya Kigali na idadi ya makazi yaliyothibitishwa katika kila mtaa",
    legendCount: "Kando ya kila jina, idadi ya makazi yaliyothibitishwa.",
    legend: "Kando ya kila jina, makazi yaliyothibitishwa na bei ya usiku nafuu zaidi.",
    terrain: "Vilima ni mchoro wa jinsi ardhi ilivyo; mahali pa mitaa ndipo halisi.",
    newest: (p, n, d) => `Ukaguzi wa karibuni: ${p}, na ${n} tarehe ${d}`,
    toRent: (n) => (n === 1 ? "nyumba 1 ya kupangisha kwa mwezi" : `nyumba ${n} za kupangisha kwa mwezi`),
    forSale: (n) => (n === 1 ? "nyumba 1 inauzwa" : `nyumba ${n} zinauzwa`),
    toAirport: (m) => `km ${m} kutoka uwanja wa ndege`,
    toCentre: (m) => `km ${m} kutoka katikati ya jiji`,
    contact: "Iandikie timu",
    pickup: "Kupokelewa uwanja wa ndege na huduma nyingine",
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
