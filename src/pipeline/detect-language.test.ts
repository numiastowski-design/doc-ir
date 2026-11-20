/**
 * What this file proves and what it does not. The texts below are hand-written, like the table they test: they prove
 * that the mechanism ranks and catch a gross error in a word set, never an accuracy rate on real documents.
 *
 * Hence two levels of assertion. The safety invariant, required of every language of the table: the detector returns
 * the right language or `undefined`, never another language. The resolving power, observed: the languages that are
 * decided today; the others fall under the margin rule and return `undefined`, by design.
 */

import { describe, expect, it } from "vitest";
import type { IRBlock, IRDoc } from "../lib/ir";
import {
  MIN_ALPHA_TOKENS,
  MIN_SAMPLE_CHARS,
  buildDetectionSample,
  collectProseText,
  detectLanguage,
  detectLanguageFromSample,
} from "./detect-language";

const para = (text: string): IRBlock => ({ kind: "paragraph", inlines: [{ text }] });
const doc = (...blocks: IRBlock[]): IRDoc => ({ blocks });

/** One office paragraph, the same content in each language: the register of the documents aimed at. */
const CORPUS: Readonly<Record<string, string>> = {
  en: "The quarterly report will be published on Monday and it should include all the figures that were collected from the regional teams. If there are any questions about the data, we can discuss them at the meeting, which is scheduled for the end of the week. This document is intended for internal use only and should not be shared with an external partner without approval.",
  fr: "Le rapport trimestriel sera publié lundi prochain et il devra contenir tous les chiffres qui ont été collectés auprès des équipes régionales. Si vous avez des questions sur ces données, nous pourrons en discuter pendant la réunion, qui est prévue à la fin de la semaine. Ce document est destiné à un usage interne et ne doit pas être communiqué à un partenaire extérieur sans accord.",
  es: "El informe trimestral se publicará el lunes y deberá incluir todas las cifras que se han recogido de los equipos regionales. Si tiene alguna pregunta sobre estos datos, podemos comentarlos en la reunión, que está prevista para el final de la semana. Este documento es para uso interno y no debe compartirse con un socio externo sin autorización.",
  pt: "O relatório trimestral será publicado na segunda-feira e deverá incluir todos os números que foram recolhidos junto das equipas regionais. Se tiver alguma questão sobre estes dados, podemos discuti-los na reunião, que está prevista para o final da semana. Este documento é para uso interno e não deve ser partilhado com um parceiro externo sem autorização.",
  de: "Der Quartalsbericht wird am Montag veröffentlicht und soll alle Zahlen enthalten, die von den regionalen Teams erhoben wurden. Wenn Sie Fragen zu diesen Daten haben, können wir sie in der Besprechung erörtern, die für das Ende der Woche geplant ist. Dieses Dokument ist nur für den internen Gebrauch bestimmt und darf ohne Zustimmung nicht an einen externen Partner weitergegeben werden.",
  it: "Il rapporto trimestrale sarà pubblicato lunedì e dovrà contenere tutti i dati che sono stati raccolti dalle squadre regionali. Se avete domande su questi dati, possiamo discuterne durante la riunione, che è prevista per la fine della settimana. Questo documento è destinato a un uso interno e non deve essere condiviso con un partner esterno senza autorizzazione.",
  nl: "Het kwartaalverslag wordt maandag gepubliceerd en moet alle cijfers bevatten die bij de regionale teams zijn verzameld. Als u vragen heeft over deze gegevens, kunnen we ze bespreken tijdens de vergadering, die aan het einde van de week is gepland. Dit document is alleen voor intern gebruik en mag niet worden gedeeld met een externe partner zonder toestemming.",
  pl: "Raport kwartalny zostanie opublikowany w poniedziałek i powinien zawierać wszystkie dane, które zostały zebrane od zespołów regionalnych. Jeśli mają Państwo pytania dotyczące tych danych, możemy je omówić na spotkaniu, które jest zaplanowane na koniec tygodnia. Ten dokument jest przeznaczony wyłącznie do użytku wewnętrznego i nie może być udostępniany partnerowi zewnętrznemu bez zgody.",
  cs: "Čtvrtletní zpráva bude zveřejněna v pondělí a měla by obsahovat všechny údaje, které byly shromážděny od regionálních týmů. Pokud máte k těmto údajům dotazy, můžeme je probrat na schůzce, která je naplánována na konec týdne. Tento dokument je určen pouze pro interní použití a nesmí být bez souhlasu sdílen s externím partnerem.",
  sv: "Kvartalsrapporten kommer att publiceras på måndag och den ska innehålla alla siffror som har samlats in från de regionala teamen. Om du har frågor om dessa uppgifter kan vi diskutera dem på mötet, som är planerat till slutet av veckan. Detta dokument är endast för internt bruk och får inte delas med en extern partner utan godkännande.",
  da: "Kvartalsrapporten vil blive offentliggjort på mandag, og den skal indeholde alle de tal, som er blevet indsamlet fra de regionale teams. Hvis du har spørgsmål til disse oplysninger, kan vi drøfte dem på mødet, som er planlagt til slutningen af ugen. Dette dokument er kun til intern brug og må ikke deles med en ekstern partner uden godkendelse.",
  no: "Kvartalsrapporten vil bli offentliggjort på mandag, og den skal inneholde alle tallene som er samlet inn fra de regionale teamene. Hvis du har spørsmål om disse opplysningene, kan vi diskutere dem på møtet, som er planlagt til slutten av uken. Dette dokumentet er bare til intern bruk og må ikke deles med en ekstern partner uten godkjenning.",
  fi: "Neljännesvuosiraportti julkaistaan maanantaina, ja sen on sisällettävä kaikki luvut, jotka on kerätty alueellisilta tiimeiltä. Jos sinulla on kysyttävää näistä tiedoista, voimme keskustella niistä kokouksessa, joka on suunniteltu viikon loppuun. Tämä asiakirja on vain sisäiseen käyttöön, eikä sitä saa jakaa ulkopuoliselle kumppanille ilman lupaa.",
  ro: "Raportul trimestrial va fi publicat luni și trebuie să includă toate cifrele care au fost colectate de la echipele regionale. Dacă aveți întrebări despre aceste date, le putem discuta în cadrul reuniunii, care este programată pentru sfârșitul săptămânii. Acest document este destinat exclusiv uzului intern și nu trebuie să fie transmis unui partener extern fără aprobare.",
  tr: "Üç aylık rapor pazartesi günü yayımlanacak ve bölgesel ekiplerden toplanan tüm rakamları içermesi gerekiyor. Bu veriler hakkında sorularınız varsa, haftanın sonunda yapılması planlanan toplantıda bunları görüşebiliriz. Bu belge yalnızca dahili kullanım içindir ve onay alınmadan herhangi bir dış ortakla paylaşılmamalıdır.",
  hu: "A negyedéves jelentés hétfőn jelenik meg, és tartalmaznia kell minden olyan adatot, amelyet a regionális csapatoktól gyűjtöttek össze. Ha kérdései vannak ezekkel az adatokkal kapcsolatban, megbeszélhetjük őket az értekezleten, amely a hét végére van tervezve. Ez a dokumentum kizárólag belső használatra készült, és jóváhagyás nélkül nem osztható meg külső partnerrel.",
  ru: "Квартальный отчет будет опубликован в понедельник, и он должен включать все данные, которые были собраны от региональных команд. Если у вас есть вопросы по этим данным, мы можем обсудить их на совещании, которое запланировано на конец недели. Этот документ предназначен только для внутреннего использования и не может быть передан внешнему партнеру без согласования.",
  uk: "Квартальний звіт буде опублікований у понеділок, і він має містити всі дані, які були зібрані від регіональних команд. Якщо у вас є запитання щодо цих даних, ми можемо обговорити їх на нараді, яка запланована на кінець тижня. Цей документ призначений лише для внутрішнього використання і не може бути переданий зовнішньому партнеру без погодження.",
};

