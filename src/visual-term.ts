class V3d {
  z: number;
  x: number;
  y: number;

  static zero = new V3d(0, 0, 0);

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

type Hit = {
  object_: Sphere;
  hitPoint: V3d;
  normal: V3d;
};

const CHARS: string = "█▉▊▋▌▍▎▏";
// "░▒▓█";
// ".,:ilwW";
// Array.from({ length: 94 })
//   .map((_, i) => String.fromCharCode(i + 33))
//   .join();
//
class Visual {
  BACKGROUND_CHAR: string = " ";

  CHAR_HEIGHT: number = 25;
  CHAR_WIDTH: number = 12;

  chars: string;
  brightness: number[];

  width: number | null = null;
  height: number | null = null;
  terminal: HTMLElement;

  // Scene
  // Camera
  CAM_POSITION = new V3d(-8, 0, 0);
  CAM_X_ROTATION = 0;
  // light
  LIGHT_POSITION = new V3d(0, -4, 0);
  SPHERES: Sphere[] = [
    {
      center: new V3d(0, -2, 0),
      radius: 0.5,
    },
    {
      center: new V3d(0, 3, 0),
      radius: 2,
    },
  ];

  constructor(terminal: HTMLElement, chars: string = CHARS) {
    this.terminal = terminal;
    [this.chars, this.brightness] = this.processChars(chars);
  }

  protected processChars(chars: string): [string, number[]] {
    let brightness: { [char: string]: number } = {};
    let minBrightness = Infinity;
    let maxBrightness = -Infinity;

    for (let char of chars) {
      brightness[char] = this.getBrightnessOfChar(char);
      minBrightness = Math.min(minBrightness, brightness[char]);
      maxBrightness = Math.max(maxBrightness, brightness[char]);
    }

    let rangeBrightness = maxBrightness - minBrightness;

    for (let char of chars) {
      brightness[char] = (brightness[char] - minBrightness) / rangeBrightness;
    }

    chars = chars
      .split("")
      .sort((a, b) => brightness[a] - brightness[b])
      .join("");

    let brightnessResponse = [];
    for (let char of chars) {
      brightnessResponse.push(brightness[char]);
    }

    return [chars, brightnessResponse];
  }

  start() {
    window.addEventListener("resize", this.onResize.bind(this));
    this.terminal.addEventListener("wheel", this.onWheel.bind(this));
    document.addEventListener("keydown", this.onKeyPress.bind(this));
    this.terminal.addEventListener("mousemove", this.onMouseMove.bind(this));

    this.draw();
  }

  private raycasting(initialPoint: V3d, direction: V3d): Hit | null {
    let hit = this.SPHERES.reduce(
      (accumulator: Hit | null, object_: Sphere) => {
        let sphereDirection = V3d.sub(object_.center, initialPoint);
        let a = V3d.dot(direction, sphereDirection);
        if (a < 0) {
          return accumulator;
        }
        let projection = direction.scale(a);
        let distance = V3d.sub(projection, sphereDirection).norm();

        if (distance <= object_.radius) {
          let hitPoint = V3d.add(
            direction.scale(-Math.sqrt(object_.radius ** 2 - distance ** 2)),
            V3d.add(projection, initialPoint),
          );

          if (
            accumulator == null ||
            V3d.sub(accumulator.hitPoint, initialPoint).norm() >
              V3d.sub(hitPoint, initialPoint).norm()
          ) {
            return { hitPoint, object_, normal: V3d.zero } as Hit;
          }
        }

        return accumulator;
      },
      null,
    );

    if (hit === null) {
      return null;
    }

    hit.normal = V3d.sub(hit.hitPoint, hit.object_.center).scale(
      1 / hit.object_.radius,
    );

    return hit;
  }

  private drawPixel(direction: V3d) {
    let hit = this.raycasting(this.CAM_POSITION, direction);

    if (hit === null) {
      return this.BACKGROUND_CHAR;
    }

    let directionToLight = V3d.sub(
      this.LIGHT_POSITION,
      hit.hitPoint,
    ).normalize();

    let lightHit = this.raycasting(hit.hitPoint, directionToLight);

    if (
      lightHit != null &&
      V3d.sub(hit.hitPoint, this.LIGHT_POSITION).norm() >
        V3d.sub(hit.hitPoint, lightHit.hitPoint).norm()
    ) {
      return this.getPixelByBrightness(0);
    }

    let value = V3d.dot(hit.normal, directionToLight);
    return this.getPixelByBrightness(value);
  }

  private getPixelByBrightness(brightness: number) {
    if (brightness <= 0) {
      return this.chars[0];
    }
    let index = binarySearch(this.brightness, brightness);
    let char = this.chars[index];
    return char;
  }

  private get camDirection() {
    return new V3d(
      Math.cos(this.CAM_X_ROTATION),
      Math.sin(this.CAM_X_ROTATION),
      0,
    );
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

    let camDirection = this.camDirection;

    let b1 = V3d.cross(camDirection, new V3d(0, 0, 1)).normalize();
    let b2 = V3d.cross(camDirection, b1).normalize();

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
          camDirection,
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
    this.draw();
  }

  onMouseMove(_event: MouseEvent) {}
  onWheel(event: WheelEvent) {
    this.CAM_X_ROTATION += event.deltaY / 1000;
    this.draw();
  }
  onKeyPress(event: KeyboardEvent) {
    let camDirection = this.camDirection;

    if (event.key === "ArrowUp") {
      this.CAM_POSITION = V3d.add(this.CAM_POSITION, camDirection);
    } else if (event.key === "ArrowDown") {
      this.CAM_POSITION = V3d.sub(this.CAM_POSITION, camDirection);
    } else if (event.key === "ArrowLeft") {
      this.CAM_POSITION = V3d.sub(
        this.CAM_POSITION,
        V3d.cross(camDirection, new V3d(0, 0, 1)),
      );
    } else if (event.key === "ArrowRight") {
      this.CAM_POSITION = V3d.add(
        this.CAM_POSITION,
        V3d.cross(camDirection, new V3d(0, 0, 1)),
      );
    }

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
