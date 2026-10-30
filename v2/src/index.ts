import { Application, Container, FederatedPointerEvent } from 'pixi.js';
import { createDeckSprite, createCardSprite, createNumberText, createNameText } from './pixiObjs';
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
const cards: Card[] = cardsJson;

// Embaralhamento Fisher-Yates (uniforme, ao contrário de sort com Math.random)
function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const randomDeckCardsNumbersArray = shuffle(
  cards.filter((card) => card.id !== CARD_BACK_ID).map((card) => card.id)
);

const app = new Application({
	view: document.getElementById("pixi-canvas") as HTMLCanvasElement,
	resolution: window.devicePixelRatio || 1,
	autoDensity: true,
	width: window.innerWidth,
	height: window.innerHeight,
	backgroundColor: 0xAAAAAA,
});

// O stage recebe os eventos de movimento para o drag não "soltar" quando o ponteiro sai da carta
app.stage.interactive = true;
app.stage.hitArea = app.screen;
app.stage.on('pointermove', onDragMove);
app.stage.on('pointerup', onDragEnd);
app.stage.on('pointerupoutside', onDragEnd);

function createDeck() {
  const backTexture = cards.find((card: Card) => card.id === CARD_BACK_ID)?.path;
  if (!backTexture) return;
  const Deck = createDeckSprite(backTexture);
  Deck.interactive = true;
  Deck.on('pointerdown', () => drawFromDeck(Deck));
  app.stage.addChild(Deck);
}

function createNewCard() {
  const cardNumber = randomDeckCardsNumbersArray.shift();
  if (cardNumber === undefined) return;

  const cardData = cards.find((card: Card) => card.id === cardNumber);
  if (!cardData) return; // handle null or undefined card data

  const Card = createCardSprite(cardData.path);
  const Name = createNameText(cardData.name_pt);

  Card.addChild(Name);

  // Inicial configurações de drag and drop
  Card.interactive = true;
  Card.on("pointerdown", (e: FederatedPointerEvent) => onDragStart(e, Card));

  app.stage.addChild(Card);
  return Card;
}

setup();

function setup() {
  createDeck();
  createNewCard();
  // Usar o sistema de ticker para atualizações em tempo real
  app.ticker.add((delta) => {
      update(delta);
  });
}

function turnCardUp (card: Container) {

}

function drawFromDeck (deck: Container) {
  createNewCard();
  if (randomDeckCardsNumbersArray.length === 0) {
    app.stage.removeChild(deck);
  }
}

let dragTarget: Container | null = null;
let offsetX = 0;
let offsetY = 0;

function onDragStart(event: FederatedPointerEvent, card: Container) {
  dragTarget = card;

  // Traz a carta para a frente das outras
  app.stage.addChild(card);

  // Armazenar o deslocamento entre o ponteiro e a posição do sprite
  offsetX = card.x - event.global.x;
  offsetY = card.y - event.global.y;
}

function onDragEnd() {
  dragTarget = null;
}

function onDragMove(event: FederatedPointerEvent) {
  if (dragTarget) {
      dragTarget.x = event.global.x + offsetX;
      dragTarget.y = event.global.y + offsetY;
  }
}

function update(delta: number) {
  // Aqui você pode adicionar qualquer lógica que precise ser atualizada em cada frame
}
