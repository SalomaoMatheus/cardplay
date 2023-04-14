import { Application, Container, Sprite, Graphics, Text, TextStyle } from 'pixi.js';
// import cards json
import cardsJson from './cards.json';

interface Card {
  id: number;
  name_pt: string;
  name_en: string;
  path: string;
}

const cards: Card[] = cardsJson;

const app = new Application({
	view: document.getElementById("pixi-canvas") as HTMLCanvasElement,
	resolution: window.devicePixelRatio || 1,
	autoDensity: true,
  width: window.innerWidth,
  height: window.innerHeight,
	backgroundColor: 0xAAAAAA,
});
// Criar objeto retangular (card)
const cardWidth = 150;
const cardHeight = 263.5;
const cardFillColor = 0x444444;
const cardLineColor = 0x0000FF;
const cardLineWidth = 2;
const cornerRadius = 6;
// generate a array of numbers in random positions from 0 to 77
const randomDeckCardsNumbersArray = Array.from({length: 78}, (_, i) => i).sort(() => Math.random() - 0.5);

// deck drawing
// find the path in the cards that matches the number 777
const deckTexture = cards.find((card: Card) => card.id === 777)!.path;
const deck = deckTexture ? Sprite.from(deckTexture) : new Graphics();
// verify if the deck is a sprite or a graphics
if (deck instanceof Graphics) {
  deck.beginFill(cardFillColor);
  deck.drawRoundedRect(0, 0, cardWidth, cardHeight, cornerRadius);
  deck.lineStyle(cardLineWidth, cardLineColor);
  deck.endFill();
}
deck.width = cardWidth;
deck.height = cardHeight;
deck.position.set(10, 10);
app.stage.addChild(deck);
deck.interactive = true;
deck.on('pointerdown', () => createNewCard());

let drag: Container | false = false;

function createNewCard() {
  // remove the first number of the array and return it
  let cardNumber = randomDeckCardsNumbersArray.shift() as number;
  if (cardNumber == undefined || cardNumber == null) cardNumber = 777;
  
  console.log({ cardNumber, length: randomDeckCardsNumbersArray.length });

  const cardTexture = cards.find((card: Card) => card.id === cardNumber)!.path;
  const card = cardTexture ? Sprite.from(cardTexture) : new Graphics();
  // verify if the card is a sprite or a graphics
  if (card instanceof Graphics) {
    card.beginFill(cardFillColor);
    card.drawRoundedRect(0, 0, cardWidth, cardHeight, cornerRadius);
    card.lineStyle(cardLineWidth, cardLineColor);
    card.endFill();
  }
  card.width = cardWidth;
  card.height = cardHeight;
  card.x = (app.screen.width - card.width) / 2;
  card.y = (app.screen.height - card.height) / 2;
  app.stage.addChild(card);
  const number = createNumberOnCard(card, cardNumber);
  createDragAndDropFor(card, number);
}

createNewCard();

function createNumberOnCard (card: Sprite | Graphics, cardNumber: number) {
    // Adicionar número no centro do card
  const numberStyle = new TextStyle({
    fill: 0xFFFFFF, // Cor do texto
    fontSize: 36, // Tamanho do texto
    fontWeight: 'bold', // Peso da fonte
    stroke: 0x000000,
    strokeThickness: 4,
  });
  const numberText = new Text(cardNumber.toString(), numberStyle);
  numberText.anchor.set(0.5); // Definir o ponto de ancoragem no centro do texto
  numberText.position.set(card.x + cardWidth / 2, card.y + cardHeight); // Posicionar o texto no centro do card
  app.stage.addChild(numberText); // Adicionar o texto à cena do PixiJS
  return numberText;
}

function createDragAndDropFor(target: Container, numberInCard: Text): void {
  target.interactive = true;
  target.on("pointerdown", () => {
    drag = target;
    app.stage.removeChild(target);
    app.stage.removeChild(numberInCard);
    app.stage.addChild(target);
    app.stage.addChild(numberInCard);
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
      numberInCard.position.set(drag.x + cardWidth / 2, drag.y + cardHeight);
    }
  });
}
