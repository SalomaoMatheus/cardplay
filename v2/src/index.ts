import { Application, BlurFilter, Container, FederatedPointerEvent, Graphics, Text } from 'pixi.js';
import { cardWidth, cardHeight, createCardFace, createDeckSprite, createCardSprite, createCardShadow, createSigil, drawTable, createNameText, createDeckCountText, createSlotLabel } from './pixiObjs';
import { tween, wait, summonEffect, landEffect, easeInOutCubic, easeOutCubic, lerp } from './effects';
import { openCardDrawer } from './drawer';
import { beginReading, endReading, recordCard } from './history';
import cardsJson from './cards.json';

interface Card {
  id: number;
  value: number;
  name_pt: string;
  name_en: string;
  path: string;
  type: string;
}

const CARD_BACK_ID = 777;
const TABLE_MARGIN = 32; // espaço entre a mesa e a borda da tela
const TABLE_MARGIN_MOBILE = 10;
const MOBILE_BREAKPOINT = 640; // largura da janela abaixo da qual o layout é de celular
const TABLE_MAX_WIDTH = 1100;
const TABLE_MAX_HEIGHT = 720;
// Tamanho mínimo "virtual" da mesa: abaixo disso a mesa inteira é reduzida em escala,
// assim cartas, tiragens e textos mantêm as proporções em telas pequenas
const TABLE_MIN_WIDTH = 480;
const TABLE_MIN_HEIGHT = 560;
const TABLE_PADDING = 24; // as cartas não encostam na borda da mesa
const FLIGHT_DURATION = 850; // ms da carta voando do deck até a mesa
const FLIGHT_HEIGHT = 90; // quanto a carta sobe no meio do voo
const NAME_HEIGHT = 56; // espaço reservado para o nome abaixo da carta
const RETURN_DURATION = 600; // ms da carta voltando para o deck
const DEAL_STAGGER = 220; // ms entre cada carta de uma tiragem
const REVEAL_DURATION = 450; // ms da carta virando na mesa
const SHUFFLE_CARDS = 10; // cartas do maço na animação de embaralhar
const SHUFFLE_PASSES = 3; // quantas vezes o maço é cortado e intercalado
const DRAG_THRESHOLD = 8; // px que o ponteiro anda antes de virar arraste (abaixo disso é clique)
const cards: Card[] = cardsJson;

// Embaralhamento Fisher-Yates (uniforme, ao contrário de sort com Math.random)
function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

let randomDeckCardsNumbersArray = shuffle(
  cards.filter((card) => card.id !== CARD_BACK_ID).map((card) => card.id)
);

const app = new Application({
	view: document.getElementById("pixi-canvas") as HTMLCanvasElement,
	// Acima de 2x o ganho de nitidez é mínimo e o custo em celulares (telas 3x) é alto
	resolution: Math.min(window.devicePixelRatio || 1, 2),
	autoDensity: true,
	resizeTo: window,
	backgroundColor: 0x000000,
});

// A mesa: região central demarcada; deck e cartas vivem dentro dela, em coordenadas locais.
// Camadas, de baixo para cima: fundo, selo decorativo, efeitos no chão, cartas, efeitos no ar.
const table = new Container();
const tableBackground = new Graphics();
const tableSigil = new Container();
const slotLabels = new Container();
const effectsBelow = new Container();
const cardsLayer = new Container();
const effectsAbove = new Container();
table.addChild(tableBackground, tableSigil, slotLabels, effectsBelow, cardsLayer, effectsAbove);
// Só as cartas e o deck recebem cliques. Como o stage é interativo, o Pixi testaria também
// os efeitos — e o brilho da invocação, por cima da carta, "roubaria" o clique dela
for (const layer of [tableBackground, tableSigil, slotLabels, effectsBelow, effectsAbove]) {
  layer.interactiveChildren = false;
}
app.stage.addChild(table);

let tableWidth = 0;
let tableHeight = 0;

const toolbar = document.getElementById('toolbar') as HTMLElement;
const spreadButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-spread]'));
const resetButton = document.getElementById('reset') as HTMLButtonElement;
const cornerButtons = document.getElementById('corner') as HTMLElement;