describe("detectLanguage — invariant de sûreté sur toute la table", () => {
  for (const [expected, text] of Object.entries(CORPUS)) {
    it(`sur un texte ${expected}, ne rend jamais une AUTRE langue`, () => {
      const detected = detectLanguageFromSample(text);
      expect(detected === undefined || detected === expected).toBe(true);
    });
  }
});

describe("detectLanguage — écritures qui tranchent seules", () => {
  const SCRIPTS: Readonly<Record<string, string>> = {
    ja: "四半期報告書は月曜日に公開され、地域チームから収集されたすべての数値を含める必要があります。",
    ko: "분기 보고서는 월요일에 발행되며 지역 팀에서 수집한 모든 수치를 포함해야 합니다。",
    zh: "季度报告将于星期一发布，并且必须包含从各区域团队收集的所有数据。",
    el: "Η τριμηνιαία έκθεση θα δημοσιευθεί τη Δευτέρα και πρέπει να περιλαμβάνει όλα τα στοιχεία.",
    he: "הדוח הרבעוני יפורסם ביום שני ויכלול את כל הנתונים שנאספו מהצוותים האזוריים.",
    ar: "سيتم نشر التقرير الفصلي يوم الاثنين ويجب أن يتضمن جميع الأرقام التي تم جمعها من الفرق الإقليمية.",
  };

  for (const [expected, text] of Object.entries(SCRIPTS)) {
    it(`tranche ${expected} par l'écriture, sans mot-outil ni plancher de longueur`, () => {
      expect(detectLanguageFromSample(text)).toBe(expected);
    });
  }

  it("un texte japonais n'est pas classé chinois — le test kana passe avant le test han", () => {
    expect(detectLanguageFromSample("これは四半期報告書です。地域チームのデータを含みます。")).toBe("ja");
  });
});

