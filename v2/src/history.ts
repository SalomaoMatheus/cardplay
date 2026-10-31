import cardsJson from './cards.json';
import { createSheet } from './sheet';
import { openCardDrawer } from './drawer';

// Histórico das tiragens, guardado só neste navegador (localStorage); nada sai do aparelho.
// Uma leitura começa num botão de tiragem (ou na primeira carta comprada avulsa) e termina
// quando as cartas voltam para o deck. Cada carta entra no histórico ao ser revelada.

interface HistoryCard {
  id: number;
  position: number; // ordem em que saiu do deck: mantém Passado/Presente/Futuro no lugar
  label?: string;
}

interface Reading {
  id: string;
  spread: string;
  startedAt: number;
  cards: HistoryCard[];
}

const STORAGE_KEY = 'cardplay:history';
const MAX_READINGS = 50;

const SPREAD_NAMES: Record<string, string> = {
  free: 'Tiragem livre',
  oneCard: '1 Carta Aleatória',
  threeRandom: '3 Cartas Aleatórias',
  threeCards: 'Passado · Presente · Futuro',
  majorMinor: 'Arcano Maior e Menor',
};

const cards = new Map(cardsJson.map((card) => [card.id, card]));

const drawer = document.getElementById('history') as HTMLElement;
const backdrop = document.getElementById('history-backdrop') as HTMLElement;
const closeButton = document.getElementById('history-close') as HTMLButtonElement;
const openButton = document.getElementById('history-button') as HTMLButtonElement;
const list = document.getElementById('history-list') as HTMLElement;
const empty = document.getElementById('history-empty') as HTMLElement;
const clearButton = document.getElementById('history-clear') as HTMLButtonElement;
const sheet = createSheet(drawer, backdrop, closeButton);

// ---------- Armazenamento ----------

// O localStorage pode ter sido editado à mão ou vir de outra versão: só aceita o que tem o formato certo
function isReading (value: unknown): value is Reading {
  const reading = value as Reading;
  return typeof reading === 'object' && reading !== null
    && typeof reading.id === 'string'
    && typeof reading.spread === 'string'
    && typeof reading.startedAt === 'number'
    && Array.isArray(reading.cards)
    && reading.cards.every((card) => typeof card === 'object' && card !== null
      && typeof card.id === 'number' && typeof card.position === 'number');
}

function loadReadings (): Reading[] {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter(isReading) : [];
  } catch {
    return [];
  }
}

function saveReadings (readings: Reading[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readings.slice(0, MAX_READINGS)));
  } catch {
    // Navegação privada ou cota cheia: o histórico simplesmente não é guardado
  }
}

// ---------- Leitura em andamento ----------

let current: { id: string, spread: string, startedAt: number } | null = null;

function beginReading (spread: string) {
  current = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    spread,
    startedAt: Date.now(),
  };
}

function endReading () {
  current = null;
}

// Relê o armazenamento a cada gravação, para não apagar o que outra aba gravou
function recordCard (id: number, position: number, label?: string) {
  if (!current) beginReading('free');
  const { id: readingId, spread, startedAt } = current!;

  const readings = loadReadings();
  let reading = readings.find((r) => r.id === readingId);
  if (!reading) {
    reading = { id: readingId, spread, startedAt, cards: [] };
    readings.unshift(reading);
  }
  reading.cards.push(label ? { id, position, label } : { id, position });
  saveReadings(readings);

  if (sheet.isOpen()) render();
}

// ---------- Tela ----------

function formatDate (timestamp: number) {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return `Hoje · ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Ontem · ${time}`;
  return `${date.toLocaleDateString('pt-BR')} · ${time}`;
}

function renderCard (entry: HistoryCard) {
  const card = cards.get(entry.id);
  if (!card) return null;

  const item = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'history-card';
  button.title = `Ver o significado de ${card.name_pt}`;
  button.addEventListener('click', () => openCardDrawer(card));

  const image = document.createElement('img');
  image.src = card.path;
  image.alt = '';
  image.loading = 'lazy';
  button.appendChild(image);

  if (entry.label) {
    const label = document.createElement('span');
    label.className = 'history-card-label';
    label.textContent = entry.label;
    button.appendChild(label);
  }

  const name = document.createElement('span');
  name.className = 'history-card-name';
  name.textContent = card.name_pt;
  button.appendChild(name);

  item.appendChild(button);
  return item;
}

function render () {
  const readings = loadReadings();

  list.replaceChildren(...readings.map((reading) => {
    const item = document.createElement('li');
    item.className = 'reading';

    const head = document.createElement('div');
    head.className = 'reading-head';
    const name = document.createElement('span');
    name.className = 'reading-name';
    name.textContent = SPREAD_NAMES[reading.spread] ?? reading.spread;
    const time = document.createElement('time');
    time.dateTime = new Date(reading.startedAt).toISOString();
    time.textContent = formatDate(reading.startedAt);
    head.append(name, time);

    const cardList = document.createElement('ul');
    cardList.className = 'reading-cards';
    const sorted = [...reading.cards].sort((a, b) => a.position - b.position);
    for (const entry of sorted) {
      const card = renderCard(entry);
      if (card) cardList.appendChild(card);
    }

    item.append(head, cardList);
    return item;
  }));

  empty.hidden = readings.length > 0;
  clearButton.hidden = readings.length === 0;
  disarmClear();
}

// ---------- Apagar (dois toques: o primeiro pede confirmação) ----------

const CLEAR_LABEL = 'Apagar histórico';
const CONFIRM_LABEL = 'Toque de novo para apagar';
const CONFIRM_TIMEOUT = 4000;
let confirmTimer = 0;

function disarmClear () {
  window.clearTimeout(confirmTimer);
  clearButton.classList.remove('armed');
  clearButton.textContent = CLEAR_LABEL;
}

clearButton.addEventListener('click', () => {
  if (!clearButton.classList.contains('armed')) {
    clearButton.classList.add('armed');
    clearButton.textContent = CONFIRM_LABEL;
    confirmTimer = window.setTimeout(disarmClear, CONFIRM_TIMEOUT);
    return;
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // sem acesso ao armazenamento: não há o que apagar
  }
  render();
});

openButton.addEventListener('click', () => {
  render();
  sheet.open();
});

// Outra aba mexeu no histórico
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY && sheet.isOpen()) render();
});

export { beginReading, endReading, recordCard };