function layoutTable() {
  const margin = window.innerWidth < MOBILE_BREAKPOINT ? TABLE_MARGIN_MOBILE : TABLE_MARGIN;

  // A mesa fica abaixo da barra de tiragens e dos botões do canto (histórico e reset)
  const top = Math.max(toolbar.offsetHeight, cornerButtons.offsetTop + cornerButtons.offsetHeight + 8, margin);
  const availableWidth = window.innerWidth - margin * 2;
  const availableHeight = window.innerHeight - top - margin;

  // Em telas pequenas a mesa é desenhada no tamanho mínimo e reduzida; as coordenadas
  // da mesa (tableWidth/tableHeight) continuam "virtuais", sem escala
  const scale = Math.min(1, availableWidth / TABLE_MIN_WIDTH, availableHeight / TABLE_MIN_HEIGHT);
  const portrait = availableHeight > availableWidth;
  tableWidth = Math.min(availableWidth / scale, TABLE_MAX_WIDTH);
  // Em pé (celular), a mesa usa toda a altura disponível
  tableHeight = Math.min(availableHeight / scale, portrait ? Infinity : TABLE_MAX_HEIGHT);

  table.scale.set(scale);
  table.x = (window.innerWidth - tableWidth * scale) / 2;
  table.y = top + (availableHeight - tableHeight * scale) / 2;
  drawTable(tableBackground, tableWidth, tableHeight);

  // Selo bem apagado no centro da mesa
  tableSigil.removeChildren().forEach((child) => child.destroy());
  const sigil = createSigil(Math.min(tableWidth, tableHeight) * 0.34, undefined, 1.2);
  sigil.alpha = 0.09;
  sigil.position.set(tableWidth / 2, tableHeight / 2);
  tableSigil.addChild(sigil);

  // Se a mesa encolheu, puxa de volta o que ficou para fora
  for (const child of cardsLayer.children) {
    clampToTable(child as Container);
  }
}

function clampToTable(obj: Container) {
  const bounds = obj.getLocalBounds();
  const minX = TABLE_PADDING - bounds.x;
  const maxX = tableWidth - TABLE_PADDING - (bounds.x + bounds.width);
  const minY = TABLE_PADDING - bounds.y;
  const maxY = tableHeight - TABLE_PADDING - (bounds.y + bounds.height);
  obj.x = Math.min(Math.max(obj.x, minX), maxX);
  obj.y = Math.min(Math.max(obj.y, minY), maxY);
}

window.addEventListener('resize', layoutTable);
layoutTable();

// O stage recebe os eventos de movimento para o drag não "soltar" quando o ponteiro sai da carta
app.stage.interactive = true;
app.stage.hitArea = app.screen;
app.stage.on('pointermove', onDragMove);
app.stage.on('pointerup', onDragEnd);
app.stage.on('pointerupoutside', onDragEnd);

const backTexture = cards.find((card: Card) => card.id === CARD_BACK_ID)?.path ?? '';
const deckPosition = { x: TABLE_PADDING, y: TABLE_PADDING };

// Uma carta na mesa e o estado dela
interface TableCard {
  data: Card;
  card: Container;
  flipper: Container;
  front: Container;
  back: Container;
  name: Text | null;
  revealed: boolean;
  moving: boolean;
  position: number; // ordem na leitura, para o histórico
  label?: string;
}

let tableCards: TableCard[] = [];

// Quantas cartas a leitura em andamento já tirou do deck; null quando a mesa está vazia
let readingSize: number | null = null;

let deck: Container | null = null;
let deckAura: Graphics | null = null;
let deckCount: Text | null = null;

// Quantas animações "bloqueantes" estão rodando (compra, tiragem, revelação, reset).
// Enquanto houver alguma, o deck e os botões ficam travados.
let pendingActions = 0;
const isBusy = () => pendingActions > 0;

async function runLocked (action: () => Promise<void>) {
  if (isBusy()) return;
  await trackAction(action);
}

// Conta a animação como bloqueante (trava deck e botões) mas roda mesmo se outra estiver rodando
async function trackAction (action: () => Promise<void>) {
  pendingActions++;
  refreshControls();
  try {
    await action();
  } finally {
    pendingActions--;
    refreshControls();
  }
}

function refreshControls () {
  const busy = isBusy();
  if (deck) deck.cursor = busy ? 'default' : 'pointer';
  spreadButtons.forEach((button) => { button.disabled = busy; });
  resetButton.disabled = busy || tableCards.length === 0;
}

