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

  static dot(v, w) {
    return v.x * w.x + v.y * w.y + v.z * w.z;
  }

  static cross(v, w) {
    return new V3d(
      v.y * w.z - v.z * w.y,
      v.z * w.x - v.x * w.z,
      v.x * w.y - v.y * w.x,
    );
  }

  scale(k) {
    return new V3d(this.x * k, this.y * k, this.z * k);
  }

  norm() {
    return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
  }

  normalize() {
    return this.scale(1 / this.norm());
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
  CHARS = Array.from({ length: 94 }).map((_, i) => String.fromCharCode(i + 33));
  // ".,:ilwW".split("");
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
    this.terminal.addEventListener("wheel", this.onWheel.bind(this));
    this.terminal.addEventListener("mousemove", this.onMouseMove.bind(this));

    let brightness = {};
    for (let char of this.CHARS) {
      brightness[char] = this.#getBrightnessOfChar(char);
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

    for (let i = 0; i < 5; i++) {
      this.SPHERES.push({
        center: new V3d(
          (2 * Math.random() - 1) * 6,
          (2 * Math.random() - 1) * 6,
          (2 * Math.random() - 1) * 6,
        ),
        radius: Math.random() * 1.5 + 0.5,
      });
    }

    this.onResize();
  }

  SPHERES = [];

  CAM_POSITION = new V3d(15, 0, 0);
  CAM_DIRECTION = new V3d(-1, 0, 0);

  LIGHT_POSITION = new V3d(0, 0, 0);

  drawPixel(direction) {
    let result = this.SPHERES.map((sphere) => {
      let w = V3d.sub(sphere.center, this.CAM_POSITION);

      let proj = direction.scale(V3d.dot(direction, w));
      let norm = V3d.sub(proj, w).norm();
      let contactPoint;

      if (norm <= sphere.radius) {
        contactPoint = V3d.add(
          this.CAM_POSITION,
          V3d.add(
            proj,
            direction.scale(-Math.sqrt(sphere.radius ** 2 - norm ** 2)),
          ),
        );
      } else {
        contactPoint = null;
      }

      return [contactPoint, sphere];
    });

    let [contactPoint, sphere] = result.reduce(
      (accumulator, current) =>
        accumulator[0] != null &&
        (current[0] == null ||
          V3d.sub(accumulator[0], this.CAM_POSITION).norm() <
            V3d.sub(this.CAM_POSITION, current[0]).norm())
          ? accumulator
          : current,
      [null, null],
    );

    if (contactPoint === null) {
      return this.BACKGROUND_CHAR;
    }

    let value =
      V3d.dot(
        V3d.sub(contactPoint, sphere.center),
        V3d.sub(this.LIGHT_POSITION, contactPoint).normalize(),
      ) / sphere.radius;

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
    this.terminal.innerText = this.BACKGROUND_CHAR.repeat(
      this.width * this.height,
    );

    let b1 = V3d.cross(this.CAM_DIRECTION, new V3d(0, 0, 1)).normalize();
    let b2 = V3d.cross(this.CAM_DIRECTION, b1).normalize();

    let x, y, direction;

    let content = "";
    for (let j = 0; j < this.height; j++) {
      y = (2 * j) / (this.height - 1) - 1;
      for (let i = 0; i < this.width; i++) {
        x = (2 * i) / (this.width - 1) - 1;
        direction = V3d.add(
          this.CAM_DIRECTION,
          V3d.add(b1.scale(x), b2.scale(y)),
        ).normalize();

        content += this.drawPixel(direction);
      }
      content += "\n";
    }

    return content;
  }

  draw() {
    this.terminal.textContent = this.generateContent();
  }

  onResize() {
    this.width = Math.floor(this.terminal.clientWidth / this.CHAR_WIDTH);
    this.height = Math.floor(this.terminal.clientHeight / this.CHAR_HEIGHT);

    this.draw();
  }

  CAM_X_ROTATION = 0;
  CAM_DISTANCE = 14;

  onMouseMove(_event) {}
  onWheel(event) {
    if (event.shiftKey) {
      this.CAM_DISTANCE += event.deltaY / 100;
    } else {
      this.CAM_X_ROTATION += event.deltaY / 1000;
    }

    this.#recalculateCamCords();
  }

  #recalculateCamCords() {
    let rotationVector = new V3d(
      Math.cos(this.CAM_X_ROTATION),
      Math.sin(this.CAM_X_ROTATION),
      0,
    );

    this.CAM_POSITION = rotationVector.scale(-this.CAM_DISTANCE);
    this.CAM_DIRECTION = rotationVector;
    this.draw();
  }

  #getBrightnessOfChar(char, size = 20) {
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

    const style = this.#generateStyle();
    shadow.appendChild(style);

    this.visual = new Visual(this.terminal);
    window.addEventListener("load", () => this.visual.start());
  }

  static get observedAttributes() {
    return ["width", "height"];
  }

  #generateStyle() {
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
