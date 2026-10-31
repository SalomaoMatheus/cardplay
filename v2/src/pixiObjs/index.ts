import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';

const cardWidth = 110;
const cardHeight = cardWidth * 263.5 / 150;
const cardFillColor = 0x1a1025;
const cardLineColor = 0x9b5de5;
const cardLineWidth = 2.5;
const cardInnerLineColor = 0xd9c2ff;
const cornerRadius = 8;

const tableFillColor = 0x0b0612;
const tableLineColor = 0x7a3fc0;
const tableInnerLineColor = 0x4a2370;
const tableCornerRadius = 14;
const tableInset = 10; // distância entre a borda da mesa e a linha interna

const sigilColor = 0xb98cff;

const nameWrapWidth = cardWidth + 30;

const fontFamily = 'Cinzel, Georgia, serif';
// Texto do Pixi é rasterizado; resolução alta deixa as letras nítidas em telas HiDPI
const textResolution = Math.min(4, Math.max(2, (window.devicePixelRatio || 1) * 2));

// Brilho "falso": traços largos e transparentes em volta da forma, sem custo de filtro
function drawAura (g: Graphics, x: number, y: number, w: number, h: number, r: number, color: number) {
    for (const [width, alpha] of [[12, 0.05], [8, 0.09], [5, 0.16]]) {
      g.lineStyle(width, color, alpha);
      g.drawRoundedRect(x, y, w, h, r);
    }
  }

function drawDiamond (g: Graphics, x: number, y: number, size: number) {
    g.drawPolygon([x, y - size, x + size, y, x, y + size, x - size, y]);
  }

// Moldura oculta da carta: borda roxa, filete interno claro e losangos nos cantos
function drawCardFrame (g: Graphics) {
    g.lineStyle(cardLineWidth, cardLineColor);
    g.drawRoundedRect(0, 0, cardWidth, cardHeight, cornerRadius);

    const inset = 5;
    g.lineStyle(1, cardInnerLineColor, 0.55);
    g.drawRoundedRect(inset, inset, cardWidth - inset * 2, cardHeight - inset * 2, cornerRadius - 3);

    g.lineStyle(0);
    g.beginFill(cardInnerLineColor, 0.9);
    for (const [x, y] of [[inset, inset], [cardWidth - inset, inset], [inset, cardHeight - inset], [cardWidth - inset, cardHeight - inset]]) {
      drawDiamond(g, x, y, 3);
    }
    g.endFill();
  }

// Cria a face da carta: imagem com cantos arredondados e moldura, ou um retângulo como fallback
function createCardFace (texture: string) {
    const face = new Container();

    const aura = new Graphics();
    drawAura(aura, 0, 0, cardWidth, cardHeight, cornerRadius, cardLineColor);
    face.addChild(aura);

    if (texture) {
      const sprite = Sprite.from(texture);
      sprite.width = cardWidth;
      sprite.height = cardHeight;

      const mask = new Graphics();
      mask.beginFill(0xffffff);
      mask.drawRoundedRect(0, 0, cardWidth, cardHeight, cornerRadius);
      mask.endFill();
      sprite.mask = mask;

      face.addChild(sprite, mask);
    } else {
      const fill = new Graphics();
      fill.beginFill(cardFillColor);
      fill.drawRoundedRect(0, 0, cardWidth, cardHeight, cornerRadius);
      fill.endFill();
      face.addChild(fill);
    }

    const frame = new Graphics();
    drawCardFrame(frame);
    face.addChild(frame);

    return face;
  }