function createDeck() {
  const { deck: Deck, aura } = createDeckSprite(backTexture);
  const Count = createDeckCountText();
  Deck.addChild(Count);
  Deck.position.set(deckPosition.x, deckPosition.y);
  Deck.interactive = true;
  Deck.on('pointerdown', () => runLocked(drawFromDeck));
  cardsLayer.addChild(Deck);

  deck = Deck;
  deckAura = aura;
  deckCount = Count;
  updateDeckCount();
}

function updateDeckCount () {
  if (!deckCount) return;
  const remaining = randomDeckCardsNumbersArray.length;
  deckCount.text = remaining === 1 ? '1 carta' : `${remaining} cartas`;
}

// Tira do deck a primeira carta que satisfaz o filtro
function takeFromDeck (filter: (card: Card) => boolean = () => true) {
  const index = randomDeckCardsNumbersArray.findIndex((id) => {
    const card = cards.find((c) => c.id === id);
    return card !== undefined && filter(card);
  });
  if (index === -1) return undefined;
  const [id] = randomDeckCardsNumbersArray.splice(index, 1);
  updateDeckCount();
  return cards.find((card) => card.id === id);
}

// Área livre para as cartas. Com a mesa em pé (celular) o deck ocupa o topo,
// então as tiragens ficam centralizadas no espaço abaixo dele
function playArea () {
  const portrait = tableHeight > tableWidth * 1.1;
  const top = portrait ? deckPosition.y + cardHeight + 44 : 0;
  return { top, height: tableHeight - top };
}

// Ponto de pouso perto do centro da mesa, com um pouco de acaso para as cartas não caírem empilhadas
function pickLandingSpot () {
  const minX = TABLE_PADDING + 8;
  const maxX = tableWidth - TABLE_PADDING - cardWidth - 8;
  const area = playArea();
  const minY = Math.max(TABLE_PADDING + 8, area.top);
  const maxY = tableHeight - TABLE_PADDING - cardHeight - NAME_HEIGHT;
  const x = (tableWidth - cardWidth) / 2 + (Math.random() - 0.5) * tableWidth * 0.35;
  const y = area.top + (area.height - cardHeight - NAME_HEIGHT) / 2 + (Math.random() - 0.5) * area.height * 0.25;
  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, minY), maxY),
  };
}

// Voo em arco com sombra na mesa. Se a carta estiver revelada, ela vira de costas no ar.
async function flyCard (tableCard: TableCard, to: { x: number, y: number }, duration: number) {
  const { card, flipper, front, back } = tableCard;
  tableCard.moving = true;
  card.interactive = false;
  cardsLayer.addChild(card);

  const shadow = createCardShadow();
  shadow.filters = [new BlurFilter(6)];
  card.addChildAt(shadow, 0);

  const from = { x: card.x, y: card.y };
  const turnDown = tableCard.revealed;
  const direction = to.x > from.x ? 1 : -1;

  await tween(app.ticker, duration, (t) => {
    const lift = Math.sin(Math.PI * t);
    card.x = lerp(from.x, to.x, t);
    card.y = lerp(from.y, to.y, t) - FLIGHT_HEIGHT * lift;

    let scaleX = 1;
    if (turnDown) {
      const flip = Math.cos(Math.PI * t);
      front.visible = flip > 0;
      back.visible = !front.visible;
      scaleX = Math.max(Math.abs(flip), 0.02);
    }
    const size = 1 + 0.25 * lift;
    flipper.scale.set(scaleX * size, size);
    flipper.rotation = 0.2 * lift * direction;

    // A sombra fica na mesa: desce o quanto a carta subiu e se espalha
    shadow.y = cardHeight / 2 + FLIGHT_HEIGHT * lift + 10 * lift;
    shadow.scale.set(1 + 0.15 * lift);
    shadow.alpha = 1 - 0.5 * lift;
  }, easeInOutCubic);

  shadow.destroy();
  flipper.scale.set(1);
  flipper.rotation = 0;
  if (turnDown) tableCard.revealed = false;
  tableCard.moving = false;
}

