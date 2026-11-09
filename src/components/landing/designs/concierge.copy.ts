import type { DesignCopy } from "./copy";

/**
 * The words only the "concierge" candidate uses. The conversation in the
 * hero is illustrative, but everything it says is true of the cards shown
 * under it: the three most recently inspected stays, newest first, with the
 * reply signed by the person who inspected the first of them. The guest is
 * someone whose parents are coming, which is a visitor booking from abroad
 * and a Kigali resident hosting family alike. The pickup the reply offers is
 * the airport extra every stay booking can add.
 */
type Copy = {
  title: string;
  body: (count: number) => string;
  threadTitle: string;
  threadWith: (name: string) => string;
  today: string;
  ask: string;
  reply: (date: string) => string;
  composer: string;
  escrow: string;
  writeTeam: string;
  inspectorRole: string;
  peopleTitle: string;
  peopleBody: string;
  inspected: (n: number) => string;
  latest: (date: string) => string;
  checksTitle: string;
};

export const copy: DesignCopy<Copy> = {
  en: {
    title: "Ask the people who stood in every room",
    body: (count) =>
      `Our team in Kigali inspected all ${count} listings on HomeLink in person. Ask in your own words and the answer comes only from what they checked.`,
    threadTitle: "HomeLink team, Kigali",
    threadWith: (name) => `You and ${name}`,
    today: "Today",
    ask: "My parents arrive next month. Which homes has your team inspected most recently?",
    reply: (date) => `These three, newest first. I inspected the first one myself on ${date}. Each card shows who checked it and when, and for any of them a driver can meet your parents at arrivals.`,
    composer: "Ask in your own words",
    escrow: "When you book a stay, your payment is held until you confirm check-in",
    writeTeam: "Write to the team",
    inspectorRole: "Inspector",
    peopleTitle: "Who inspected the homes",
    peopleBody: "Every stay names the person who inspected it. These are the names on the homes you can book today.",
    inspected: (n) => (n === 1 ? "1 home inspected" : `${n} homes inspected`),
    latest: (date) => `Most recent ${date}`,
    checksTitle: "What they check before a home goes live",
  },
  fr: {
    title: "Demandez à ceux qui sont entrés dans chaque pièce",
    body: (count) =>
      `Notre équipe à Kigali a inspecté sur place les ${count} annonces de HomeLink. Posez votre question avec vos mots, la réponse ne porte que sur ce qu’elle a vérifié.`,
    threadTitle: "Équipe HomeLink, Kigali",
    threadWith: (name) => `Vous et ${name}`,
    today: "Aujourd’hui",
    ask: "Mes parents arrivent le mois prochain. Quels logements votre équipe a-t-elle inspectés en dernier ?",
    reply: (date) => `Les voici, du plus récent au plus ancien. J’ai inspecté le premier moi-même, le ${date}. Chaque fiche indique qui l’a vérifiée et quand, et pour chacun, un chauffeur peut attendre vos parents aux arrivées.`,
    composer: "Demandez avec vos mots",
    escrow: "Quand vous réservez un séjour, votre paiement est retenu jusqu’à ce que vous confirmiez votre arrivée",
    writeTeam: "Écrire à l’équipe",
    inspectorRole: "Inspecteur",
    peopleTitle: "Qui a inspecté les logements",
    peopleBody: "Chaque logement porte le nom de la personne qui l’a inspecté. Voici les noms sur ceux que vous pouvez réserver aujourd’hui.",
    inspected: (n) => (n === 1 ? "1 logement inspecté" : `${n} logements inspectés`),
    latest: (date) => `Dernière visite le ${date}`,
    checksTitle: "Ce qu’ils vérifient avant la mise en ligne",
  },
  rw: {
    title: "Baza abantu bageze muri buri cyumba",
    body: (count) =>
      `Itsinda ryacu i Kigali ryagenzuye imbonankubone ibintu byose ${count} biri kuri HomeLink. Baza mu magambo yawe, igisubizo kiva gusa mu byo ryagenzuye.`,
    threadTitle: "Itsinda rya HomeLink, Kigali",
    threadWith: (name) => `Wowe na ${name}`,
    today: "Uyu munsi",
    ask: "Ababyeyi banjye bazaza ukwezi gutaha. Ni ayahe mazu itsinda ryanyu riheruka kugenzura?",
    reply: (date) => `Aya ni yo atatu, uhereye ku iheruka. Iya mbere nayigenzuye ubwanjye ku wa ${date}. Buri kimwe kigaragaza uwakigenzuye n’igihe. Kuri buri imwe, umushoferi ashobora kwakira ababyeyi bawe ku kibuga cy’indege.`,
    composer: "Baza mu magambo yawe",
    escrow: "Iyo ufashe icumbi, amafaranga yawe abikwa kugeza wemeje ko wageze",
    writeTeam: "Andikira itsinda",
    inspectorRole: "Umugenzuzi",
    peopleTitle: "Abagenzuye amazu",
    peopleBody: "Buri nzu igaragaza izina ry’uwayigenzuye. Aya ni amazina ari ku mazu ushobora gufata uyu munsi.",
    inspected: (n) => (n === 1 ? "Inzu 1 yagenzuwe" : `Amazu ${n} yagenzuwe`),
    latest: (date) => `Iheruka ku wa ${date}`,
    checksTitle: "Ibyo bagenzura mbere y’uko inzu ijya ku rubuga",
  },
  sw: {
    title: "Uliza watu walioingia kila chumba",
    body: (count) =>
      `Timu yetu mjini Kigali ilikagua ana kwa ana matangazo yote ${count} ya HomeLink. Uliza kwa maneno yako, na jibu linatoka tu kwenye yale waliyokagua.`,
    threadTitle: "Timu ya HomeLink, Kigali",
    threadWith: (name) => `Wewe na ${name}`,
    today: "Leo",
    ask: "Wazazi wangu wanawasili mwezi ujao. Ni nyumba zipi timu yenu imezikagua hivi karibuni?",
    reply: (date) => `Hizi hapa tatu, kuanzia ya karibuni zaidi. Ya kwanza niliikagua mwenyewe tarehe ${date}. Kila kadi inaonyesha nani aliikagua na lini, na kwa yoyote kati yake dereva anaweza kuwapokea wazazi wako uwanja wa ndege.`,
    composer: "Uliza kwa maneno yako",
    escrow: "Ukiweka nafasi ya malazi, malipo yako yanashikiliwa hadi uthibitishe umeingia",
    writeTeam: "Iandikie timu",
    inspectorRole: "Mkaguzi",
    peopleTitle: "Waliokagua nyumba",
    peopleBody: "Kila makazi yanataja jina la aliyeyakagua. Haya ndiyo majina kwenye nyumba unazoweza kuweka nafasi leo.",
    inspected: (n) => (n === 1 ? "Nyumba 1 imekaguliwa" : `Nyumba ${n} zimekaguliwa`),
    latest: (date) => `Ya mwisho ${date}`,
    checksTitle: "Wanachokagua kabla nyumba haijawekwa mtandaoni",
  },
};
