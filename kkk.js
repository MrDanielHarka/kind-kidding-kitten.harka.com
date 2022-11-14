const frameDuration = 0.2; // fow how long one frame is displayed in seconds
const catSize = 64; // size of the resulting cat in pixels
const catSpeed = 60; // [px/sec]
const stateDuration = 5;
const gravity = 200;
const jumpSpeed = 75;

class Animation {
  constructor(row, frames) {
    this.row = row;
    this.frames = frames;
  }
}

class Spritesheet {
  constructor(height, width, rows, columns, animations, url) {
    this.height = height;
    this.width = width;
    this.rows = rows;
    this.columns = columns;
    this.animations = animations;
    this.url = url;
  }

  load(f) {
    this.img = new Image();
    this.img.addEventListener('load', f, false);
    this.img.src = this.url;
  }

  getSprite(animationName, frameNumber) {
    const spriteWidth = this.width / this.columns;
    const spriteHeight = this.height / this.rows;

    const animation = this.animations[animationName];
    const sx = frameNumber * spriteWidth;
    const sy = animation.row * spriteHeight;

    return new Sprite(this.img, sx, sy, spriteWidth, spriteHeight);
  }
}

class Sprite {
  constructor(img, sx, sy, swidth, sheight) {
    this.img = img;
    this.sx = sx;
    this.sy = sy;
    this.swidth = swidth;
    this.sheight = sheight;
  }

  draw(ctx, dx, dy, dwidth, dheight) {
    ctx.drawImage(
      this.img,
      this.sx,
      this.sy,
      this.swidth,
      this.sheight,
      dx,
      dy,
      dwidth,
      dheight
    );
  }
}

class Frame {
  constructor(name) {
    this.name = name;
    this.frame = 0;
    this.counter = 0;
  }

  update(dt, numAnimations) {
    this.counter += dt;
    if (this.counter >= frameDuration) {
      this.counter = 0;
      this.frame++;
      if (this.frame >= numAnimations) {
        this.frame = 0;
      }
    }
  }
}

class AvailableState {
  constructor(animations, stateFunc, initFunc) {
    this.animations = animations;
    this.stateFunc = stateFunc;
    this.initFunc = initFunc;
  }
}

class Cat {
  constructor(spritesheet, canvas) {
    this.spritesheet = spritesheet;
    this.canvas = canvas;

    this.states = {
      idle: new AvailableState(
        ['idle1', 'idle2'],
        dt => this.stateIdle(dt),
        () => this.stateIdleInit()
      ),
      clean: new AvailableState(
        ['clean1', 'clean2'],
        dt => this.stateClean(dt),
        () => this.stateCleanInit()
      ),
      walk: new AvailableState(
        ['walk1', 'walk2'],
        dt => this.stateWalk(dt),
        () => this.stateWalkInit()
      ),
      sleep: new AvailableState(
        ['sleep'],
        dt => this.stateSleep(dt),
        () => this.stateSleepInit()
      ),
      paw: new AvailableState(
        ['paw'],
        dt => this.statePaw(dt),
        () => this.statePawInit()
      ),
      scared: new AvailableState(
        ['scared'],
        dt => this.stateScared(dt),
        () => this.stateScaredInit()
      ),
    };

    this.transitions = {
      idle: ['clean', 'walk', 'sleep'],
      clean: ['idle'],
      walk: ['idle'],
      sleep: ['idle'],
      paw: ['idle'],
      scared: ['idle'],
    };

    this.fixCanvas();

    this.faceRight = selectRandomElement([true, false]);
    this.x = Math.random() * (this.canvas.width - 2 * catSize) + catSize;
    this.y = this.canvas.height;
    this.speedY = 0;

    this.changeState('idle');

    this.mouseX = 0;
    this.mouseY = 0;

    document.body.addEventListener(
      'mousemove',
      e => {
        this.updateMousePosition(e);
      },
      false
    );

    document.body.addEventListener(
      'click',
      e => {
        this.updateMousePosition(e);
        this.clickCat();
      },
      false
    );
  }

  updateMousePosition(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;

    if (this.mouseIsNearCat()) {
      if (this.stateName != 'paw' && this.stateName != 'scared') {
        this.changeState('paw');
      }
    }

    if (!this.mouseIsNearCat()) {
      if (this.stateName == 'paw') {
        this.changeState('idle');
      }
    }
  }

  clickCat() {
    if (this.mouseIsNearCat()) {
      if (this.stateName != 'scared') {
        this.changeState('scared');
      }
    }
  }

