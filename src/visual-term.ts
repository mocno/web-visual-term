class V3d {
  z: number;
  x: number;
  y: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static add(v1: V3d, v2: V3d) {
    return new V3d(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z);
  }

  static sub(v1: V3d, v2: V3d) {
    return new V3d(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z);
  }

  static dot(v1: V3d, v2: V3d) {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  }

  static cross(v1: V3d, v2: V3d) {
    return new V3d(
      v1.y * v2.z - v1.z * v2.y,
      v1.z * v2.x - v1.x * v2.z,
      v1.x * v2.y - v1.y * v2.x,
    );
  }

  scale(value: number): V3d {
    return new V3d(this.x * value, this.y * value, this.z * value);
  }

  norm(): number {
    return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
  }

  normalize(): V3d {
    return this.scale(1 / this.norm());
  }
}

function binarySearch(list: number[], key: number): number {
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

type Sphere = {
  center: V3d;
  radius: number;
};

class Visual {
  BACKGROUND_CHAR: string = " ";
  CHARS: string = Array.from({ length: 94 })
    .map((_, i) => String.fromCharCode(i + 33))
    .join();

  // ".,:ilwW"
  CHAR_HEIGHT: number = 25;
  CHAR_WIDTH: number = 12;
  BRIGHTNESS: number[] = [];

  width: number | null = null;
  height: number | null = null;
  terminal: HTMLElement;

  constructor(terminal: HTMLElement) {
    this.terminal = terminal;
  }

  start() {
    window.addEventListener("resize", this.onResize.bind(this));
    this.terminal.addEventListener("wheel", this.onWheel.bind(this));
    this.terminal.addEventListener("mousemove", this.onMouseMove.bind(this));

    let brightness: {
      [char: string]: number;
    } = {};
    let minBrightness = Infinity;
    let maxBrightness = -Infinity;

    for (let char of this.CHARS) {
      brightness[char] = this.getBrightnessOfChar(char);
      minBrightness = Math.min(minBrightness, brightness[char]);
      maxBrightness = Math.max(maxBrightness, brightness[char]);
    }

    let rangeBrightness = maxBrightness - minBrightness;

    for (let char of this.CHARS) {
      brightness[char] = (brightness[char] - minBrightness) / rangeBrightness;
    }

    this.CHARS = this.CHARS.split("")
      .sort((a, b) => brightness[a] - brightness[b])
      .join("");
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

    this.calculateCamCords();
    this.draw();
  }

  SPHERES: Sphere[] = [];

  CAM_POSITION = new V3d(15, 0, 0);
  CAM_DIRECTION = new V3d(-1, 0, 0);

  LIGHT_POSITION = new V3d(0, 0, 0);

  raycasting(direction: V3d) {
    return this.SPHERES.reduce(
      (
        accumulator: null | { contactPoint: V3d; sphere: Sphere },
        sphere: Sphere,
      ) => {
        let w = V3d.sub(sphere.center, this.CAM_POSITION);

        let proj = direction.scale(V3d.dot(direction, w));
        let distance = V3d.sub(proj, w).norm();

        if (distance <= sphere.radius) {
          let contactPoint = V3d.add(
            direction.scale(-Math.sqrt(sphere.radius ** 2 - distance ** 2)),
            V3d.add(proj, this.CAM_POSITION),
          );

          if (
            accumulator == null ||
            V3d.sub(accumulator.contactPoint, this.CAM_POSITION).norm() >
              V3d.sub(contactPoint, this.CAM_POSITION).norm()
          ) {
            return { contactPoint, sphere };
          }
        }

        return accumulator;
      },
      null,
    );
  }

  private drawPixel(direction: V3d) {
    let result = this.raycasting(direction);

    if (result === null) {
      return this.BACKGROUND_CHAR;
    }

    let { contactPoint, sphere } = result;

    let value =
      -V3d.dot(
        V3d.sub(sphere.center, contactPoint),
        V3d.sub(this.LIGHT_POSITION, contactPoint).normalize(),
      ) / sphere.radius;

    return this.getPixelByBrightness(value);
  }

  private getPixelByBrightness(brightness: number) {
    if (brightness < 0) {
      return this.CHARS[0];
    }
    let index = binarySearch(this.BRIGHTNESS, brightness);
    let char = this.CHARS[index];
    return char;
  }

  private generateContent() {
    if (this.width == null || this.height == null) {
      this.width = Math.floor(this.terminal.clientWidth / this.CHAR_WIDTH);
      this.height = Math.floor(this.terminal.clientHeight / this.CHAR_HEIGHT);
    }

    this.terminal.innerText = this.BACKGROUND_CHAR.repeat(
      this.width * this.height,
    );

    let minLength = Math.min(
      this.terminal.clientWidth,
      this.terminal.clientHeight,
    );

    let b1 = V3d.cross(this.CAM_DIRECTION, new V3d(0, 0, 1)).normalize();
    let b2 = V3d.cross(this.CAM_DIRECTION, b1).normalize();

    let x: number, y: number, direction: V3d;

    let content = "";
    for (let j = 0; j < this.height; j++) {
      y =
        (((2 * j) / (this.height - 1) - 1) * this.terminal.clientHeight) /
        minLength;
      for (let i = 0; i < this.width; i++) {
        x =
          (((2 * i) / (this.width - 1) - 1) * this.terminal.clientWidth) /
          minLength;
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
    this.width = this.height = null;
    this.calculateCamCords();
    this.draw();
  }

  CAM_X_ROTATION = 0;
  CAM_DISTANCE = 14;

  onMouseMove(_event: MouseEvent) {}
  onWheel(event: WheelEvent) {
    if (event.shiftKey) {
      this.CAM_DISTANCE += event.deltaY / 100;
    } else {
      this.CAM_X_ROTATION += event.deltaY / 1000;
    }

    this.calculateCamCords();
  }

  private calculateCamCords(): any {
    let rotationVector = new V3d(
      Math.cos(this.CAM_X_ROTATION),
      Math.sin(this.CAM_X_ROTATION),
      0,
    );

    this.CAM_POSITION = rotationVector.scale(-this.CAM_DISTANCE);
    this.CAM_DIRECTION = rotationVector;
    this.draw();
  }

  private getBrightnessOfChar(char: string, size: number = 20): number {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

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

    let terminal = document.createElement("div");
    terminal.classList.add("terminal");
    shadow.appendChild(terminal);

    const style = this.generateStyle();
    shadow.appendChild(style);

    let visual = new Visual(terminal);
    window.addEventListener("load", () => visual.start());
  }

  static get observedAttributes() {
    return ["width", "height"];
  }

  private generateStyle() {
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
    }`;

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

  attributeChangedCallback(
    _name: string,
    _oldValue: string,
    _newValue: string,
  ) {
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
