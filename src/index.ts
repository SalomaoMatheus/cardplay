import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js'

const app = new Application({
	view: document.getElementById("pixi-canvas") as HTMLCanvasElement,
	resolution: window.devicePixelRatio || 1,
	autoDensity: true,
  width: window.innerWidth,
  height: window.innerHeight,
	backgroundColor: 0xAAAAAA,
});
// Criar objeto retangular (card)
const cardWidth = 76;
const cardHeight = 151;
const cardFillColor = 0x444444;
const cardLineColor = 0x0000FF;
const cardLineWidth = 2;
const cornerRadius = 6;
let cardNumber = 0;

// deck drawing
const deck: Graphics = new Graphics();
deck.beginFill(cardFillColor);
deck.drawRoundedRect(0, 0, cardWidth, cardHeight, cornerRadius);
deck.lineStyle(cardLineWidth, cardLineColor);
deck.endFill();
deck.position.set(10, 10);
app.stage.addChild(deck);
deck.interactive = true;
deck.on('pointerdown', () => createNewCard());

let drag: Container | false = false;

function createNewCard() {
  const card: Graphics = new Graphics();
  card.beginFill(cardFillColor);
  card.drawRoundedRect(0, 0, cardWidth, cardHeight, cornerRadius);
  card.lineStyle(cardLineWidth, cardLineColor);
  card.endFill();
  card.x = (app.screen.width - card.width) / 2;
  card.y = (app.screen.height - card.height) / 2;
  app.stage.addChild(card);
  const number = createNumberOnCard(card);
  createDragAndDropFor(card, number);
}

function createNumberOnCard (card: Graphics) {
    // Adicionar número no centro do card
  cardNumber = cardNumber + 1; // Número desejado
  const numberStyle = new TextStyle({
    fill: 0xFFFFFF, // Cor do texto
    fontSize: 36, // Tamanho do texto
    fontWeight: 'bold' // Peso da fonte
  });
  const numberText = new Text(cardNumber.toString(), numberStyle);
  numberText.anchor.set(0.5); // Definir o ponto de ancoragem no centro do texto
  numberText.position.set(card.x + cardWidth / 2, card.y + cardHeight / 2); // Posicionar o texto no centro do card
  app.stage.addChild(numberText); // Adicionar o texto à cena do PixiJS
  return numberText;
}

function createDragAndDropFor(target: Container, numberInCard: Text): void {
  target.interactive = true;
  target.on("pointerdown", () => drag = target);
  target.on("pointerup", () => drag = false);
  target.on("pointerupoutside", () => drag = false);
  target.on("pointermove", (e: any) => {
    if (drag) {
      const maxX = app.view.width - drag.width; // Limite máximo da posição X
      const maxY = app.view.height - drag.height; // Limite máximo da posição Y
      // Atualizar a posição do "card" mantendo-o dentro dos limites da tela
      drag.position.x = Math.min(Math.max(0, drag.position.x + e.data.originalEvent.movementX), maxX);
      drag.position.y = Math.min(Math.max(0, drag.position.y + e.data.originalEvent.movementY), maxY);
      numberInCard.position.set(drag.x + cardWidth / 2, drag.y + cardHeight / 2);
    }
  });
}
