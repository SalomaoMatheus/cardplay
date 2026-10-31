import cardsJson from './cards.json';
import meaningsJson from './meanings.json';
import { createSheet } from './sheet';
import { openCardDrawer } from './drawer';

// Catálogo das 78 cartas: busca por nome/palavra-chave e filtros de arcano e naipe.
// Clicar numa carta abre o significado por cima do catálogo.

interface CatalogCard {
  id: number;
  value: number;
  name_pt: string;
  name_en: string;
  path: string;
  type: string;
  suit: string | null; // naipe dos arcanos menores, como no nome do jogo ("Copas")
  searchText: string; // tudo que a busca considera, já normalizado
}

interface MeaningSearchFields {
  id: number;
  nome_site: string;
  palavras_chave: string[];
}

// Busca sem diferenciar acentos nem maiúsculas: "pentaculos" acha "Pentáculos"
function normalize (text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const meanings = new Map(
  (meaningsJson as unknown as MeaningSearchFields[]).map((meaning) => [meaning.id, meaning])
);

const catalog: CatalogCard[] = cardsJson
  .filter((card) => card.type === 'major' || card.type === 'minor')
  .map((card) => {
    const meaning = meanings.get(card.id);
    // Os nomes da wiki (Moedas, Bastões, Princesa...) também valem na busca
    const searchText = normalize([
      card.name_pt, card.name_en, meaning?.nome_site ?? '', ...(meaning?.palavras_chave ?? []),
    ].join(' '));
    return {
      ...card,
      suit: card.type === 'minor' ? card.name_pt.split(' de ').pop() ?? null : null,
      searchText,
    };
  });

const drawer = document.getElementById('catalog') as HTMLElement;
const backdrop = document.getElementById('catalog-backdrop') as HTMLElement;
const closeButton = document.getElementById('catalog-close') as HTMLButtonElement;
const openButton = document.getElementById('catalog-button') as HTMLButtonElement;
const searchInput = document.getElementById('catalog-search') as HTMLInputElement;
const arcanaFilter = document.getElementById('catalog-arcana') as HTMLElement;
const suitFilter = document.getElementById('catalog-suits') as HTMLElement;
const count = document.getElementById('catalog-count') as HTMLElement;
const grid = document.getElementById('catalog-grid') as HTMLElement;
const empty = document.getElementById('catalog-empty') as HTMLElement;
const sheet = createSheet(drawer, backdrop, closeButton);

let arcana: 'all' | 'major' | 'minor' = 'all';
let suit = 'all';

// Uma linha de botões em que só um fica marcado
function setupChoice (group: HTMLElement, onChange: (value: string) => void) {
  group.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-value]');
    if (!button) return;
    for (const option of group.querySelectorAll('button')) {
      option.setAttribute('aria-pressed', String(option === button));
    }
    onChange(button.dataset.value ?? 'all');
  });
}

function selectSuit (value: string) {
  suit = value;
  for (const option of suitFilter.querySelectorAll('button')) {
    option.setAttribute('aria-pressed', String(option.dataset.value === value));
  }
}

// Os itens são criados uma vez; filtrar só mostra ou esconde
const items = new Map<number, HTMLElement>();
for (const card of catalog) {
  const item = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'catalog-card';
  button.title = `Ver o significado de ${card.name_pt}`;
  button.addEventListener('click', () => openCardDrawer(card));

  const image = document.createElement('img');
  image.alt = '';
  image.loading = 'lazy';
  image.dataset.src = card.path; // só carrega quando o catálogo é aberto
  button.appendChild(image);

  const name = document.createElement('span');
  name.className = 'catalog-card-name';
  name.textContent = card.name_pt;
  button.appendChild(name);

  item.appendChild(button);
  grid.appendChild(item);
  items.set(card.id, item);
}

function applyFilters () {
  const words = normalize(searchInput.value).split(/\s+/).filter(Boolean);
  let visible = 0;

  for (const card of catalog) {
    const matches = (arcana === 'all' || card.type === arcana)
      && (suit === 'all' || card.suit === suit)
      && words.every((word) => card.searchText.includes(word));
    items.get(card.id)!.hidden = !matches;
    if (matches) visible++;
  }

  count.textContent = visible === 1 ? '1 carta' : `${visible} cartas`;
  empty.hidden = visible > 0;
}

setupChoice(arcanaFilter, (value) => {
  arcana = value as typeof arcana;
  // Naipe só existe nos arcanos menores
  suitFilter.hidden = arcana === 'major';
  if (arcana === 'major') selectSuit('all');
  applyFilters();
});

setupChoice(suitFilter, (value) => {
  suit = value;
  // Escolher um naipe implica arcanos menores
  if (suit !== 'all' && arcana !== 'minor') {
    arcana = 'minor';
    for (const option of arcanaFilter.querySelectorAll('button')) {
      option.setAttribute('aria-pressed', String(option.dataset.value === 'minor'));
    }
  }
  applyFilters();
});

searchInput.addEventListener('input', applyFilters);

openButton.addEventListener('click', () => {
  for (const image of grid.querySelectorAll<HTMLImageElement>('img[data-src]')) {
    image.src = image.dataset.src!;
    image.removeAttribute('data-src');
  }
  applyFilters();
  sheet.open();
});

applyFilters();
