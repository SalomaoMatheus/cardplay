import meaningsJson from './meanings.json';
import { createSheet } from './sheet';

// Significados resumidos da wiki do Del Debbio (ver scripts de coleta); um registro por carta
interface Meaning {
  id: number;
  nome_site: string;
  url: string;
  palavras_chave: string[];
  resumo: string;
  sentido_direto: string;
  sentido_invertido: string | null;
  correspondencias: string[];
  erro?: string;
}

interface DrawerCard {
  id: number;
  value: number;
  name_pt: string;
  path: string;
  type: string;
}

const meanings = new Map<number, Meaning>(
  (meaningsJson as unknown as Meaning[]).map((meaning) => [meaning.id, meaning])
);

const drawer = document.getElementById('drawer') as HTMLElement;
const backdrop = document.getElementById('drawer-backdrop') as HTMLElement;
const closeButton = document.getElementById('drawer-close') as HTMLButtonElement;
const image = document.getElementById('drawer-image') as HTMLImageElement;
const title = document.getElementById('drawer-title') as HTMLElement;
const subtitle = document.getElementById('drawer-subtitle') as HTMLElement;
const keywords = document.getElementById('drawer-keywords') as HTMLElement;
const body = document.getElementById('drawer-body') as HTMLElement;
const source = document.getElementById('drawer-source') as HTMLAnchorElement;
const sheet = createSheet(drawer, backdrop, closeButton);

function toRoman (value: number) {
  if (value === 0) return '0';
  const numerals: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let rest = value;
  let roman = '';
  for (const [amount, numeral] of numerals) {
    while (rest >= amount) {
      roman += numeral;
      rest -= amount;
    }
  }
  return roman;
}

// O texto vem de fora: sempre via textContent, nunca innerHTML
function addSection (heading: string, content: string | string[]) {
  const section = document.createElement('section');
  const h3 = document.createElement('h3');
  h3.textContent = heading;
  section.appendChild(h3);

  if (Array.isArray(content)) {
    const list = document.createElement('ul');
    for (const item of content) {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    }
    section.appendChild(list);
  } else {
    const paragraph = document.createElement('p');
    paragraph.textContent = content;
    section.appendChild(paragraph);
  }
  body.appendChild(section);
}

function openCardDrawer (card: DrawerCard) {
  const meaning = meanings.get(card.id);

  image.src = card.path;
  image.alt = card.name_pt;
  title.textContent = card.name_pt;
  subtitle.textContent = card.type === 'major'
    ? `Arcano Maior · ${toRoman(card.value)}`
    : `Arcano Menor · ${card.name_pt.split(' de ').pop()}`;

  keywords.replaceChildren(...(meaning?.palavras_chave ?? []).map((keyword) => {
    const chip = document.createElement('li');
    chip.textContent = keyword;
    return chip;
  }));

  body.replaceChildren();
  if (meaning && meaning.resumo) {
    addSection('Significado', meaning.resumo);
    if (meaning.sentido_direto) addSection('Sentido direto', meaning.sentido_direto);
    if (meaning.sentido_invertido) addSection('Sentido invertido', meaning.sentido_invertido);
    if (meaning.correspondencias.length > 0) addSection('Correspondências', meaning.correspondencias);
  } else {
    addSection('Significado', 'O significado desta carta ainda não está disponível.');
  }

  source.hidden = !meaning?.url;
  source.href = meaning?.url ?? '#';

  body.scrollTop = 0;
  sheet.open();
}

function closeCardDrawer () {
  sheet.close();
}

export { openCardDrawer, closeCardDrawer };
