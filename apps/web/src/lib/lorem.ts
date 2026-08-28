export type LoremUnit = "paragraphs" | "sentences" | "words" | "list";

export type LoremOptions = {
  unit: LoremUnit;
  count: number;
  startWithLorem: boolean;
};

const WORDS = [
  "lorem",
  "ipsum",
  "dolor",
  "sit",
  "amet",
  "consectetur",
  "adipiscing",
  "elit",
  "sed",
  "do",
  "eiusmod",
  "tempor",
  "incididunt",
  "ut",
  "labore",
  "et",
  "dolore",
  "magna",
  "aliqua",
  "enim",
  "ad",
  "minim",
  "veniam",
  "quis",
  "nostrud",
  "exercitation",
  "ullamco",
  "laboris",
  "nisi",
  "aliquip",
  "ex",
  "ea",
  "commodo",
  "consequat",
  "duis",
  "aute",
  "irure",
  "in",
  "reprehenderit",
  "voluptate",
  "velit",
  "esse",
  "cillum",
  "fugiat",
  "nulla",
  "pariatur",
  "excepteur",
  "sint",
  "occaecat",
  "cupidatat",
  "non",
  "proident",
  "sunt",
  "culpa",
  "qui",
  "officia",
  "deserunt",
  "mollit",
  "anim",
  "id",
  "est",
  "laborum",
  "at",
  "vero",
  "eos",
  "accusamus",
  "accusantium",
  "doloremque",
  "laudantium",
  "totam",
  "rem",
  "aperiam",
  "eaque",
  "ipsa",
  "quae",
  "ab",
  "illo",
  "inventore",
  "veritatis",
  "quasi",
  "architecto",
  "beatae",
  "vitae",
  "dicta",
  "explicabo",
  "nemo",
  "ipsam",
  "voluptatem",
  "quia",
  "voluptas",
  "aspernatur",
  "odit",
  "fugit",
  "sed",
  "quia",
  "consequuntur",
  "magni",
  "dolores",
  "ratione",
  "sequi",
  "nesciunt",
  "neque",
  "porro",
  "quisquam",
  "dolorem",
  "adipisci",
  "numquam",
  "eius",
  "modi",
  "tempora",
  "incidunt",
  "magnam",
  "aliquam",
  "quaerat",
  "voluptatem",
  "ut",
  "enim",
  "minima",
  "veniam",
  "nostrum",
  "exercitationem",
  "ullam",
  "corporis",
  "suscipit",
  "laboriosam",
  "nisi",
  "aliquid",
  "commodi",
  "consequatur",
  "perspiciatis",
  "unde",
  "omnis",
  "iste",
  "natus",
  "error",
  "voluptatum",
  "tenetur",
  "a",
  "sapiente",
  "delectus",
  "aut",
  "reiciendis",
  "facilis",
  "harum",
  "rerum",
  "necessitatibus",
  "saepe",
  "eveniet",
  "recusandae",
  "itaque",
  "earum",
  "hic",
  "tenetur",
  "sapiente",
  "delectus",
  "reiciendis",
  "voluptatibus",
  "maiores",
  "alias",
  "perferendis",
  "doloribus",
  "asperiores",
  "repellat",
] as const;

const OPENING =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickWord(): string {
  return WORDS[randomInt(0, WORDS.length - 1)]!;
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function generateSentence(minWords = 8, maxWords = 18): string {
  const length = randomInt(minWords, maxWords);
  const words: string[] = [];

  for (let i = 0; i < length; i += 1) {
    words.push(pickWord());
  }

  words[0] = capitalize(words[0]!);

  if (length > 6 && Math.random() > 0.55) {
    const commaAt = randomInt(3, length - 3);
    words[commaAt] = `${words[commaAt]},`;
  }

  const ending = Math.random() > 0.12 ? "." : "?";
  return `${words.join(" ")}${ending}`;
}

function generateParagraph(sentenceCount: number, useOpening: boolean): string {
  if (useOpening) {
    const rest = Array.from({ length: Math.max(0, sentenceCount - 1) }, () =>
      generateSentence(),
    );
    return [OPENING, ...rest].join(" ");
  }

  return Array.from({ length: sentenceCount }, () => generateSentence()).join(" ");
}

function generateWords(count: number, startWithLorem: boolean): string {
  if (startWithLorem && count >= 5) {
    const prefix = "lorem ipsum dolor sit amet";
    const rest = Array.from({ length: count - 5 }, () => pickWord());
    return [prefix, ...rest].join(" ");
  }

  return Array.from({ length: count }, () => pickWord()).join(" ");
}

function generateList(count: number): string {
  return Array.from({ length: count }, () => `- ${generateSentence(4, 10)}`).join("\n");
}

export function clampLoremCount(unit: LoremUnit, count: number): number {
  const limits: Record<LoremUnit, { min: number; max: number }> = {
    paragraphs: { min: 1, max: 20 },
    sentences: { min: 1, max: 50 },
    words: { min: 1, max: 500 },
    list: { min: 1, max: 30 },
  };

  const { min, max } = limits[unit];
  return Math.min(max, Math.max(min, Math.round(count)));
}

export function generateLorem(options: LoremOptions): string {
  const count = clampLoremCount(options.unit, options.count);

  switch (options.unit) {
    case "paragraphs":
      return Array.from({ length: count }, (_, index) =>
        generateParagraph(randomInt(4, 7), options.startWithLorem && index === 0),
      ).join("\n\n");
    case "sentences":
      if (options.startWithLorem && count > 0) {
        const rest = Array.from({ length: count - 1 }, () => generateSentence());
        return [OPENING, ...rest].join(" ");
      }
      return Array.from({ length: count }, () => generateSentence()).join(" ");
    case "words":
      return generateWords(count, options.startWithLorem);
    case "list":
      return generateList(count);
    default:
      return "";
  }
}

export function countLoremStats(text: string): { words: number; characters: number; lines: number } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { words: 0, characters: 0, lines: 0 };
  }

  return {
    words: trimmed.split(/\s+/).length,
    characters: text.length,
    lines: text.split("\n").length,
  };
}
