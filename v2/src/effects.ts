import { BLEND_MODES, BlurFilter, Container, Graphics, Ticker } from 'pixi.js';
import { cardWidth, cardHeight, cornerRadius, createSigil } from './pixiObjs';

const glowColor = 0xc79bff;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

// Anima de 0 a 1 em `duration` ms usando o ticker do Pixi; resolve quando termina
function tween (ticker: Ticker, duration: number, onUpdate: (t: number) => void, easing = (t: number) => t) {
  return new Promise<void>((resolve) => {
    let elapsed = 0;
    const step = () => {
      elapsed += ticker.deltaMS;
      const t = Math.min(elapsed / duration, 1);
      onUpdate(easing(t));
      if (t >= 1) {
        ticker.remove(step);
        resolve();
      }
    };
    ticker.add(step);
  });
}

function glowing (obj: Graphics, blur: number) {
  obj.blendMode = BLEND_MODES.ADD;
  if (blur > 0) obj.filters = [new BlurFilter(blur)];
  return obj;
}

// Efeito de "carta invocada" quando a carta toca a mesa.
// `below` fica sob as cartas (selo e onda no chão), `above` fica sobre elas (flash, contorno, feixe, partículas).
// (x, y) é o canto superior esquerdo da carta, nas coordenadas das camadas.
function summonEffect (ticker: Ticker, below: Container, above: Container, x: number, y: number) {
  const cx = x + cardWidth / 2;
  const cy = y + cardHeight / 2;
  const effects: Promise<void>[] = [];

  // Selo de invocação que surge, gira e se apaga sob a carta
  const sigilRadius = cardHeight * 0.85;
  const sigil = new Container();
  sigil.addChild(glowing(createSigil(sigilRadius, glowColor, 3), 6), glowing(createSigil(sigilRadius), 0));
  sigil.position.set(cx, cy);
  below.addChild(sigil);
  effects.push(tween(ticker, 1600, (t) => {
    sigil.scale.set(lerp(0.4, 1.1, easeOutCubic(Math.min(t * 1.6, 1))));
    sigil.rotation = lerp(0, 1.2, easeOutCubic(t));
    sigil.alpha = t < 0.15 ? t / 0.15 : Math.pow(1 - (t - 0.15) / 0.85, 1.5);
  }).then(() => sigil.destroy({ children: true })));

  // Onda de choque que se espalha pela mesa
  const ring = glowing(new Graphics(), 4);
  ring.lineStyle(3, glowColor);
  ring.drawCircle(0, 0, cardHeight * 0.5);
  ring.position.set(cx, cy);
  below.addChild(ring);
  effects.push(tween(ticker, 800, (t) => {
    ring.scale.set(lerp(0.5, 2.6, t));
    ring.alpha = 1 - t;
  }, easeOutCubic).then(() => ring.destroy()));

  // Feixe de luz que sobe da carta
  const beam = glowing(new Graphics(), 18);
  beam.beginFill(glowColor, 0.7);
  beam.drawRect(-cardWidth * 0.35, -cardHeight * 2.2, cardWidth * 0.7, cardHeight * 2.2);
  beam.endFill();
  beam.position.set(cx, cy + cardHeight / 2);
  above.addChild(beam);
  effects.push(tween(ticker, 700, (t) => {
    beam.scale.set(lerp(1.2, 0.3, t), lerp(0.2, 1, easeOutCubic(t)));
    beam.alpha = 1 - t;
  }).then(() => beam.destroy()));

  // Flash branco na face da carta
  const flash = glowing(new Graphics(), 0);
  flash.beginFill(0xffffff, 0.85);
  flash.drawRoundedRect(x, y, cardWidth, cardHeight, cornerRadius);
  flash.endFill();
  above.addChild(flash);
  effects.push(tween(ticker, 350, (t) => { flash.alpha = 1 - t; }).then(() => flash.destroy()));

  // Contorno brilhante que se expande e se apaga
  const outline = glowing(new Graphics(), 8);
  outline.lineStyle(6, glowColor);
  outline.drawRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, cornerRadius);
  outline.position.set(cx, cy);
  above.addChild(outline);
  effects.push(tween(ticker, 1000, (t) => {
    outline.scale.set(lerp(1, 1.12, t));
    outline.alpha = 1 - t;
  }, easeOutCubic).then(() => outline.destroy()));

  // Faíscas saindo das bordas da carta
  for (let i = 0; i < 28; i++) {
    const spark = glowing(new Graphics(), 0);
    spark.beginFill(i % 3 === 0 ? 0xffffff : glowColor);
    spark.drawCircle(0, 0, 1 + Math.random() * 2);
    spark.endFill();

    // Ponto aleatório no perímetro da carta
    const side = Math.random() * 2 * (cardWidth + cardHeight);
    const startX = side < cardWidth ? side : side < cardWidth + cardHeight ? cardWidth : side < 2 * cardWidth + cardHeight ? side - cardWidth - cardHeight : 0;
    const startY = side < cardWidth ? 0 : side < cardWidth + cardHeight ? side - cardWidth : side < 2 * cardWidth + cardHeight ? cardHeight : side - 2 * cardWidth - cardHeight;
    const fromX = x + startX;
    const fromY = y + startY;
    const dirX = (startX - cardWidth / 2) / cardWidth;
    const toX = fromX + dirX * (30 + Math.random() * 40);
    const toY = fromY - (40 + Math.random() * 70);
    above.addChild(spark);

    effects.push(tween(ticker, 700 + Math.random() * 500, (t) => {
      spark.position.set(lerp(fromX, toX, t), lerp(fromY, toY, t));
      spark.alpha = 1 - t;
    }, easeOutCubic).then(() => spark.destroy()));
  }

  return Promise.all(effects);
}

// Pouso discreto de uma carta virada: só um anel fraco no chão
function landEffect (ticker: Ticker, below: Container, x: number, y: number) {
  const ring = glowing(new Graphics(), 3);
  ring.lineStyle(2, glowColor, 0.6);
  ring.drawRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, cornerRadius);
  ring.position.set(x + cardWidth / 2, y + cardHeight / 2);
  below.addChild(ring);
  return tween(ticker, 450, (t) => {
    ring.scale.set(lerp(1, 1.25, t));
    ring.alpha = 1 - t;
  }, easeOutCubic).then(() => ring.destroy());
}

// Espera `duration` ms no ritmo do ticker
const wait = (ticker: Ticker, duration: number) => tween(ticker, duration, () => undefined);

export { tween, wait, summonEffect, landEffect, easeInOutCubic, easeOutCubic, lerp };
