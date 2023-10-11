import { Graphics, Sprite, Text, TextStyle } from 'pixi.js';

const cardWidth = 150 / 2;
const cardHeight = 263.5 / 2;
const cardFillColor = 0x444444;
const cardLineColor = 0x0000FF;
const cardLineWidth = 2;
const cornerRadius = 6;

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
    Card.x = (window.innerWidth - Card.width) / 2;
    Card.y = (window.innerHeight - Card.height) / 2;
    return Card;
  }
  
  function createNumberText (cardNumber: number) {
    const textStyle = new TextStyle({
      fontFamily: 'Cinzel Decorative',
      fontSize: 180,
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 14,
    });
    const numberText = new Text(cardNumber.toString(), textStyle);
    numberText.anchor.set(0.5); // Definir o ponto de ancoragem no centro do texto
    numberText.position.set(cardWidth * 2, -70); // Posicionar o texto no canto superior esquerdo do card
    return numberText;
  }
  
  function createNameText (cardName: string) {
    const textStyle = new TextStyle({
      fontFamily: 'Cinzel Decorative',
      fontSize: 60,
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 10,
    });
    const nameText = new Text(cardName, textStyle);
    nameText.anchor.set(0.5); // Definir o ponto de ancoragem no canto inferior esquerdo do texto
    nameText.position.set(cardWidth * 2, cardHeight * 4 + 40); // Posicionar o texto no canto inferior esquerdo do card
    return nameText;
  }

export {
    createDeckSprite,
    createCardSprite,
    createNumberText,
    createNameText,
};