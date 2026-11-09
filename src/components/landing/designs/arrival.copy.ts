import type { DesignCopy } from "./copy";

/** The words only the "arrival" candidate uses. Everything else reads from messages/*.json. */
export const copy: DesignCopy<{
  dayOne: string;
  routeTitle: string;
  stages: { land: string; settle: string; look: string; further: string };
  bodies: { land: string; settle: string };
  departs: string;
}> = {
  en: {
    dayOne: "Day one in Kigali, from what is listed today",
    routeTitle: "Your first day, stage by stage",
    stages: { land: "Land", settle: "Settle in", look: "Look around", further: "Go further" },
    bodies: {
      land: "A car our team has driven, with a driver who knows the roads or the keys to drive it yourself.",
      settle: "Homes someone from our team has stood in, by the night or by the month, and homes for sale with the title checked.",
    },
    departs: "Leaves at {time}",
  },
  fr: {
    dayOne: "Premier jour à Kigali, avec ce qui est en ligne aujourd'hui",
    routeTitle: "Votre premier jour, étape par étape",
    stages: { land: "Arriver", settle: "S'installer", look: "Découvrir", further: "Aller plus loin" },
    bodies: {
      land: "Une voiture que notre équipe a conduite, avec un chauffeur qui connaît les routes, ou les clés pour conduire vous-même.",
      settle: "Des logements visités par un membre de notre équipe, à la nuit ou au mois, et des maisons à vendre dont le titre a été vérifié.",
    },
    departs: "Départ à {time}",
  },
  rw: {
    dayOne: "Umunsi wa mbere i Kigali, uhereye ku biri ku rubuga uyu munsi",
    routeTitle: "Umunsi wawe wa mbere, intambwe ku yindi",
    stages: { land: "Kugera", settle: "Gutura", look: "Gutembera hafi", further: "Kujya kure" },
    bodies: {
      land: "Imodoka ikipe yacu yatwaye, ufite umushoferi uzi imihanda cyangwa ukayitwara ubwawe.",
      settle: "Inzu umwe mu ikipe yacu yasuye, zo kuraramo iminsi mike cyangwa ukwezi, n'inzu zigurishwa zagenzuriwe ibyangombwa.",
    },
    departs: "Guhaguruka: {time}",
  },
  sw: {
    dayOne: "Siku ya kwanza Kigali, kutoka kwa kilichoorodheshwa leo",
    routeTitle: "Siku yako ya kwanza, hatua kwa hatua",
    stages: { land: "Kuwasili", settle: "Kutulia", look: "Kuzunguka", further: "Kwenda mbali" },
    bodies: {
      land: "Gari ambalo timu yetu imeliendesha, pamoja na dereva anayeijua barabara au funguo za kujiendesha mwenyewe.",
      settle: "Nyumba ambazo mtu wa timu yetu ametembelea, kwa usiku au kwa mwezi, na nyumba zinazouzwa zenye hati iliyokaguliwa.",
    },
    departs: "Kuondoka: {time}",
  },
};
