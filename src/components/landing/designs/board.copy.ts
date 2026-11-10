import type { DesignCopy } from "./copy";

/** Words the experimental "board" candidate needs that no message file has yet. */
export const copy: DesignCopy<{
  title: string;
  body: string;
  board: string;
  localTime: string;
  all: string;
  days: string;
  colName: string;
  colWhere: string;
  colInspected: string;
  colPrice: string;
  colStatus: string;
  open: string;
  last: string;
  full: string;
  forSale: string;
  perNight: string;
  perMonth: string;
  perDay: string;
  perPerson: string;
  more: (n: number) => string;
  less: string;
  ask: string;
  legend: string;
  seats: (n: number) => string;
  hours: (n: number) => string;
}> = {
  en: {
    title: "Every place we inspected in Kigali, on one board",
    body: "Homes by the night or the month, homes to buy, cars and days out. Each line was checked in person by someone on the team. Pick a line to open it.",
    board: "Kigali",
    localTime: "Local time",
    all: "All",
    days: "Days out",
    colName: "Name",
    colWhere: "Where",
    colInspected: "Inspected",
    colPrice: "Price",
    colStatus: "Status",
    open: "Open",
    last: "Last one",
    full: "Full",
    forSale: "For sale",
    perNight: "night",
    perMonth: "month",
    perDay: "day",
    perPerson: "person",
    more: (n) => `Show all ${n}`,
    less: "Show fewer",
    ask: "Or say what you need in a sentence",
    legend: "Times are Kigali time. Prices show in your currency.",
    seats: (n) => `${n} seats`,
    hours: (n) => `${n} h`,
  },
  fr: {
    title: "Tout ce que nous avons inspecté à Kigali, sur un seul tableau",
    body: "Logements à la nuit ou au mois, maisons à vendre, voitures et sorties. Chaque ligne a été vérifiée sur place par quelqu'un de l'équipe. Choisissez une ligne pour l'ouvrir.",
    board: "Kigali",
    localTime: "Heure locale",
    all: "Tout",
    days: "Sorties",
    colName: "Nom",
    colWhere: "Où",
    colInspected: "Inspecté",
    colPrice: "Prix",
    colStatus: "Statut",
    open: "Ouvert",
    last: "Dernier",
    full: "Complet",
    forSale: "À vendre",
    perNight: "nuit",
    perMonth: "mois",
    perDay: "jour",
    perPerson: "pers.",
    more: (n) => `Tout afficher (${n})`,
    less: "Afficher moins",
    ask: "Ou dites ce qu'il vous faut en une phrase",
    legend: "Heures de Kigali. Les prix s'affichent dans votre devise.",
    seats: (n) => `${n} places`,
    hours: (n) => `${n} h`,
  },
  rw: {
    title: "Ibyo twagenzuye byose i Kigali, ku kibaho kimwe",
    body: "Amazu yo kurara cyangwa gukodesha ukwezi, amazu yo kugura, imodoka n'ingendo z'umunsi. Buri murongo wagenzuwe n'umuntu wo mu itsinda. Hitamo umurongo uwufungure.",
    board: "Kigali",
    localTime: "Isaha yo mu Rwanda",
    all: "Byose",
    days: "Ingendo",
    colName: "Izina",
    colWhere: "Aho biri",
    colInspected: "Byagenzuwe",
    colPrice: "Igiciro",
    colStatus: "Uko bihagaze",
    open: "Birafunguye",
    last: "Hasigaye kimwe",
    full: "Byuzuye",
    forSale: "Iragurishwa",
    perNight: "ijoro",
    perMonth: "ukwezi",
    perDay: "umunsi",
    perPerson: "umuntu",
    more: (n) => `Erekana byose (${n})`,
    less: "Erekana bike",
    ask: "Cyangwa uvuge icyo ushaka mu nteruro imwe",
    legend: "Amasaha ni ay'i Kigali. Ibiciro biri mu ifaranga ryawe.",
    seats: (n) => `Imyanya ${n}`,
    hours: (n) => `Amasaha ${n}`,
  },
  sw: {
    title: "Kila tulichokagua Kigali, kwenye ubao mmoja",
    body: "Nyumba kwa usiku au kwa mwezi, nyumba za kununua, magari na safari za siku. Kila mstari ulikaguliwa ana kwa ana na mtu wa timu. Chagua mstari kuufungua.",
    board: "Kigali",
    localTime: "Saa za Kigali",
    all: "Vyote",
    days: "Safari za siku",
    colName: "Jina",
    colWhere: "Wapi",
    colInspected: "Ilikaguliwa",
    colPrice: "Bei",
    colStatus: "Hali",
    open: "Wazi",
    last: "Moja imebaki",
    full: "Imejaa",
    forSale: "Inauzwa",
    perNight: "usiku",
    perMonth: "mwezi",
    perDay: "siku",
    perPerson: "mtu",
    more: (n) => `Onyesha zote (${n})`,
    less: "Onyesha chache",
    ask: "Au sema unachohitaji kwa sentensi moja",
    legend: "Saa ni za Kigali. Bei zinaonyeshwa kwa sarafu yako.",
    seats: (n) => `Viti ${n}`,
    hours: (n) => `Saa ${n}`,
  },
};