describe("cas limites — l'abstention est le comportement voulu", () => {
  it("document quasi vide : sous le plancher de caractères ⇒ undefined", () => {
    const short = "Rapport trimestriel.";
    expect(short.length).toBeLessThan(MIN_SAMPLE_CHARS);
    expect(detectLanguageFromSample(short)).toBeUndefined();
  });

  it("document court mais au-dessus du plancher de caractères, sous celui des tokens ⇒ undefined", () => {
    // Des mots longs : beaucoup de caractères, peu de tokens.
    const sample = "Immatriculation ".repeat(15);
    expect(sample.length).toBeGreaterThan(MIN_SAMPLE_CHARS);
    expect(sample.split(/\s+/).filter(Boolean).length).toBeLessThan(MIN_ALPHA_TOKENS);
    expect(detectLanguageFromSample(sample)).toBeUndefined();
  });

  it("tableur numérique : les cellules ne sont pas échantillonnées du tout", () => {
    const sheet: IRDoc = {
      blocks: [
        {
          kind: "table",
          rows: Array.from({ length: 40 }, (_, r) => ({
            cells: [
              { blocks: [para(`Ligne ${r}`)] },
              { blocks: [para(`${r * 137}`)] },
              { blocks: [para(`${r * 42}`)] },
            ],
          })),
        },
      ],
    };
    expect(collectProseText(sheet)).toBe("");
    expect(detectLanguage(sheet)).toBeUndefined();
  });

  it("un tableur avec quelques en-têtes hors tableau reste sous les planchers ⇒ undefined", () => {
    const sheet = doc(para("Ventes régionales 2026"), {
      kind: "table",
      rows: [{ cells: [{ blocks: [para("1234")] }] }],
    });
    expect(detectLanguage(sheet)).toBeUndefined();
  });

  it("document 50/50 fr/en : la marge n'est pas atteinte ⇒ undefined, donc jamais à moitié réécrit", () => {
    const mixed = `${CORPUS["fr"]} ${CORPUS["en"]}`;
    expect(detectLanguageFromSample(mixed)).toBeUndefined();
  });

  it("jargon sans mots-outils : sous le ratio minimal ⇒ undefined", () => {
    const jargon = Array.from({ length: 60 }, (_, i) => `SKU${i}X REF${i}Y LOT${i}Z`).join(" ");
    expect(detectLanguageFromSample(jargon)).toBeUndefined();
  });

  it("une langue absente de la table n'est jamais devinée", () => {
    // Esperanto: no profile in the table.
    const eo =
      "La trimonata raporto estos publikigita lunde kaj ĝi devas enhavi ĉiujn ciferojn kiuj estis kolektitaj de la regionaj teamoj. Se vi havas demandojn pri tiuj datumoj ni povas diskuti ilin dum la kunveno kiu estas planita por la fino de la semajno.";
    expect(detectLanguageFromSample(eo)).not.toBe("en");
    expect(detectLanguageFromSample(eo)).not.toBe("fr");
  });
});

