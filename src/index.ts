import { Application, Container, Text, BitmapFont } from 'pixi.js';
// import sprites creation functions
import { createDeckSprite, createCardSprite, createNumberText, createNameText } from './pixiObjs';
// import cards json
import cardsJson from './cards.json';
// create interface for cards
interface Card {
  id: number;
  value: number;
  name_pt: string;
  name_en: string;
  path: string;
}
// convert json to array of cards
const cards: Card[] = cardsJson;
// create app instance
const app = new Application({
	view: document.getElementById("pixi-canvas") as HTMLCanvasElement,
	resolution: window.devicePixelRatio || 1,
	autoDensity: true,
  width: window.innerWidth,
  height: window.innerHeight,
	backgroundColor: 0xAAAAAA,
});
// load font
BitmapFont.from('Cinzel Decorative', { fontFamily: 'Cinzel Decorative' });
// Criar objeto retangular (card)
const cardWidth = 150;
const cardHeight = 263.5;

// generate a array of numbers in random positions from 0 to 77
const randomDeckCardsNumbersArray = Array.from({length: 78}, (_, i) => i).sort(() => Math.random() - 0.5);


// deck drawing
function createDeck () {
  // find the path in the cards that matches the number 777
  const deckTexture = cards.find((card: Card) => card.id === 777)!.path;
  const Deck = createDeckSprite(deckTexture);
  app.stage.addChild(Deck);
  Deck.eventMode = 'dynamic';
  Deck.on('pointerdown', () => createNewCard());
}

function createNewCard() {
  // remove the first number of the array and return it
  let cardNumber = randomDeckCardsNumbersArray.shift() as number;
  if (cardNumber == undefined || cardNumber == null) cardNumber = 777;
  const cardData = cards.find((card: Card) => card.id === cardNumber);
  const Card = createCardSprite(cardData!.path);
  const Name = createNameText(Card, cardData!.name_pt);
  const Number = createNumberText(Card, cardData!.value);
  app.stage.addChild(Card);
  app.stage.addChild(Name);
  app.stage.addChild(Number);
  createDragAndDropFor(Card, Number, Name);
}

createDeck();
createNewCard();

let drag: Container | false = false;
function createDragAndDropFor(target: Container, numberInCard: Text, nameInCard: Text): void {
  target.eventMode = 'dynamic';
  target.on("pointerdown", () => {
    drag = target;
    app.stage.removeChild(target);
    app.stage.removeChild(numberInCard);
    app.stage.removeChild(nameInCard);
    app.stage.addChild(target);
    app.stage.addChild(numberInCard);
    app.stage.addChild(nameInCard);
  });
  target.on("pointerup", () => drag = false);
  target.on("pointerupoutside", () => drag = false);
  target.on("pointermove", (e: any) => {
    if (drag) {
      const maxX = app.view.width - drag.width; // Limite máximo da posição X
      const maxY = app.view.height - drag.height; // Limite máximo da posição Y
      // Atualizar a posição do "card" mantendo-o dentro dos limites da tela
      drag.position.x = Math.min(Math.max(0, drag.position.x + e.data.originalEvent.movementX), maxX);
      drag.position.y = Math.min(Math.max(0, drag.position.y + e.data.originalEvent.movementY), maxY);
      numberInCard.position.set(drag.x + cardWidth / 2, drag.y + 12);
      nameInCard.position.set(drag.x + cardWidth / 2, (drag.y + cardHeight) - 12);
    }
  });
}