// Tira a carta do deck, voa virada para baixo até `to` e fica esperando o clique para revelar
async function dealCard (data: Card, to: { x: number, y: number }, position: number, label?: string) {
  const { card, flipper, front, back } = createCardSprite(data.path, backTexture);
  card.position.set(deckPosition.x, deckPosition.y);
  const tableCard: TableCard = { data, card, flipper, front, back, name: null, revealed: false, moving: false, position, label };
  card.on('pointerdown', (e: FederatedPointerEvent) => onDragStart(e, tableCard));
  tableCards.push(tableCard);
  refreshControls();

  // Última carta: o deck se apaga enquanto ela voa
  if (randomDeckCardsNumbersArray.length === 0 && deck) {
    const emptyDeck = deck;
    tween(app.ticker, FLIGHT_DURATION, (t) => { emptyDeck.alpha = 1 - t; }).then(() => {
      emptyDeck.visible = false;
      emptyDeck.alpha = 1;
    });
  }

  await flyCard(tableCard, to, FLIGHT_DURATION);
  landEffect(app.ticker, effectsBelow, card.x, card.y);
  card.interactive = true;
  card.cursor = 'pointer';
}

// Vira a carta na mesa e dispara a invocação
async function revealCard (tableCard: TableCard) {
  if (tableCard.revealed || tableCard.moving) return;
  const { card, flipper, front, back, data } = tableCard;
  tableCard.moving = true;
  cardsLayer.addChild(card);

  await tween(app.ticker, REVEAL_DURATION, (t) => {
    const flip = Math.cos(Math.PI * t);
    front.visible = flip < 0;
    back.visible = !front.visible;
    const size = 1 + 0.15 * Math.sin(Math.PI * t);
    flipper.scale.set(Math.max(Math.abs(flip), 0.02) * size, size);
  }, easeInOutCubic);
  flipper.scale.set(1);

  tableCard.revealed = true;
  tableCard.moving = false;
  card.cursor = 'grab';
  recordCard(data.id, tableCard.position, tableCard.label);

  summonEffect(app.ticker, effectsBelow, effectsAbove, card.x, card.y);

  const name = createNameText(data.name_pt);
  name.alpha = 0;
  card.addChild(name);
  tableCard.name = name;
  tween(app.ticker, 500, (t) => { name.alpha = t; });
  clampToTable(card);
}

async function drawFromDeck () {
  const data = takeFromDeck();
  if (!data) return;
  // Carta avulsa com a mesa vazia abre uma tiragem livre; com uma tiragem na mesa, entra nela
  if (readingSize === null) {
    beginReading('free');
    readingSize = 0;
  }
  await dealCard(data, pickLandingSpot(), readingSize++);
}

// Embaralhar: o maço se divide em dois, a metade de cima vai para o lado e as cartas
// caem intercaladas de volta no deck, algumas vezes seguidas
async function shuffleDeckAnimation () {
  if (!deck || !deck.visible) return;

  const pile = new Container();
  pile.position.set(deckPosition.x, deckPosition.y);
  cardsLayer.addChild(pile);

  const stackY = (index: number) => cardHeight / 2 - index * 0.8;
  let sheets = Array.from({ length: SHUFFLE_CARDS }, (_, i) => {
    const sheet = new Container();
    sheet.addChild(createCardFace(backTexture));
    sheet.pivot.set(cardWidth / 2, cardHeight / 2);
    sheet.position.set(cardWidth / 2, stackY(i));
    pile.addChild(sheet);
    return sheet;
  });

  for (let pass = 0; pass < SHUFFLE_PASSES; pass++) {
    const bottom = sheets.slice(0, SHUFFLE_CARDS / 2);
    const top = sheets.slice(SHUFFLE_CARDS / 2);

    // Corte: a metade de cima sobe e vai para a direita, a de baixo inclina para o outro lado
    const cutStart = sheets.map((sheet) => ({ x: sheet.x, y: sheet.y }));
    await tween(app.ticker, 260, (t) => {
      sheets.forEach((sheet, i) => {
        const isTop = i >= SHUFFLE_CARDS / 2;
        sheet.x = cutStart[i].x + (isTop ? cardWidth * 0.8 : -4) * t;
        sheet.y = cutStart[i].y - (isTop ? 18 : 0) * t;
        sheet.rotation = (isTop ? 0.14 : -0.08) * t;
        sheet.scale.set(1 + (isTop ? 0.05 : 0) * t);
      });
    }, easeOutCubic);

    // Intercala: as cartas caem alternando entre as duas metades
    const riffled = bottom.flatMap((sheet, i) => [sheet, top[i]]);
    await Promise.all(riffled.map(async (sheet, i) => {
      await wait(app.ticker, i * 28);
      pile.addChild(sheet); // a que cai depois fica por cima
      const from = { x: sheet.x, y: sheet.y, rotation: sheet.rotation, scale: sheet.scale.x };
      await tween(app.ticker, 170, (t) => {
        sheet.x = lerp(from.x, cardWidth / 2, t);
        sheet.y = lerp(from.y, stackY(i), t);
        sheet.rotation = lerp(from.rotation, 0, t);
        sheet.scale.set(lerp(from.scale, 1, t));
      }, easeInOutCubic);
    }));
    sheets = riffled;
  }

  // Bate o maço na mesa para acertar
  await tween(app.ticker, 160, (t) => { pile.scale.set(1, 1 - 0.04 * Math.sin(Math.PI * t)); });
  pile.destroy({ children: true });
}