// O deck tem cartas "empilhadas" atrás para dar espessura e uma aura que pulsa enquanto está disponível
function createDeckSprite (deckTexture: string) {
    const deck = new Container();

    const aura = new Graphics();
    drawAura(aura, 0, 0, cardWidth, cardHeight, cornerRadius, cardLineColor);
    drawAura(aura, 0, 0, cardWidth, cardHeight, cornerRadius, cardLineColor);

    const stack = new Graphics();
    for (const offset of [6, 3]) {
      stack.lineStyle(1.5, tableLineColor, 0.8);
      stack.beginFill(cardFillColor);
      stack.drawRoundedRect(offset, offset, cardWidth, cardHeight, cornerRadius);
      stack.endFill();
    }

    deck.addChild(aura, stack, createCardFace(deckTexture));
    deck.cursor = 'pointer';
    return { deck, aura };
  }

  // A carta é um Container sem escala, assim os textos filhos usam coordenadas e tamanhos reais.
  // As faces ficam num "flipper" com pivô no centro, que gira (escala X) e sobe (escala) na animação.
  function createCardSprite (frontTexture: string, backTexture: string) {
    const card = new Container();

    const flipper = new Container();
    flipper.pivot.set(cardWidth / 2, cardHeight / 2);
    flipper.position.set(cardWidth / 2, cardHeight / 2);

    const back = createCardFace(backTexture);
    const front = createCardFace(frontTexture);
    front.visible = false;
    flipper.addChild(back, front);

    card.addChild(flipper);
    return { card, flipper, front, back };
  }

  // Sombra que fica na mesa enquanto a carta voa
  function createCardShadow () {
    const shadow = new Graphics();
    shadow.beginFill(0x000000, 0.6);
    shadow.drawRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, cornerRadius);
    shadow.endFill();
    shadow.position.set(cardWidth / 2, cardHeight / 2);
    return shadow;
  }

  // Selo de invocação: círculos concêntricos, heptagrama, marcas rúnicas e nós nos vértices
  function createSigil (radius: number, color = sigilColor, lineWidth = 1.5) {
    const g = new Graphics();
    const points = 7;
    const vertex = (i: number, r: number) => {
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / points;
      return [Math.cos(angle) * r, Math.sin(angle) * r];
    };

    g.lineStyle(lineWidth, color);
    g.drawCircle(0, 0, radius);
    g.lineStyle(lineWidth * 0.6, color, 0.8);
    g.drawCircle(0, 0, radius * 0.86);
    g.drawCircle(0, 0, radius * 0.22);

    // Marcas entre os dois círculos externos, alternando tamanhos como runas
    for (let i = 0; i < 56; i++) {
      const angle = (i * Math.PI * 2) / 56;
      const inner = radius * (i % 4 === 0 ? 0.87 : 0.91);
      g.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      g.lineTo(Math.cos(angle) * radius * 0.98, Math.sin(angle) * radius * 0.98);
    }

    // Heptagrama {7/3}
    const starRadius = radius * 0.86;
    g.lineStyle(lineWidth, color);
    const [startX, startY] = vertex(0, starRadius);
    g.moveTo(startX, startY);
    for (let i = 1; i <= points; i++) {
      const [x, y] = vertex((i * 3) % points, starRadius);
      g.lineTo(x, y);
    }

    g.lineStyle(lineWidth * 0.6, color);
    g.beginFill(tableFillColor);
    for (let i = 0; i < points; i++) {
      const [x, y] = vertex(i, starRadius);
      g.drawCircle(x, y, radius * 0.045);
    }
    g.endFill();

    return g;
  }

  // A mesa é redesenhada quando a janela muda de tamanho
  function drawTable (table: Graphics, width: number, height: number) {
    table.clear();

    drawAura(table, 0, 0, width, height, tableCornerRadius, tableLineColor);

    table.lineStyle(2, tableLineColor);
    table.beginFill(tableFillColor);
    table.drawRoundedRect(0, 0, width, height, tableCornerRadius);
    table.endFill();

    table.lineStyle(1, tableInnerLineColor, 0.9);
    table.drawRoundedRect(tableInset, tableInset, width - tableInset * 2, height - tableInset * 2, tableCornerRadius - 6);

    // Ornamentos: losango com círculo nos cantos e no meio de cada lado da linha interna
    const left = tableInset;
    const top = tableInset;
    const right = width - tableInset;
    const bottom = height - tableInset;
    const ornaments = [
      [left, top], [right, top], [left, bottom], [right, bottom],
      [width / 2, top], [width / 2, bottom], [left, height / 2], [right, height / 2],
    ];
    for (const [x, y] of ornaments) {
      table.lineStyle(1, tableLineColor);
      table.beginFill(tableFillColor);
      table.drawCircle(x, y, 7);
      table.endFill();
      table.lineStyle(0);
      table.beginFill(sigilColor, 0.85);
      drawDiamond(table, x, y, 3.5);
      table.endFill();
    }
  }

  function createNameText (cardName: string) {
    const textStyle = new TextStyle({
      fontFamily,
      fontSize: 15,
      fontWeight: '600',
      fill: '#f3eaff',
      // Contorno na cor da mesa: separa o nome do que estiver atrás (outras cartas, selo)
      stroke: '#0b0612',
      strokeThickness: 5,
      lineJoin: 'round',
      letterSpacing: 0.5,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: nameWrapWidth,
    });
    const nameText = new Text(cardName, textStyle);
    nameText.resolution = textResolution;
    nameText.anchor.set(0.5, 0); // Centralizado na horizontal, preso pelo topo
    nameText.position.set(cardWidth / 2, cardHeight + 10); // Logo abaixo do card

    return nameText;
  }

  function createDeckCountText () {
    const textStyle = new TextStyle({
      fontFamily,
      fontSize: 13,
      fontWeight: '600',
      fill: '#b9a3d6',
      letterSpacing: 1,
    });
    const countText = new Text('', textStyle);
    countText.resolution = textResolution;
    countText.anchor.set(0.5, 0);
    countText.position.set(cardWidth / 2 + 3, cardHeight + 14);
    return countText;
  }

  // Rótulo das posições de uma tiragem ("Passado", "Arcano Maior"...)
  function createSlotLabel (label: string) {
    const textStyle = new TextStyle({
      fontFamily,
      fontSize: 13,
      fontWeight: '700',
      fill: '#b98cff',
      letterSpacing: 3,
    });
    const labelText = new Text(label.toUpperCase(), textStyle);
    labelText.resolution = textResolution;
    return labelText;
  }

export {
    cardWidth,
    cardHeight,
    cornerRadius,
    createCardFace,
    createDeckSprite,
    createCardSprite,
    createCardShadow,
    createSigil,
    drawTable,
    createNameText,
    createDeckCountText,
    createSlotLabel,
};