  mouseIsNearCat() {
    const distance = catSize;
    if (Math.abs(this.mouseX - this.centerX()) < distance) {
      if (Math.abs(this.mouseY - this.centerY()) < distance) {
        return true;
      }
    }
    return false;
  }

  centerX() {
    return this.x - catSize / 2;
  }

  centerY() {
    return this.y;
  }

  fixCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  gravity(dt) {
    this.speedY += gravity * dt;
  }

  update(dt) {
    this.gravity(dt);

    this.state.stateFunc(dt);
    this.stateCounter -= dt;
    this.draw(dt);

    if (this.stateCounter < 0) {
      this.transitionToNextState();
    }

    this.y += this.speedY * dt;

    if (this.x < 0) {
      this.x = 0;
    }
    if (this.x > this.canvas.width) {
      this.x = this.canvas.width;
    }
    if (this.y > this.canvas.height) {
      this.y = this.canvas.height;
    }
    if (this.y < 0) {
      this.y = 0;
    }
  }

  draw(dt) {
    this.fixCanvas();
    this.frame.update(dt, this.spritesheet.animations[this.frame.name].frames);
    const ctx = this.canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const sprite = this.spritesheet.getSprite(
      this.frame.name,
      this.frame.frame
    );

    const catLeft = this.x - catSize / 2;
    const catTop = this.y - catSize;

    if (!this.faceRight) {
      ctx.scale(-1, 1);
      sprite.draw(ctx, -catLeft - catSize, catTop, catSize, catSize);
    } else {
      ctx.scale(1, 1);
      sprite.draw(ctx, catLeft, catTop, catSize, catSize);
    }
  }

  transitionToNextState() {
    const availableTransitions = this.transitions[this.stateName];
    const nextStateName = selectRandomElement(availableTransitions);
    this.changeState(nextStateName);
  }

  changeState(stateName) {
    this.stateCounter = stateDuration; // default state counter for all states
    this.stateName = stateName;
    this.state = this.states[stateName];
    this.frame = new Frame(selectRandomElement(this.state.animations));
    this.state.initFunc();
  }

  stateIdleInit() {}

  stateIdle(dt) {}

  stateCleanInit() {}

  stateClean(dt) {}

  stateWalkInit() {
    this.faceRight = selectRandomElement([true, false]);
  }

  stateWalk(dt) {
    const distance = dt * catSpeed;
    if (this.faceRight) {
      if (this.x + distance + catSize / 2 < this.canvas.width) {
        this.x += distance;
      } else {
        this.faceRight = false;
      }
    } else {
      if (this.x - distance - catSize / 2 > 0) {
        this.x -= distance;
      } else {
        this.faceRight = true;
      }
    }
  }

  stateSleepInit() {}

  stateSleep(dt) {}

  statePawInit() {}

  statePaw() {
    if (this.mouseX < this.x) {
      this.faceRight = false;
    } else {
      this.faceRight = true;
    }
  }

  stateScaredInit() {
    this.stateCounter = 1.6;
    this.speedY = -jumpSpeed;
  }

  stateScared(dt) {}
}

function cat(canvas) {
  const animations = {
    idle1: new Animation(0, 4),
    idle2: new Animation(1, 4),
    clean1: new Animation(2, 4),
    clean2: new Animation(3, 4),
    walk1: new Animation(4, 8),
    walk2: new Animation(5, 8),
    sleep: new Animation(6, 4),
    paw: new Animation(7, 6),
    jump: new Animation(8, 7),
    scared: new Animation(9, 8),
  };

  const spritesheet = new Spritesheet(
    256,
    320,
    8,
    10,
    animations,
    'https://kind-kidding-kitten.harka.com/kkk.png'
  );
  const cat = new Cat(spritesheet, canvas);

  spritesheet.load(() => {
    setInterval(function () {
      cat.update(0.033);
    }, 33);
  });
}

function initCat() {
  const canvas = document.getElementById('kindKiddingKitten');
  cat(canvas);
}

window.addEventListener('load', () => {
  document.body.append(
    Object.assign(document.createElement('canvas'), {
      id: 'kindKiddingKitten',
      // title: 'kind-kidding-kitten.harka.com',
      style: `width: ${document.body.clientWidth}px; height: 40px; position: fixed; bottom: 0; z-index: 2147483647;`,
    })
  );

  initCat();
});

window.addEventListener('resize', () => {
  document.getElementById(
    'kindKiddingKitten'
  ).style.width = `${document.body.clientWidth}px`;
});

function selectRandomElement(arr) {
  const i = Math.floor(Math.random() * arr.length);
  return arr[i];
}
