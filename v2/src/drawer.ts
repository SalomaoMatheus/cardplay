import meaningsJson from './meanings.json';

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
  drawer.scrollTop = 0;
  drawer.classList.add('open');
  backdrop.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  closeButton.focus({ preventScroll: true });
}

function closeCardDrawer () {
  drawer.classList.remove('open');
  backdrop.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
}

// ---------- Arrastar para baixo para fechar (gaveta do celular) ----------

const sheetLayout = window.matchMedia('(max-width: 639px)');
const DISMISS_DISTANCE = 0.25; // fração da altura do drawer que fecha ao soltar
const DISMISS_SPEED = 0.6; // px/ms: um gesto rápido fecha mesmo se curto
const DRAG_SLOP = 6; // px antes de decidir que é arraste e não toque/rolagem

let touchStartY = 0;
let dragOffset = 0;
let dragging = false;
let lastMoveY = 0;
let lastMoveTime = 0;
let speed = 0;

drawer.addEventListener('touchstart', (event) => {
  if (!sheetLayout.matches || event.touches.length !== 1) return;
  touchStartY = event.touches[0].clientY;
  lastMoveY = touchStartY;
  lastMoveTime = event.timeStamp;
  speed = 0;
  dragging = false;
  dragOffset = 0;
}, { passive: true });

drawer.addEventListener('touchmove', (event) => {
  if (!sheetLayout.matches || event.touches.length !== 1) return;
  const y = event.touches[0].clientY;
  const delta = y - touchStartY;

  // Só vira arraste puxando para baixo com o conteúdo já no topo; senão é rolagem normal
  if (!dragging) {
    if (delta < DRAG_SLOP || drawer.scrollTop > 0) return;
    dragging = true;
    touchStartY = y; // começa a seguir o dedo daqui, sem pulo
    drawer.style.transition = 'none';
    backdrop.style.transition = 'none';
  }

  event.preventDefault(); // impede a rolagem/recarregar da página enquanto arrasta
  dragOffset = Math.max(0, y - touchStartY);
  drawer.style.transform = `translateY(${dragOffset}px)`;
  backdrop.style.opacity = String(1 - Math.min(dragOffset / drawer.offsetHeight, 1));

  const elapsed = event.timeStamp - lastMoveTime;
  if (elapsed > 0) speed = (y - lastMoveY) / elapsed;
  lastMoveY = y;
  lastMoveTime = event.timeStamp;
}, { passive: false });

function endDrag () {
  if (!dragging) return;
  dragging = false;

  const shouldClose = dragOffset > drawer.offsetHeight * DISMISS_DISTANCE || speed > DISMISS_SPEED;
  // Volta às transições do CSS: a partir da posição atual, desliza até fechar ou de volta ao lugar
  drawer.style.transition = '';
  drawer.style.transform = '';
  backdrop.style.transition = '';
  backdrop.style.opacity = '';
  if (shouldClose) closeCardDrawer();
}

drawer.addEventListener('touchend', endDrag);
drawer.addEventListener('touchcancel', endDrag);

closeButton.addEventListener('click', closeCardDrawer);
backdrop.addEventListener('click', closeCardDrawer);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeCardDrawer();
});

export { openCardDrawer, closeCardDrawer };
