//! Vendored Gherkin `scenario` / `scenarioOutline` keyword variants per language.
//!
//! Source: `gherkin-languages.json` from cucumber/gherkin (as bundled with the `gherkin` crate v0.16; Apache-2.0 OR MIT).
//! The full variant lists classify a keyword found in a file; the `*_canonical` fields are the keywords the `fix` command writes
//! — the primary "Scenario" / "Scenario Outline" wording per language (curated where the official list order would pick an "Example"-family alias).

/// Keyword data for one Gherkin dialect.
pub struct Dialect {
    /// Canonical `Scenario` keyword to write.
    pub scenario_canonical: &'static str,
    /// Canonical `Scenario Outline` keyword to write.
    pub outline_canonical: &'static str,
    /// All recognized `Scenario` keyword variants.
    pub scenario: &'static [&'static str],
    /// All recognized `Scenario Outline` keyword variants.
    pub scenario_outline: &'static [&'static str],
}

static DIALECTS: &[(&str, Dialect)] = &[
    (
        "af",
        Dialect {
            scenario_canonical: "Situasie",
            outline_canonical: "Situasie Uiteensetting",
            scenario: &["Voorbeeld", "Situasie"],
            scenario_outline: &["Situasie Uiteensetting"],
        },
    ),
    (
        "am",
        Dialect {
            scenario_canonical: "Սցենար",
            outline_canonical: "Սցենարի կառուցվացքը",
            scenario: &["Օրինակ", "Սցենար"],
            scenario_outline: &["Սցենարի կառուցվացքը"],
        },
    ),
    (
        "an",
        Dialect {
            scenario_canonical: "Caso",
            outline_canonical: "Esquema del caso",
            scenario: &["Eixemplo", "Caso"],
            scenario_outline: &["Esquema del caso"],
        },
    ),
    (
        "ar",
        Dialect {
            scenario_canonical: "سيناريو",
            outline_canonical: "سيناريو مخطط",
            scenario: &["مثال", "سيناريو"],
            scenario_outline: &["سيناريو مخطط"],
        },
    ),
    (
        "ast",
        Dialect {
            scenario_canonical: "Casu",
            outline_canonical: "Esbozu del casu",
            scenario: &["Exemplo", "Casu"],
            scenario_outline: &["Esbozu del casu"],
        },
    ),
    (
        "az",
        Dialect {
            scenario_canonical: "Ssenari",
            outline_canonical: "Ssenarinin strukturu",
            scenario: &["Nümunə", "Ssenari"],
            scenario_outline: &["Ssenarinin strukturu"],
        },
    ),
    (
        "bg",
        Dialect {
            scenario_canonical: "Сценарий",
            outline_canonical: "Рамка на сценарий",
            scenario: &["Пример", "Сценарий"],
            scenario_outline: &["Рамка на сценарий"],
        },
    ),
    (
        "bm",
        Dialect {
            scenario_canonical: "Senario",
            outline_canonical: "Kerangka Senario",
            scenario: &["Senario", "Situasi", "Keadaan"],
            scenario_outline: &[
                "Kerangka Senario",
                "Kerangka Situasi",
                "Kerangka Keadaan",
                "Garis Panduan Senario",
            ],
        },
    ),
    (
        "bs",
        Dialect {
            scenario_canonical: "Scenario",
            outline_canonical: "Scenariju-obris",
            scenario: &["Primjer", "Scenariju", "Scenario"],
            scenario_outline: &["Scenariju-obris", "Scenario-outline"],
        },
    ),
    (
        "ca",
        Dialect {
            scenario_canonical: "Escenari",
            outline_canonical: "Esquema de l'escenari",
            scenario: &["Exemple", "Escenari"],
            scenario_outline: &["Esquema de l'escenari"],
        },
    ),
    (
        "cs",
        Dialect {
            scenario_canonical: "Scénář",
            outline_canonical: "Náčrt Scénáře",
            scenario: &["Příklad", "Scénář"],
            scenario_outline: &["Náčrt Scénáře", "Osnova scénáře"],
        },
    ),
    (
        "cy-GB",
        Dialect {
            scenario_canonical: "Scenario",
            outline_canonical: "Scenario Amlinellol",
            scenario: &["Enghraifft", "Scenario"],
            scenario_outline: &["Scenario Amlinellol"],
        },
    ),
    (
        "da",
        Dialect {
            scenario_canonical: "Scenarie",
            outline_canonical: "Abstrakt Scenario",
            scenario: &["Eksempel", "Scenarie"],
            scenario_outline: &["Abstrakt Scenario"],
        },
    ),
    (
        "de",
        Dialect {
            scenario_canonical: "Szenario",
            outline_canonical: "Szenariogrundriss",
            scenario: &["Beispiel", "Szenario"],
            scenario_outline: &["Szenariogrundriss", "Szenarien"],
        },
    ),
    (
        "el",
        Dialect {
            scenario_canonical: "Σενάριο",
            outline_canonical: "Περιγραφή Σεναρίου",
            scenario: &["Παράδειγμα", "Σενάριο"],
            scenario_outline: &["Περιγραφή Σεναρίου", "Περίγραμμα Σεναρίου"],
        },
    ),
    (
        "em",
        Dialect {
            scenario_canonical: "📕",
            outline_canonical: "📖",
            scenario: &["🥒", "📕"],
            scenario_outline: &["📖"],
        },
    ),
    (
        "en",
        Dialect {
            scenario_canonical: "Scenario",
            outline_canonical: "Scenario Outline",
            scenario: &["Example", "Scenario"],
            scenario_outline: &["Scenario Outline", "Scenario Template"],
        },
    ),
    (
        "en-Scouse",
        Dialect {
            scenario_canonical: "The thing of it is",
            outline_canonical: "Wharrimean is",
            scenario: &["The thing of it is"],
            scenario_outline: &["Wharrimean is"],
        },
    ),
    (
        "en-au",
        Dialect {
            scenario_canonical: "Awww, look mate",
            outline_canonical: "Reckon it's like",
            scenario: &["Awww, look mate"],
            scenario_outline: &["Reckon it's like"],
        },
    ),
    (
        "en-lol",
        Dialect {
            scenario_canonical: "MISHUN",
            outline_canonical: "MISHUN SRSLY",
            scenario: &["MISHUN"],
            scenario_outline: &["MISHUN SRSLY"],
        },
    ),
    (
        "en-old",
        Dialect {
            scenario_canonical: "Swa",
            outline_canonical: "Swa hwaer swa",
            scenario: &["Swa"],
            scenario_outline: &["Swa hwaer swa", "Swa hwær swa"],
        },
    ),
    (
        "en-pirate",
        Dialect {
            scenario_canonical: "Heave to",
            outline_canonical: "Shiver me timbers",
            scenario: &["Heave to"],
            scenario_outline: &["Shiver me timbers"],
        },
    ),
    (
        "en-tx",
        Dialect {
            scenario_canonical: "All hat and no cattle",
            outline_canonical: "Serious as a snake bite",
            scenario: &["All hat and no cattle"],
            scenario_outline: &["Serious as a snake bite", "Busy as a hound in flea season"],
        },
    ),
    (
        "eo",
        Dialect {
            scenario_canonical: "Scenaro",
            outline_canonical: "Konturo de la scenaro",
            scenario: &["Ekzemplo", "Scenaro", "Kazo"],
            scenario_outline: &["Konturo de la scenaro", "Skizo", "Kazo-skizo"],
        },
    ),
    (
        "es",
        Dialect {
            scenario_canonical: "Escenario",
            outline_canonical: "Esquema del escenario",
            scenario: &["Ejemplo", "Escenario"],
            scenario_outline: &["Esquema del escenario"],
        },
    ),
    (
        "et",
        Dialect {
            scenario_canonical: "Stsenaarium",
            outline_canonical: "Raamjuhtum",
            scenario: &["Juhtum", "Stsenaarium"],
            scenario_outline: &["Raamjuhtum", "Raamstsenaarium"],
        },
    ),
    (
        "fa",
        Dialect {
            scenario_canonical: "سناریو",
            outline_canonical: "الگوی سناریو",
            scenario: &["مثال", "سناریو"],
            scenario_outline: &["الگوی سناریو"],
        },
    ),
    (
        "fi",
        Dialect {
            scenario_canonical: "Tapaus",
            outline_canonical: "Tapausaihio",
            scenario: &["Tapaus"],
            scenario_outline: &["Tapausaihio"],
        },
    ),
    (
        "fr",
        Dialect {
            scenario_canonical: "Scénario",
            outline_canonical: "Plan du scénario",
            scenario: &["Exemple", "Scénario"],
            scenario_outline: &["Plan du scénario", "Plan du Scénario"],
        },
    ),
    (
        "ga",
        Dialect {
            scenario_canonical: "Cás",
            outline_canonical: "Cás Achomair",
            scenario: &["Sampla", "Cás"],
            scenario_outline: &["Cás Achomair"],
        },
    ),
    (
        "gj",
        Dialect {
            scenario_canonical: "સ્થિતિ",
            outline_canonical: "પરિદ્દશ્ય રૂપરેખા",
            scenario: &["ઉદાહરણ", "સ્થિતિ"],
            scenario_outline: &["પરિદ્દશ્ય રૂપરેખા", "પરિદ્દશ્ય ઢાંચો"],
        },
    ),
    (
        "gl",
        Dialect {
            scenario_canonical: "Escenario",
            outline_canonical: "Esbozo do escenario",
            scenario: &["Exemplo", "Escenario"],
            scenario_outline: &["Esbozo do escenario"],
        },
    ),
    (
        "he",
        Dialect {
            scenario_canonical: "תרחיש",
            outline_canonical: "תבנית תרחיש",
            scenario: &["דוגמא", "תרחיש"],
            scenario_outline: &["תבנית תרחיש"],
        },
    ),
    (
        "hi",
        Dialect {
            scenario_canonical: "परिदृश्य",
            outline_canonical: "परिदृश्य रूपरेखा",
            scenario: &["परिदृश्य"],
            scenario_outline: &["परिदृश्य रूपरेखा"],
        },
    ),
    (
        "hr",
        Dialect {
            scenario_canonical: "Scenarij",
            outline_canonical: "Skica",
            scenario: &["Primjer", "Scenarij"],
            scenario_outline: &["Skica", "Koncept"],
        },
    ),
    (
        "ht",
        Dialect {
            scenario_canonical: "Senaryo",
            outline_canonical: "Plan senaryo",
            scenario: &["Senaryo"],
            scenario_outline: &[
                "Plan senaryo",
                "Plan Senaryo",
                "Senaryo deskripsyon",
                "Senaryo Deskripsyon",
                "Dyagram senaryo",
                "Dyagram Senaryo",
            ],
        },
    ),
    (
        "hu",
        Dialect {
            scenario_canonical: "Forgatókönyv",
            outline_canonical: "Forgatókönyv vázlat",
            scenario: &["Példa", "Forgatókönyv"],
            scenario_outline: &["Forgatókönyv vázlat"],
        },
    ),
    (
        "id",
        Dialect {
            scenario_canonical: "Skenario",
            outline_canonical: "Skenario konsep",
            scenario: &["Skenario"],
            scenario_outline: &["Skenario konsep", "Garis-Besar Skenario"],
        },
    ),
    (
        "is",
        Dialect {
            scenario_canonical: "Atburðarás",
            outline_canonical: "Lýsing Atburðarásar",
            scenario: &["Atburðarás"],
            scenario_outline: &["Lýsing Atburðarásar", "Lýsing Dæma"],
        },
    ),
    (
        "it",
        Dialect {
            scenario_canonical: "Scenario",
            outline_canonical: "Schema dello scenario",
            scenario: &["Esempio", "Scenario"],
            scenario_outline: &["Schema dello scenario"],
        },
    ),
    (
        "ja",
        Dialect {
            scenario_canonical: "シナリオ",
            outline_canonical: "シナリオアウトライン",
            scenario: &["シナリオ"],
            scenario_outline: &[
                "シナリオアウトライン",
                "シナリオテンプレート",
                "テンプレ",
                "シナリオテンプレ",
            ],
        },
    ),
    (
        "jv",
        Dialect {
            scenario_canonical: "Skenario",
            outline_canonical: "Konsep skenario",
            scenario: &["Skenario"],
            scenario_outline: &["Konsep skenario"],
        },
    ),
    (
        "ka",
        Dialect {
            scenario_canonical: "სცენარის",
            outline_canonical: "სცენარის ნიმუში",
            scenario: &["მაგალითად", "სცენარის"],
            scenario_outline: &["სცენარის ნიმუში"],
        },
    ),
    (
        "kn",
        Dialect {
            scenario_canonical: "ಕಥಾಸಾರಾಂಶ",
            outline_canonical: "ವಿವರಣೆ",
            scenario: &["ಉದಾಹರಣೆ", "ಕಥಾಸಾರಾಂಶ"],
            scenario_outline: &["ವಿವರಣೆ"],
        },
    ),
    (
        "ko",
        Dialect {
            scenario_canonical: "시나리오",
            outline_canonical: "시나리오 개요",
            scenario: &["시나리오"],
            scenario_outline: &["시나리오 개요"],
        },
    ),
    (
        "lt",
        Dialect {
            scenario_canonical: "Scenarijus",
            outline_canonical: "Scenarijaus šablonas",
            scenario: &["Pavyzdys", "Scenarijus"],
            scenario_outline: &["Scenarijaus šablonas"],
        },
    ),
    (
        "lu",
        Dialect {
            scenario_canonical: "Szenario",
            outline_canonical: "Plang vum Szenario",
            scenario: &["Beispill", "Szenario"],
            scenario_outline: &["Plang vum Szenario"],
        },
    ),
    (
        "lv",
        Dialect {
            scenario_canonical: "Scenārijs",
            outline_canonical: "Scenārijs pēc parauga",
            scenario: &["Piemērs", "Scenārijs"],
            scenario_outline: &["Scenārijs pēc parauga"],
        },
    ),
    (
        "mk-Cyrl",
        Dialect {
            scenario_canonical: "Сценарио",
            outline_canonical: "Преглед на сценарија",
            scenario: &["Пример", "Сценарио", "На пример"],
            scenario_outline: &["Преглед на сценарија", "Скица", "Концепт"],
        },
    ),
    (
        "mk-Latn",
        Dialect {
            scenario_canonical: "Na primer",
            outline_canonical: "Pregled na scenarija",
            scenario: &["Scenario", "Na primer"],
            scenario_outline: &["Pregled na scenarija", "Skica", "Koncept"],
        },
    ),
    (
        "mn",
        Dialect {
            scenario_canonical: "Сценар",
            outline_canonical: "Сценарын төлөвлөгөө",
            scenario: &["Сценар"],
            scenario_outline: &["Сценарын төлөвлөгөө"],
        },
    ),
    (
        "mr",
        Dialect {
            scenario_canonical: "परिदृश्य",
            outline_canonical: "परिदृश्य रूपरेखा",
            scenario: &["परिदृश्य"],
            scenario_outline: &["परिदृश्य रूपरेखा"],
        },
    ),
    (
        "ne",
        Dialect {
            scenario_canonical: "परिदृश्य",
            outline_canonical: "परिदृश्य रूपरेखा",
            scenario: &["परिदृश्य"],
            scenario_outline: &["परिदृश्य रूपरेखा"],
        },
    ),
    (
        "nl",
        Dialect {
            scenario_canonical: "Scenario",
            outline_canonical: "Abstract Scenario",
            scenario: &["Voorbeeld", "Scenario"],
            scenario_outline: &["Abstract Scenario"],
        },
    ),
    (
        "no",
        Dialect {
            scenario_canonical: "Scenario",
            outline_canonical: "Scenariomal",
            scenario: &["Eksempel", "Scenario"],
            scenario_outline: &["Scenariomal", "Abstrakt Scenario"],
        },
    ),
    (
        "pa",
        Dialect {
            scenario_canonical: "ਪਟਕਥਾ",
            outline_canonical: "ਪਟਕਥਾ ਢਾਂਚਾ",
            scenario: &["ਉਦਾਹਰਨ", "ਪਟਕਥਾ"],
            scenario_outline: &["ਪਟਕਥਾ ਢਾਂਚਾ", "ਪਟਕਥਾ ਰੂਪ ਰੇਖਾ"],
        },
    ),
    (
        "pl",
        Dialect {
            scenario_canonical: "Scenariusz",
            outline_canonical: "Szablon scenariusza",
            scenario: &["Przykład", "Scenariusz"],
            scenario_outline: &["Szablon scenariusza"],
        },
    ),
    (
        "pt",
        Dialect {
            scenario_canonical: "Cenário",
            outline_canonical: "Esquema do Cenário",
            scenario: &["Exemplo", "Cenário", "Cenario"],
            scenario_outline: &[
                "Esquema do Cenário",
                "Esquema do Cenario",
                "Delineação do Cenário",
                "Delineacao do Cenario",
            ],
        },
    ),
    (
        "ro",
        Dialect {
            scenario_canonical: "Scenariu",
            outline_canonical: "Structura scenariu",
            scenario: &["Exemplu", "Scenariu"],
            scenario_outline: &["Structura scenariu", "Structură scenariu"],
        },
    ),
    (
        "ru",
        Dialect {
            scenario_canonical: "Сценарий",
            outline_canonical: "Структура сценария",
            scenario: &["Пример", "Сценарий"],
            scenario_outline: &["Структура сценария", "Шаблон сценария"],
        },
    ),
    (
        "sk",
        Dialect {
            scenario_canonical: "Scenár",
            outline_canonical: "Náčrt Scenáru",
            scenario: &["Príklad", "Scenár"],
            scenario_outline: &["Náčrt Scenáru", "Náčrt Scenára", "Osnova Scenára"],
        },
    ),
    (
        "sl",
        Dialect {
            scenario_canonical: "Scenarij",
            outline_canonical: "Struktura scenarija",
            scenario: &["Primer", "Scenarij"],
            scenario_outline: &[
                "Struktura scenarija",
                "Skica",
                "Koncept",
                "Oris scenarija",
                "Osnutek",
            ],
        },
    ),
    (
        "sr-Cyrl",
        Dialect {
            scenario_canonical: "Сценарио",
            outline_canonical: "Структура сценарија",
            scenario: &["Пример", "Сценарио", "Пример"],
            scenario_outline: &["Структура сценарија", "Скица", "Концепт"],
        },
    ),
    (
        "sr-Latn",
        Dialect {
            scenario_canonical: "Primer",
            outline_canonical: "Struktura scenarija",
            scenario: &["Scenario", "Primer"],
            scenario_outline: &["Struktura scenarija", "Skica", "Koncept"],
        },
    ),
    (
        "sv",
        Dialect {
            scenario_canonical: "Scenario",
            outline_canonical: "Abstrakt Scenario",
            scenario: &["Scenario"],
            scenario_outline: &["Abstrakt Scenario", "Scenariomall"],
        },
    ),
    (
        "ta",
        Dialect {
            scenario_canonical: "காட்சி",
            outline_canonical: "காட்சி சுருக்கம்",
            scenario: &["உதாரணமாக", "காட்சி"],
            scenario_outline: &["காட்சி சுருக்கம்", "காட்சி வார்ப்புரு"],
        },
    ),
    (
        "te",
        Dialect {
            scenario_canonical: "సన్నివేశం",
            outline_canonical: "కథనం",
            scenario: &["ఉదాహరణ", "సన్నివేశం"],
            scenario_outline: &["కథనం"],
        },
    ),
    (
        "th",
        Dialect {
            scenario_canonical: "เหตุการณ์",
            outline_canonical: "สรุปเหตุการณ์",
            scenario: &["เหตุการณ์"],
            scenario_outline: &["สรุปเหตุการณ์", "โครงสร้างของเหตุการณ์"],
        },
    ),
    (
        "tlh",
        Dialect {
            scenario_canonical: "lut",
            outline_canonical: "lut chovnatlh",
            scenario: &["lut"],
            scenario_outline: &["lut chovnatlh"],
        },
    ),
    (
        "tr",
        Dialect {
            scenario_canonical: "Senaryo",
            outline_canonical: "Senaryo taslağı",
            scenario: &["Örnek", "Senaryo"],
            scenario_outline: &["Senaryo taslağı"],
        },
    ),
    (
        "tt",
        Dialect {
            scenario_canonical: "Сценарий",
            outline_canonical: "Сценарийның төзелеше",
            scenario: &["Сценарий"],
            scenario_outline: &["Сценарийның төзелеше"],
        },
    ),
    (
        "uk",
        Dialect {
            scenario_canonical: "Сценарій",
            outline_canonical: "Структура сценарію",
            scenario: &["Приклад", "Сценарій"],
            scenario_outline: &["Структура сценарію"],
        },
    ),
    (
        "ur",
        Dialect {
            scenario_canonical: "منظرنامہ",
            outline_canonical: "منظر نامے کا خاکہ",
            scenario: &["منظرنامہ"],
            scenario_outline: &["منظر نامے کا خاکہ"],
        },
    ),
    (
        "uz",
        Dialect {
            scenario_canonical: "Сценарий",
            outline_canonical: "Сценарий структураси",
            scenario: &["Сценарий"],
            scenario_outline: &["Сценарий структураси"],
        },
    ),
    (
        "vi",
        Dialect {
            scenario_canonical: "Kịch bản",
            outline_canonical: "Khung tình huống",
            scenario: &["Tình huống", "Kịch bản"],
            scenario_outline: &["Khung tình huống", "Khung kịch bản"],
        },
    ),
    (
        "zh-CN",
        Dialect {
            scenario_canonical: "剧本",
            outline_canonical: "场景大纲",
            scenario: &["场景", "剧本"],
            scenario_outline: &["场景大纲", "剧本大纲"],
        },
    ),
    (
        "zh-TW",
        Dialect {
            scenario_canonical: "劇本",
            outline_canonical: "場景大綱",
            scenario: &["場景", "劇本"],
            scenario_outline: &["場景大綱", "劇本大綱"],
        },
    ),
];

/// Keyword lists for a Gherkin language code (e.g. `"en"`, `"fr"`), exactly as written in a `# language:` directive.
pub fn dialect(lang: &str) -> Option<&'static Dialect> {
    DIALECTS
        .iter()
        .find_map(|(code, dialect)| (*code == lang).then_some(dialect))
}