describe("échantillonnage", () => {
  it("une image n'apporte aucun texte : ni son alt, ni un texte lu (aucune image ne part en vision)", () => {
    const image: IRDoc = {
      blocks: [{ kind: "image", ref: { sha256: "x", mimeType: "image/png" }, alt: CORPUS["fr"] ?? "" }],
    };
    expect(collectProseText(image)).toBe("");
  });

  it("n'inclut PAS les cellules de tableau", () => {
    const withTable = doc(para("Introduction du document."), {
      kind: "table",
      rows: [{ cells: [{ blocks: [para("CELLULE-TEMOIN")] }] }],
    });
    expect(collectProseText(withTable)).not.toContain("CELLULE-TEMOIN");
  });

  it("descend dans les listes, sections et notes de bas de page", () => {
    const nested = doc(
      { kind: "list", ordered: false, items: [[para("ITEM-LISTE")]] },
      { kind: "section", title: "TITRE-SECTION", blocks: [para("CORPS-SECTION")] },
      { kind: "footnote", id: "1", blocks: [para("NOTE-BAS")] },
    );
    const text = collectProseText(nested);
    for (const marker of ["ITEM-LISTE", "TITRE-SECTION", "CORPS-SECTION", "NOTE-BAS"]) {
      expect(text).toContain(marker);
    }
  });

  it("un texte de schéma coupé par `breaks` donne un paragraphe par chaîne, jamais deux mots collés", () => {
    const diagram = doc({
      kind: "diagramText",
      sections: [{ inlines: [{ text: "commande" }, { text: "facture" }, { text: "client" }], breaks: [1, 2] }],
    });
    // Failure value: « commandefactureclient ».
    expect(collectProseText(diagram)).toBe("commande\nfacture\nclient");
  });

  // The same tolerant cutting as the renderer: sorted, duplicates and out-of-range cuts ignored.
  it("des `breaks` désordonnés, doublés ou hors bornes ne comptent aucun mot deux fois", () => {
    const inlines = [{ text: "a" }, { text: "b" }, { text: "c" }, { text: "d" }];
    // Valeur d'échec : « abc\n\nbcd » (coupes [0,3,1,4] prises telles quelles).
    expect(collectProseText(doc({ kind: "diagramText", sections: [{ inlines, breaks: [3, 1] }] }))).toBe("a\nbc\nd");
    expect(collectProseText(doc({ kind: "diagramText", sections: [{ inlines, breaks: [2, 2, 0, 4, 9] }] }))).toBe(
      "ab\ncd",
    );
  });

  it("un texte court est échantillonné en entier, sans découpage", () => {
    const d = doc(para("Un paragraphe court."));
    expect(buildDetectionSample(d)).toBe("Un paragraphe court.");
  });

  it("un texte long est réduit à trois fenêtres qui touchent le début, le milieu et la fin", () => {
    const long = doc(para(`DEBUT${"a".repeat(3000)}MILIEU${"b".repeat(3000)}FIN`));
    const sample = buildDetectionSample(long);
    expect(sample.length).toBeLessThan(2200);
    expect(sample.startsWith("DEBUT")).toBe(true);
    expect(sample.endsWith("FIN")).toBe(true);
  });
});

// Audit of 07/10/2026: the prose of a two-column band (`columns`, PDF reader) was left out of the language sample.
describe("collectProseText — inside a columns block", () => {
  it("🔴 takes the text of every column", () => {
    const text = collectProseText({
      blocks: [
        {
          kind: "columns",
          cells: [
            [{ kind: "paragraph", inlines: [{ text: "gauche" }] }],
            [{ kind: "paragraph", inlines: [{ text: "droite" }] }],
          ],
        },
      ],
    });
    expect(text).toContain("gauche");
    expect(text).toContain("droite");
  });
});
