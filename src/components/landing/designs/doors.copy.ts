import type { DesignCopy } from "./copy";

/**
 * The words only the "doors" candidate uses. Each door is named for the
 * person standing at it, not for a market segment, and the Rwanda headline
 * says what is on the other side of that door: renting, buying and cars.
 */
type Door = { title: string; sub: string };

type DoorsCopy = {
  choiceLabel: string;
  abroad: Door;
  rwanda: Door;
  rwandaTitle: string;
  rwandaBody: string;
  newest: string;
  checked: string;
  airport: (minutes: number) => string;
  teamBody: string;
  currencyTitle: (code: string) => string;
  currencyBody: (code: string) => string;
  rentTitle: string;
  buyTitle: string;
  carsTitle: string;
  rentNewest: (name: string) => string;
  otherAbroad: string;
  otherRwanda: string;
};

export const copy: DesignCopy<DoorsCopy> = {
  en: {
    choiceLabel: "Where are you looking from",
    abroad: { title: "Coming to Kigali", sub: "Stays by the night, money held until you are in" },
    rwanda: { title: "Living in Rwanda", sub: "Rent by the month, buy, hire a car" },
    rwandaTitle: "Your next home in Kigali, checked in person first",
    rwandaBody: "Homes by the month, homes for sale with the title checked, and cars by the day. Our team in Kigali inspected every one.",
    newest: "Newest inspection",
    checked: "What was checked",
    airport: (m) => `${m} min by road from the airport`,
    teamBody: "Message them by name, before you land and while you are here",
    currencyTitle: (code) => `Prices in ${code}`,
    currencyBody: (code) => `With the price in ${code} beside each one`,
    rentTitle: "Rent by the month",
    buyTitle: "Buy a home",
    carsTitle: "Hire a car",
    rentNewest: (name) => `Newest to rent: ${name}`,
    otherAbroad: "Live in Rwanda? The page can lead with renting, buying and cars, priced in francs",
    otherRwanda: "Coming from abroad? The page can lead with stays, escrow and the newest inspection, in your currency",
  },
  fr: {
    choiceLabel: "D’où regardez-vous",
    abroad: { title: "Je viens à Kigali", sub: "Séjours à la nuit, argent bloqué jusqu’à votre arrivée" },
    rwanda: { title: "J’habite au Rwanda", sub: "Louer au mois, acheter, louer une voiture" },
    rwandaTitle: "Votre prochain logement à Kigali, vérifié sur place d’abord",
    rwandaBody: "Des logements au mois, des maisons à vendre au titre vérifié et des voitures à la journée. Notre équipe à Kigali les a tous inspectés.",
    newest: "Dernière inspection",
    checked: "Ce qui a été vérifié",
    airport: (m) => `À ${m} min de l’aéroport par la route`,
    teamBody: "Écrivez-leur par leur nom, avant d’atterrir et pendant votre séjour",
    currencyTitle: (code) => `Prix en ${code}`,
    currencyBody: (code) => `Avec le prix en ${code} à côté de chacun`,
    rentTitle: "Louer au mois",
    buyTitle: "Acheter un logement",
    carsTitle: "Louer une voiture",
    rentNewest: (name) => `Dernier logement à louer : ${name}`,
    otherAbroad: "Vous habitez au Rwanda ? La page peut commencer par la location, l’achat et les voitures, en francs",
    otherRwanda: "Vous venez de l’étranger ? La page peut commencer par les séjours, le séquestre et la dernière inspection, dans votre devise",
  },
  rw: {
    choiceLabel: "Uri he ubu",
    abroad: { title: "Ndaza i Kigali", sub: "Aho kurara, amafaranga abikwa kugeza winjiye" },
    rwanda: { title: "Ntuye mu Rwanda", sub: "Gukodesha ku kwezi, kugura, gukodesha imodoka" },
    rwandaTitle: "Inzu yawe itaha i Kigali, yabanje kugenzurwa",
    rwandaBody: "Inzu zikodeshwa ku kwezi, inzu zigurishwa zifite ibyangombwa byagenzuwe, n’imodoka zikodeshwa ku munsi. Itsinda ryacu i Kigali ryagenzuye buri kimwe.",
    newest: "Igenzura riheruka",
    checked: "Ibyagenzuwe",
    airport: (m) => `Iminota ${m} mu modoka uvuye ku kibuga cy’indege`,
    teamBody: "Bandikire mu mazina yabo, mbere yo kugera no mu gihe uri hano",
    currencyTitle: (code) => `Ibiciro muri ${code}`,
    currencyBody: (code) => `Igiciro muri ${code} kiri iruhande rwa buri kimwe`,
    rentTitle: "Gukodesha ku kwezi",
    buyTitle: "Kugura inzu",
    carsTitle: "Gukodesha imodoka",
    rentNewest: (name) => `Iheruka gukodeshwa: ${name}`,
    otherAbroad: "Utuye mu Rwanda? Uru rupapuro rushobora gutangiza gukodesha, kugura n’imodoka, mu mafaranga y’u Rwanda",
    otherRwanda: "Uturutse mu mahanga? Uru rupapuro rushobora gutangiza aho kurara, amafaranga abikwa n’igenzura riheruka, mu ifaranga ryawe",
  },
  sw: {
    choiceLabel: "Unatazama ukiwa wapi",
    abroad: { title: "Ninakuja Kigali", sub: "Malazi kwa usiku, pesa inashikiliwa hadi uingie" },
    rwanda: { title: "Ninaishi Rwanda", sub: "Kupangisha kwa mwezi, kununua, kukodi gari" },
    rwandaTitle: "Nyumba yako ijayo Kigali, imekaguliwa ana kwa ana kwanza",
    rwandaBody: "Nyumba za kupangisha kwa mwezi, nyumba za kuuzwa zenye hati iliyokaguliwa, na magari kwa siku. Timu yetu Kigali ilikagua kila moja.",
    newest: "Ukaguzi wa karibuni",
    checked: "Kilichokaguliwa",
    airport: (m) => `Dakika ${m} kwa barabara kutoka uwanja wa ndege`,
    teamBody: "Waandikie kwa majina yao, kabla ya kutua na ukiwa hapa",
    currencyTitle: (code) => `Bei kwa ${code}`,
    currencyBody: (code) => `Pamoja na bei kwa ${code} kando ya kila moja`,
    rentTitle: "Kupangisha kwa mwezi",
    buyTitle: "Kununua nyumba",
    carsTitle: "Kukodi gari",
    rentNewest: (name) => `Mpya zaidi ya kupangisha: ${name}`,
    otherAbroad: "Unaishi Rwanda? Ukurasa unaweza kuanza na kupangisha, kununua na magari, kwa faranga",
    otherRwanda: "Unatoka nje ya nchi? Ukurasa unaweza kuanza na malazi, pesa inayoshikiliwa na ukaguzi wa karibuni, kwa sarafu yako",
  },
};
