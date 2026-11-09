import type { DesignCopy } from "./copy";

/**
 * The words only the "concierge" candidate uses. The conversation in the
 * hero is illustrative, but everything it says is true of the cards shown
 * under it: the three most recently inspected stays, newest first, with the
 * reply signed by the person who inspected the first of them.
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
    ask: "We arrive next month, two of us. Which homes has your team inspected most recently?",
    reply: (date) => `These three, newest first. I inspected the first one myself on ${date}. Each card shows who checked it and when.`,
    composer: "Ask in your own words",
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
    ask: "Nous arrivons le mois prochain, à deux. Quels logements votre équipe a-t-elle inspectés en dernier ?",
    reply: (date) => `Les voici, du plus récent au plus ancien. J’ai inspecté le premier moi-même, le ${date}. Chaque fiche indique qui l’a vérifiée et quand.`,
    composer: "Demandez avec vos mots",
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
    ask: "Tuzahagera ukwezi gutaha, turi babiri. Ni ayahe mazu itsinda ryanyu riheruka kugenzura?",
    reply: (date) => `Aya ni yo atatu, uhereye ku iheruka. Iya mbere nayigenzuye ubwanjye ku wa ${date}. Buri kimwe kigaragaza uwakigenzuye n’igihe.`,
    composer: "Baza mu magambo yawe",
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
    ask: "Tunawasili mwezi ujao, tukiwa wawili. Ni nyumba zipi timu yenu imezikagua hivi karibuni?",
    reply: (date) => `Hizi hapa tatu, kuanzia ya karibuni zaidi. Ya kwanza niliikagua mwenyewe tarehe ${date}. Kila kadi inaonyesha nani aliikagua na lini.`,
    composer: "Uliza kwa maneno yako",
    inspectorRole: "Mkaguzi",
    peopleTitle: "Waliokagua nyumba",
    peopleBody: "Kila makazi yanataja jina la aliyeyakagua. Haya ndiyo majina kwenye nyumba unazoweza kuweka nafasi leo.",
    inspected: (n) => (n === 1 ? "Nyumba 1 imekaguliwa" : `Nyumba ${n} zimekaguliwa`),
    latest: (date) => `Ya mwisho ${date}`,
    checksTitle: "Wanachokagua kabla nyumba haijawekwa mtandaoni",
  },
};