// Todas as cartas da mesa voltam para o deck, que é embaralhado de novo
async function returnAllToDeck () {
  clearSlotLabels();
  endReading();
  readingSize = null;
  if (tableCards.length === 0) return;

  if (deck) deck.visible = true;
  const returning = [...tableCards].reverse(); // a de cima volta primeiro
  tableCards = [];

  await Promise.all(returning.map(async (tableCard, i) => {
    tableCard.name?.destroy();
    tableCard.name = null;
    await wait(app.ticker, i * 60);
    await flyCard(tableCard, deckPosition, RETURN_DURATION);
    tableCard.card.destroy({ children: true });
    randomDeckCardsNumbersArray.push(tableCard.data.id);
    updateDeckCount();
  }));

  randomDeckCardsNumbersArray = shuffle(randomDeckCardsNumbersArray);
}

// ---------- Tiragens automáticas ----------

interface Slot {
  x: number;
  y: number;
  label?: string;
  labelSide?: 'top' | 'left';
  filter?: (card: Card) => boolean;
}

// Três cartas lado a lado no centro da mesa, com rótulos opcionais acima
function threeInARow (labels?: string[]): Slot[] {
  const gap = Math.min(56, (tableWidth - TABLE_PADDING * 2 - cardWidth * 3) / 2);
  const startX = (tableWidth - (cardWidth * 3 + gap * 2)) / 2;
  const area = playArea();
  const y = area.top + (area.height - cardHeight - NAME_HEIGHT) / 2 + 12;
  return [0, 1, 2].map((i) => ({
    x: startX + i * (cardWidth + gap), y, label: labels?.[i], labelSide: 'top' as const,
  }));
}

const spreads: Record<string, () => Slot[]> = {
  // Uma carta qualquer no centro
  oneCard: () => {
    const area = playArea();
    return [{
      x: (tableWidth - cardWidth) / 2,
      y: area.top + (area.height - cardHeight - NAME_HEIGHT) / 2,
    }];
  },
  // Três cartas quaisquer lado a lado
  threeRandom: () => threeInARow(),
  threeCards: () => threeInARow(['Passado', 'Presente', 'Futuro']),
  // Um arcano maior em cima e um menor embaixo
  majorMinor: () => {
    const gap = NAME_HEIGHT + 4;
    const totalHeight = cardHeight * 2 + gap + NAME_HEIGHT;
    const x = (tableWidth - cardWidth) / 2;
    const area = playArea();
    // Centraliza abaixo do deck; se não couber, sobe o necessário (as cartas ficam no meio, longe do deck)
    const centered = Math.max(area.top + (area.height - totalHeight) / 2, area.top);
    const y = Math.max(Math.min(centered, tableHeight - TABLE_PADDING - totalHeight), TABLE_PADDING);
    return [
      { x, y, label: 'Arcano Maior', labelSide: 'left' as const, filter: (card: Card) => card.type === 'major' },
      { x, y: y + cardHeight + gap, label: 'Arcano Menor', labelSide: 'left' as const, filter: (card: Card) => card.type === 'minor' },
    ];
  },
};

function clearSlotLabels () {
  slotLabels.removeChildren().forEach((child) => child.destroy());
}

