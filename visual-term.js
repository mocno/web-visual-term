class V3d {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static add(a, b) {
    return new V3d(a.x + b.x, a.y + b.y, a.z + b.z);
  }

  static sub(a, b) {
    return new V3d(a.x - b.x, a.y - b.y, a.z - b.z);
  }

  static scale(a, k) {
    return new V3d(a.x * k, a.y * k, a.z * k);
  }

  static dot(v, w) {
    return v.x * w.x + v.y * w.y + v.z * w.z;
  }

  norm() {
    return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
  }

  normalize() {
    return V3d.scale(this, 1 / this.norm());
  }

  toString() {
    return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)}, ${this.z.toFixed(2)})`;
  }
}

class Visual {
  BASIC_CHAR = "_";
  CHARS = Array.from({ length: 94 }).map((_, i) => String.fromCharCode(i + 32));

  /**
   *
   * @param {HTMLDivElement} terminal
   */
  constructor(terminal) {
    this.width = null;
    this.height = null;
    this.terminal = terminal;
    this.content = terminal.innerText;
  }

  start() {
    window.addEventListener("resize", this.onResize.bind(this));
    this.terminal.addEventListener("mousemove", this.onMouseMove.bind(this));

    let brightness = {};
    for (let char of this.CHARS) {
      brightness[char] = this.getBrightnessOfChar(char);
    }

    this.CHARS = this.CHARS.sort((a, b) => brightness[b] - brightness[a]);
    this.onResize();
  }

  SPHERES = [
    { center: new V3d(0, 2, 0), radius: 1 },
    { center: new V3d(0, -2, 0), radius: 1 },
  ];

  CAM_POSITION = new V3d(5, 0, 0);
  CAM_PLANE = 3;

  LIGHT_POSITION = new V3d(5, 1, 0);

  drawPixel(x, y) {
    let value = 0;
    let screenPoint = new V3d(this.CAM_PLANE, x, y);
    let v = V3d.sub(screenPoint, this.CAM_POSITION).normalize();

    for (let i = 0; i < this.SPHERES.length; i++) {
      let sphere = this.SPHERES[i];
      let w = V3d.sub(sphere.center, this.CAM_POSITION);

      let proj = V3d.scale(v, V3d.dot(v, w));
      let norm = V3d.sub(proj, w).norm();

      if (norm <= sphere.radius) {
        let contact_point = V3d.add(
          this.CAM_POSITION,
          V3d.add(
            proj,
            V3d.scale(v, -Math.sqrt(sphere.radius ** 2 - norm ** 2)),
          ),
        );

        let valor =
          V3d.dot(
            V3d.sub(contact_point, sphere.center),
            V3d.sub(this.LIGHT_POSITION, contact_point).normalize(),
          ) / sphere.radius;

        value = Math.max(valor, value, 1 / this.CHARS.length);
      }
    }

    return this.CHARS[
      Math.max(
        Math.min(Math.floor(value * this.CHARS.length), this.CHARS.length - 1),
        0,
      )
    ];
  }

  generateContent() {
    this.terminal.innerText = this.BASIC_CHAR.repeat(this.width * this.height);

    let minLength =
      1 / Math.min(this.terminal.clientWidth, this.terminal.clientHeight);

    let y;
    let x;

    let content = "";
    for (let j = 0; j < this.height; j++) {
      y = (2 * j) / (this.height - 1) - 1;
      for (let i = 0; i < this.width; i++) {
        x = (2 * i) / (this.width - 1) - 1;

        content += this.drawPixel(
          x * this.terminal.clientWidth * minLength,
          y * this.terminal.clientHeight * minLength,
        );
      }
      content += "\n";
    }

    return content;
  }

  draw() {
    this.content = this.generateContent();
    this.terminal.innerText = this.content;
  }

  onResize() {
    this.width = this.getMaxOfCharPerLine();
    this.height = 31;

    this.draw();
  }

  onMouseMove(event) {
    let theta = V3d.scale(
      new V3d(
        0,
        event.offsetX - this.terminal.clientWidth / 2,
        event.offsetY - this.terminal.clientHeight / 2,
      ),
      10 / Math.min(this.terminal.clientHeight, this.terminal.clientWidth),
    );

    this.LIGHT_POSITION = V3d.add(theta, this.CAM_POSITION);
    this.draw();
  }

  /**
   * Get max of char per line in monospaced div
   * @param {HTMLDivElement} terminal
   * @returns
   */
  getMaxOfCharPerLine() {
    let innerHTML = this.terminal.innerHTML;

    this.terminal.innerHTML = this.BASIC_CHAR;

    let inicialHeight = this.terminal.clientHeight;

    let count = 2;
    for (; inicialHeight === this.terminal.clientHeight && count < 1000; ) {
      this.terminal.textContent = this.BASIC_CHAR.repeat(count++);
    }

    this.terminal.innerHTML = innerHTML;

    return count - 2;
  }

  getBrightnessOfChar(char, size = 20) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = size;
    canvas.height = size;

    ctx.font = `${size}px monospaced`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(char, canvas.width / 2, canvas.height / 2);

    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let colorSum = 0;

    for (let i = 3; i < data.length; i += 4) {
      colorSum -= data[i] > 255 / 2 ? 255 : 0;
    }

    return colorSum / (canvas.width * canvas.height);
  }
}

function starter() {
  const terminal = document.getElementById("terminal");

  const visual = new Visual(terminal);

  visual.start();
}

window.addEventListener("load", starter);
