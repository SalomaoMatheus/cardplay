import { Application, Loader, BitmapFont, Sprite, Graphics } from 'pixi.js';
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

type EventMode = 'static' | 'dynamic' | 'none'; // ou quaisquer outras strings que você queira usar.

declare module 'pixi.js' {
  interface Container {
    eventMode: EventMode;
  }
}

let isDragging = false;
const randomDeckCardsNumbersArray = Array.from({length: 78}, (_, i) => i).sort(() => Math.random() - 0.5);
const cards: Card[] = cardsJson;

const app = new Application({
	view: document.getElementById("pixi-canvas") as HTMLCanvasElement,
	resolution: window.devicePixelRatio || 1,
	autoDensity: true,
	width: window.innerWidth,
	height: window.innerHeight,
	backgroundColor: 0xAAAAAA,
});

BitmapFont.from('Cinzel Decorative', { fontFamily: 'Cinzel Decorative' });

function createDeck() {
  const backTexture = cards.find((card: Card) => card.id === 777)?.path;
  if (!backTexture) return;
  const Deck = createDeckSprite(backTexture);
  Deck.interactive = true;
  Deck.on('pointerdown', () => drawFromDeck(Deck));
  app.stage.addChild(Deck);
}

function createNewCard() {
  const backTexture = cards.find((card: Card) => card.id === 777)?.path;
  if (!backTexture) return;
  
  let cardNumber = randomDeckCardsNumbersArray.shift();

  const cardData = cards.find((card: Card) => card.id === cardNumber);
  if (!cardData) return; // handle null or undefined card data

  const Card = createCardSprite(cardData.path);
  const Name = createNameText(cardData.name_pt);

  Card.addChild(Name); 

  // Inicial configurações de drag and drop
  Card.interactive = true;

  Card.on("pointerdown", (e) => onDragStart(e, Card))
        .on("pointerup", onDragEnd)
        .on("pointerupoutside", onDragEnd)
        .on("pointermove", (e) => onDragMove(e, Card));

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

function turnCardUp (card: Sprite | Graphics) {

}

function drawFromDeck (deck: any) {
  const nCard = createNewCard();
  if (!nCard) {
    app.stage.removeChild(deck);
  }
}

let offsetX = 0;
let offsetY = 0;

function onDragStart(event: any, card: Sprite | Graphics) {
  isDragging = true;

  // Armazenar o deslocamento entre o ponteiro e a posição do sprite
  offsetX = card.x - event.data.global.x;
  offsetY = card.y - event.data.global.y;
}

function onDragEnd() {
  isDragging = false;
}

function onDragMove(event: any, card: Sprite | Graphics) {
  if (isDragging) {
      card.x = event.data.global.x + offsetX;
      card.y = event.data.global.y + offsetY;
  }
}

function update(delta: number) {
  // Aqui você pode adicionar qualquer lógica que precise ser atualizada em cada frame
}