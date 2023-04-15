import { Application, Container, Sprite, Graphics, Text, TextStyle, BitmapFont } from 'pixi.js';
// import cards json
import cardsJson from './cards.json';
// create interface for cards
interface Card {
  id: number;
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
const cardFillColor = 0x444444;
const cardLineColor = 0x0000FF;
const cardLineWidth = 2;
const cornerRadius = 6;
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

createDeck();

function createNewCard() {
  // remove the first number of the array and return it
  let cardNumber = randomDeckCardsNumbersArray.shift() as number;
  if (cardNumber == undefined || cardNumber == null) cardNumber = 777;
  const cardData = cards.find((card: Card) => card.id === cardNumber);
  const Card = createCardSprite(cardData!.path);
  const Number = createNumberText(Card, cardData!.id);
  const Name = createNameText(Card, cardData!.name_pt);
  app.stage.addChild(Card);
  app.stage.addChild(Number);
  app.stage.addChild(Name);
  createDragAndDropFor(Card, Number, Name);
}

createNewCard();

function createDeckSprite (deckTexture: string) {
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
  return deck;
}

function createCardSprite (cardTexture: string) {
  const Card = cardTexture ? Sprite.from(cardTexture) : new Graphics();
  // verify if the card is a sprite or a graphics
  if (Card instanceof Graphics) {
    Card.beginFill(cardFillColor);
    Card.drawRoundedRect(0, 0, cardWidth, cardHeight, cornerRadius);
    Card.lineStyle(cardLineWidth, cardLineColor);
    Card.endFill();
  }
  Card.width = cardWidth;
  Card.height = cardHeight;
  Card.x = (app.screen.width - Card.width) / 2;
  Card.y = (app.screen.height - Card.height) / 2;
  return Card;
}

function createNumberText (Card: Sprite | Graphics, cardNumber: number) {
  const textStyle = new TextStyle({
    fontFamily: 'Cinzel Decorative',
    fontSize: 30,
    fill: '#ffffff',
    stroke: '#000000',
    strokeThickness: 3,
  });
  const numberText = new Text(cardNumber.toString(), textStyle);
  numberText.anchor.set(0.5); // Definir o ponto de ancoragem no centro do texto
  numberText.position.set(Card.x + cardWidth / 2, Card.y + 12); // Posicionar o texto no canto superior esquerdo do card
  return numberText;
}

function createNameText (Card: Sprite | Graphics, cardName: string) {
  const textStyle = new TextStyle({
    fontFamily: 'Cinzel Decorative',
    fontSize: 16,
    fill: '#ffffff',
    stroke: '#000000',
    strokeThickness: 5,
  });
  const nameText = new Text(cardName, textStyle);
  nameText.anchor.set(0.5); // Definir o ponto de ancoragem no canto inferior esquerdo do texto
  nameText.position.set(Card.x + cardWidth / 2, (Card.y + cardHeight) - 12); // Posicionar o texto no canto inferior esquerdo do card
  return nameText;
}

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
