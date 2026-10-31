// Comportamento comum dos drawers: abrir/fechar, backdrop, Esc e, no celular,
// arrastar para baixo para fechar. Um drawer pode abrir por cima de outro (ex.: o
// significado de uma carta por cima do histórico); Esc fecha só o de cima.

interface Sheet {
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
}

const sheetLayout = window.matchMedia('(max-width: 639px)');
const DISMISS_DISTANCE = 0.25; // fração da altura do drawer que fecha ao soltar
const DISMISS_SPEED = 0.6; // px/ms: um gesto rápido fecha mesmo se curto
const DRAG_SLOP = 6; // px antes de decidir que é arraste e não toque/rolagem

// Drawers abertos, do mais antigo para o mais recente
const openSheets: Sheet[] = [];

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') openSheets[openSheets.length - 1]?.close();
});

function createSheet (drawer: HTMLElement, backdrop: HTMLElement, closeButton: HTMLButtonElement): Sheet {
  const sheet: Sheet = { open, close, isOpen: () => drawer.classList.contains('open') };

  function open () {
    drawer.scrollTop = 0;
    drawer.classList.add('open');
    backdrop.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    closeButton.focus({ preventScroll: true });
    if (!openSheets.includes(sheet)) openSheets.push(sheet);
  }

  function close () {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    const index = openSheets.indexOf(sheet);
    if (index !== -1) openSheets.splice(index, 1);
  }

  // ---------- Arrastar para baixo para fechar (gaveta do celular) ----------

  let touchStartY = 0;
  let dragOffset = 0;
  let dragging = false;
  let lastMoveY = 0;
  let lastMoveTime = 0;
  let speed = 0;

  drawer.addEventListener('touchstart', (event) => {
    if (!sheetLayout.matches || event.touches.length !== 1) return;
    touchStartY = event.touches[0].clientY;
    lastMoveY = touchStartY;
    lastMoveTime = event.timeStamp;
    speed = 0;
    dragging = false;
    dragOffset = 0;
  }, { passive: true });

  drawer.addEventListener('touchmove', (event) => {
    if (!sheetLayout.matches || event.touches.length !== 1) return;
    const y = event.touches[0].clientY;
    const delta = y - touchStartY;

    // Só vira arraste puxando para baixo com o conteúdo já no topo; senão é rolagem normal
    if (!dragging) {
      if (delta < DRAG_SLOP || drawer.scrollTop > 0) return;
      dragging = true;
      touchStartY = y; // começa a seguir o dedo daqui, sem pulo
      drawer.style.transition = 'none';
      backdrop.style.transition = 'none';
    }

    event.preventDefault(); // impede a rolagem/recarregar da página enquanto arrasta
    dragOffset = Math.max(0, y - touchStartY);
    drawer.style.transform = `translateY(${dragOffset}px)`;
    backdrop.style.opacity = String(1 - Math.min(dragOffset / drawer.offsetHeight, 1));

    const elapsed = event.timeStamp - lastMoveTime;
    if (elapsed > 0) speed = (y - lastMoveY) / elapsed;
    lastMoveY = y;
    lastMoveTime = event.timeStamp;
  }, { passive: false });

  function endDrag () {
    if (!dragging) return;
    dragging = false;

    const shouldClose = dragOffset > drawer.offsetHeight * DISMISS_DISTANCE || speed > DISMISS_SPEED;
    // Volta às transições do CSS: a partir da posição atual, desliza até fechar ou de volta ao lugar
    drawer.style.transition = '';
    drawer.style.transform = '';
    backdrop.style.transition = '';
    backdrop.style.opacity = '';
    if (shouldClose) close();
  }

  drawer.addEventListener('touchend', endDrag);
  drawer.addEventListener('touchcancel', endDrag);

  closeButton.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  return sheet;
}

export { createSheet };
export type { Sheet };
