import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';

const cardWidth = 150 / 2;
const cardHeight = 263.5 / 2;
const cardFillColor = 0x444444;
const cardLineColor = 0x0000FF;
const cardLineWidth = 2;
const cornerRadius = 6;

// Cria a face da carta: sprite com a imagem ou um retângulo arredondado como fallback
function createCardFace (texture: string) {
    if (texture) {
      const sprite = Sprite.from(texture);
      sprite.width = cardWidth;
      sprite.height = cardHeight;
      return sprite;
    }
    const graphics = new Graphics();
    graphics.lineStyle(cardLineWidth, cardLineColor);
    graphics.beginFill(cardFillColor);
    graphics.drawRoundedRect(0, 0, cardWidth, cardHeight, cornerRadius);
    graphics.endFill();
    return graphics;
  }

function createDeckSprite (deckTexture: string) {
    const deck = createCardFace(deckTexture);
    deck.position.set(10, 10);
    return deck;
  }

  // A carta é um Container sem escala, assim os textos filhos usam coordenadas e tamanhos reais
  function createCardSprite (cardTexture: string) {
    const Card = new Container();
    Card.addChild(createCardFace(cardTexture));
    Card.x = (window.innerWidth - cardWidth) / 2;
    Card.y = (window.innerHeight - cardHeight) / 2;
    return Card;
  }

  function createNumberText (cardNumber: number) {
    const textStyle = new TextStyle({
      fontFamily: 'Cinzel Decorative',
      fontSize: 45,
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3.5,
      dropShadow: true,
      dropShadowBlur: 1,
      dropShadowDistance: 0,
      dropShadowColor: '#000'
    });
    const numberText = new Text(cardNumber.toString(), textStyle);
    numberText.anchor.set(0.5); // Definir o ponto de ancoragem no centro do texto
    numberText.position.set(cardWidth / 2, -17.5); // Posicionar o texto centralizado acima do card
    return numberText;
  }

  function createNameText (cardName: string) {
    const textStyle = new TextStyle({
      fontFamily: 'Cinzel Decorative',
      fontSize: 16,
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1,
      dropShadow: true,
      dropShadowBlur: 1,
      dropShadowDistance: 0,
      dropShadowColor: '#000'
    });
    const nameText = new Text(cardName, textStyle);
    nameText.anchor.set(0.5); // Definir o ponto de ancoragem no centro do texto
    nameText.position.set(cardWidth / 2, cardHeight + 10); // Posicionar o texto centralizado abaixo do card
    return nameText;
  }

export {
    createDeckSprite,
    createCardSprite,
    createNumberText,
    createNameText,
};
