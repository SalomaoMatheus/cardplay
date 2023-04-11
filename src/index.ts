import { Application, Container, Graphics } from 'pixi.js'

const app = new Application({
	view: document.getElementById("pixi-canvas") as HTMLCanvasElement,
	resolution: window.devicePixelRatio || 1,
	autoDensity: true,
	backgroundColor: 0x6495ed,
});

const card: Graphics = new Graphics();
card.beginFill(0x000000);
card.drawRect(0, 0, 151, 302);
card.endFill();

card.x = app.screen.width / 2;
card.y = app.screen.height / 2;

app.stage.addChild(card);

let drag: Container | false = false;

createDragAndDropFor(card);

function createDragAndDropFor(target: Container): void {
  target.interactive = true;
  target.on("mousedown", () => {
    drag = target;
  });
  target.on("mouseup", () => {
    drag = false;
  });
  target.on("mousemove", (e: any) => {
    if (drag) {
      drag.position.x += e.data.originalEvent.movementX;
      drag.position.y += e.data.originalEvent.movementY;
    }
  });
}