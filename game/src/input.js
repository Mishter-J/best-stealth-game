// Keyboard and mouse state, kept apart from the game so the autopilot can
// drive the same game with synthetic input and the tests can do the same.
export class Input {
  constructor() {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };
    this.anyKey = false;
  }

  attach(canvas) {
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
      this.keys.add(event.key.toLowerCase());
      this.anyKey = true;
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = event.clientX - rect.left;
      this.mouse.y = event.clientY - rect.top;
    });
    canvas.addEventListener('mousedown', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = event.clientX - rect.left;
      this.mouse.y = event.clientY - rect.top;
      this.mouse.clicked = true;
      this.mouse.clickX = this.mouse.x;
      this.mouse.clickY = this.mouse.y;
    });
  }

  down(...names) {
    return names.some((name) => this.keys.has(name));
  }

  /** Move direction from WASD or arrows, as a unit vector (or 0, 0). */
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down('a', 'arrowleft')) x -= 1;
    if (this.down('d', 'arrowright')) x += 1;
    if (this.down('w', 'arrowup')) y -= 1;
    if (this.down('s', 'arrowdown')) y += 1;
    if (x !== 0 && y !== 0) {
      const len = Math.hypot(x, y);
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  get sneak() {
    return this.down('shift');
  }

  get sprint() {
    return this.down(' ');
  }

  /** True once after a key press; callers clear it by reading. */
  consumeAnyKey() {
    const pressed = this.anyKey;
    this.anyKey = false;
    return pressed;
  }

  consumeClick() {
    const clicked = this.mouse.clicked;
    this.mouse.clicked = false;
    return clicked ? { x: this.mouse.clickX, y: this.mouse.clickY } : null;
  }
}

/** Synthetic input for the screenshot autopilot: same shape, scripted values. */
export function scriptedInput(moveX, moveY, sneak, sprint) {
  return {
    moveVector: () => ({ x: moveX, y: moveY }),
    sneak,
    sprint,
    consumeAnyKey: () => false,
    consumeClick: () => null,
  };
}
