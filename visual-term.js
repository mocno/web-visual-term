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

function binarySearch(list, key) {
  let start = 0,
    end = list.length - 1;

  while (start <= end) {
    let mid = Math.floor((start + end) / 2);

    if (list[mid] === key) {
      return mid;
    } else if (list[mid] < key) {
      start = mid + 1;
    } else {
      end = mid - 1;
    }
  }

  return start;
}

class Visual {
  BACKGROUND_CHAR = " ";
  BASIC_CHAR = "_";
  CHARS = Array.from({ length: 94 }).map((_, i) => String.fromCharCode(i + 33));
  CHAR_HEIGHT = 25;
  CHAR_WIDTH = 12;

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

    let minBrightness = Math.min(...Object.values(brightness));
    let rangeBrightness =
      Math.max(...Object.values(brightness)) - minBrightness;

    for (let char of this.CHARS) {
      brightness[char] = (brightness[char] - minBrightness) / rangeBrightness;
    }

    this.CHARS = this.CHARS.sort((a, b) => brightness[a] - brightness[b]);
    this.BRIGHTNESS = [];
    for (let char of this.CHARS) {
      this.BRIGHTNESS.push(brightness[char]);
    }

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
    let value = null;
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

        value =
          V3d.dot(
            V3d.sub(contact_point, sphere.center),
            V3d.sub(this.LIGHT_POSITION, contact_point).normalize(),
          ) / sphere.radius;
        break;
      }
    }

    if (value === null) {
      return this.BACKGROUND_CHAR;
    }

    return this.getPixelByBrightness(value);
  }

  getPixelByBrightness(brightness) {
    if (brightness < 0) {
      return this.CHARS[0];
    }
    let index = binarySearch(this.BRIGHTNESS, brightness);
    let char = this.CHARS[index];
    return char;
  }

  generateContent() {
    this.terminal.innerText = this.BASIC_CHAR.repeat(this.width * this.height);

    let minLength = Math.min(
      this.terminal.clientWidth,
      this.terminal.clientHeight,
    );

    let y;
    let x;

    let content = "";
    for (let j = 0; j < this.height; j++) {
      y = (2 * j) / (this.height - 1) - 1;
      for (let i = 0; i < this.width; i++) {
        x = (2 * i) / (this.width - 1) - 1;

        content += this.drawPixel(
          (x * this.terminal.clientWidth) / minLength,
          (y * this.terminal.clientHeight) / minLength,
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
    this.width = Math.floor(this.terminal.clientWidth / this.CHAR_WIDTH);
    this.height = Math.floor(this.terminal.clientHeight / this.CHAR_HEIGHT);

    this.draw();
  }

  onMouseMove(event) {
    let minLength = Math.min(
      this.terminal.clientWidth,
      this.terminal.clientHeight,
    );

    this.LIGHT_POSITION = new V3d(
      4,
      (4 * (event.offsetX - this.terminal.clientWidth / 2)) / minLength,
      (4 * (event.offsetY - this.terminal.clientHeight / 2)) / minLength,
    );

    this.draw();
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
      colorSum += data[i];
    }

    return colorSum / (255 * canvas.width * canvas.height);
  }
}

class HTMLVisualTermElement extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });

    this.terminal = document.createElement("div");
    this.terminal.classList.add("terminal");
    shadow.appendChild(this.terminal);

    const style = this.generateStyle();
    shadow.appendChild(style);

    this.visual = new Visual(this.terminal);
    window.addEventListener("load", () => this.visual.start());
  }

  static get observedAttributes() {
    return ["width", "height"];
  }

  generateStyle() {
    const styleElement = document.createElement("style");

    styleElement.innerText = `.terminal {
      background-color: #000000;
      color: #ffffff;
      width: 100%;
      height: 100%;
      font-family: monospace;
      word-break: break-word;
      white-space: pre-wrap;
      font-size: 20px;
      line-height: 25px;
    }`.replaceAll("\n", " ");

    return styleElement;
  }

  connectedCallback() {
    this.style.display = "block";

    let width = this.getAttribute("width");
    if (width != null) {
      this.style.width = width;
    }

    let height = this.getAttribute("height");
    if (height != null) {
      this.style.height = height;
    }
  }

  attributeChangedCallback(_name, _oldValue, _newValue) {
    let width = this.getAttribute("width");
    if (width != null) {
      this.style.width = width;
    }

    let height = this.getAttribute("height");
    if (height != null) {
      this.style.height = height;
    }
  }
}

window.customElements.define("visual-term", HTMLVisualTermElement);