function showSlotLabel (slot: Slot) {
  if (!slot.label) return;
  const label = createSlotLabel(slot.label);
  if (slot.labelSide === 'top') {
    label.anchor.set(0.5, 1);
    label.position.set(slot.x + cardWidth / 2, slot.y - 14);
  } else {
    label.anchor.set(1, 0.5);
    label.position.set(slot.x - 24, slot.y + cardHeight / 2);
  }
  label.alpha = 0;
  slotLabels.addChild(label);
  tween(app.ticker, 600, (t) => { label.alpha = t; }, easeOutCubic);
}

async function runSpread (name: string) {
  // A mesa é limpa antes: tudo volta para o deck embaralhado
  await returnAllToDeck();
  await shuffleDeckAnimation();

  const slots = spreads[name]();
  beginReading(name);
  readingSize = slots.length;
  await Promise.all(slots.map(async (slot, i) => {
    const data = takeFromDeck(slot.filter);
    if (!data) return;
    await wait(app.ticker, i * DEAL_STAGGER);
    showSlotLabel(slot);
    await dealCard(data, slot, i, slot.label);
  }));
}

spreadButtons.forEach((button) => {
  button.addEventListener('click', () => runLocked(() => runSpread(button.dataset.spread ?? '')));
});
// Reset: recolhe tudo e embaralha o deck
resetButton.addEventListener('click', () => runLocked(async () => {
  await returnAllToDeck();
  await shuffleDeckAnimation();
}));

// O texto do Pixi é desenhado uma vez; espera a fonte carregar para não ficar com a fonte padrão
document.fonts.load('600 15px Cinzel').catch(() => undefined).then(setup);

function setup() {
  layoutTable(); // a barra de botões já tem a altura final com a fonte carregada
  createDeck();
  runLocked(shuffleDeckAnimation); // embaralha ao abrir a página
  // Usar o sistema de ticker para atualizações em tempo real
  app.ticker.add((delta) => {
      update(delta);
  });
}

let dragTarget: TableCard | null = null;
let dragMoved = false;
let dragStartX = 0;
let dragStartY = 0;
let offsetX = 0;
let offsetY = 0;

function onDragStart(event: FederatedPointerEvent, tableCard: TableCard) {
  if (tableCard.moving) return;
  dragTarget = tableCard;
  dragMoved = false;
  dragStartX = event.global.x;
  dragStartY = event.global.y;

  // Traz a carta para a frente das outras
  cardsLayer.addChild(tableCard.card);

  // Armazenar o deslocamento entre o ponteiro e a posição da carta, em coordenadas da mesa
  const pointer = table.toLocal(event.global);
  offsetX = tableCard.card.x - pointer.x;
  offsetY = tableCard.card.y - pointer.y;
}

function onDragEnd() {
  const tableCard = dragTarget;
  dragTarget = null;
  if (!tableCard) return;

  if (!dragMoved) {
    // Clique sem arrastar: carta virada revela; carta revelada abre o significado
    if (!tableCard.revealed) {
      trackAction(() => revealCard(tableCard)); // dá para revelar várias cartas seguidas
    } else {
      openCardDrawer(tableCard.data);
    }
    return;
  }
  tableCard.card.cursor = tableCard.revealed ? 'grab' : 'pointer';
}

function onDragMove(event: FederatedPointerEvent) {
  if (!dragTarget) return;

  // Só começa a arrastar depois de andar um pouco, para o clique não empurrar a carta
  if (!dragMoved) {
    const distance = Math.hypot(event.global.x - dragStartX, event.global.y - dragStartY);
    if (distance < DRAG_THRESHOLD) return;
    dragMoved = true;
    dragTarget.card.cursor = 'grabbing';
  }

  const pointer = table.toLocal(event.global);
  dragTarget.card.x = pointer.x + offsetX;
  dragTarget.card.y = pointer.y + offsetY;
  clampToTable(dragTarget.card);
}

let elapsed = 0;

function update(delta: number) {
  elapsed += app.ticker.deltaMS;

  // A aura do deck "respira" enquanto dá para comprar, e some enquanto está travado
  if (deckAura) {
    const target = isBusy() ? 0 : 0.55 + 0.45 * Math.sin(elapsed / 600);
    deckAura.alpha += (target - deckAura.alpha) * 0.15;
  }
}
