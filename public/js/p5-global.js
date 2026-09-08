// Efecto p5.js global para todas las páginas
// Este script debe cargarse en todas las páginas donde se quiera el efecto

(function() {
  // Configuración
  const TEXT_SIZE = 30;
  const BG_ALPHA = 50;
  const SPAWN_RADIUS_MIN = 20;
  const SPAWN_RADIUS_MAX = 100;
  const MAX_SPEED = 4;
  const MAX_FORCE = 0.6;
  const REPULSION_RADIUS = 5;
  const LIFESPAN_DECAY_MIN = 1.0;
  const LIFESPAN_DECAY_MAX = 2.5;
  const MOUSE_FORCE_MULT = 1.1;
  const MOUSE_FORCE_MIN = 0.2;
  const MOUSE_FORCE_MAX = 2;
  const DISPERSION_MIN = 0;
  const DISPERSION_MAX = 0.5;
  const SPAWN_COUNT_MIN = 1;
  const SPAWN_COUNT_MAX = 2;
  const COLOR_1 = '#40c4ff';
  const COLOR_2 = '#ff9100';
  const COLOR_3 = '#e040fb';
  const COLOR_4 = '#00e676';
  const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#%&*+-/;:,.";

  let particles = [];
  let palette = [];
  let canvas;

  function setup() {
    canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('p5-global-canvas');
    canvas.style('position', 'fixed');
    canvas.style('top', '0');
    canvas.style('left', '0');
    canvas.style('z-index', '0');
    canvas.style('pointer-events', 'none');
    textFont('monospace');
    textSize(TEXT_SIZE);
    textAlign(CENTER, CENTER);

    palette = [
      color(COLOR_1),
      color(COLOR_2),
      color(COLOR_3),
      color(COLOR_4)
    ];
  }

  function draw() {
    background(10, BG_ALPHA);

    let mouseVel = createVector(mouseX - pmouseX, mouseY - pmouseY);
    let speed = mouseVel.mag();
    
    if (speed > 0.5) {
      let spawnCount = floor(map(constrain(speed, 0, 50), 0, 50, SPAWN_COUNT_MIN, SPAWN_COUNT_MAX));
      if (speed === 0) spawnCount = SPAWN_COUNT_MIN;

      for (let i = 0; i < spawnCount; i++) {
        let angle = random(TWO_PI);
        let r = random(SPAWN_RADIUS_MIN, SPAWN_RADIUS_MAX);
        let spawnX = mouseX + cos(angle) * r;
        let spawnY = mouseY + sin(angle) * r;
        
        particles.push(new Particle(spawnX, spawnY, mouseVel));
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i];
      p.applyRepulsion(particles);
      p.update();
      p.display();
      
      if (p.isDead()) {
        particles.splice(i, 1);
      }
    }
  }

  function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
  }

  class Particle {
    constructor(x, y, mVel) {
      this.pos = createVector(x, y);
      
      let dir = mVel.copy(); 
      let speedMult = constrain(mVel.mag() * MOUSE_FORCE_MULT, MOUSE_FORCE_MIN, MOUSE_FORCE_MAX);
      
      if (dir.magSq() > 0) {
        dir.normalize();
      } else {
        dir = p5.Vector.random2D();
      }
      
      this.vel = p5.Vector.add(dir.mult(speedMult), p5.Vector.random2D().mult(random(DISPERSION_MIN, DISPERSION_MAX)));
      this.acc = createVector(0, 0);
      
      this.lifespan = 255;
      this.decay = random(LIFESPAN_DECAY_MIN, LIFESPAN_DECAY_MAX); 
      this.char = CHARACTERS.charAt(floor(random(CHARACTERS.length)));
      
      let colorPos = random(1);
      if (colorPos < 0.33) {
        this.baseColor = lerpColor(palette[0], palette[1], map(colorPos, 0, 0.33, 0, 1));
      } else if (colorPos < 0.66) {
        this.baseColor = lerpColor(palette[1], palette[2], map(colorPos, 0.33, 0.66, 0, 1));
      } else {
        this.baseColor = lerpColor(palette[2], palette[3], map(colorPos, 0.66, 1, 0, 1));
      }
    }

    applyRepulsion(others) {
      let steer = createVector(0, 0);
      let count = 0;

      for (let other of others) {
        if (other !== this) {
          let d = p5.Vector.dist(this.pos, other.pos);
          if (d > 0 && d < REPULSION_RADIUS) {
            let diff = p5.Vector.sub(this.pos, other.pos);
            diff.normalize();
            diff.div(d); 
            steer.add(diff);
            count++;
          }
        }
      }

      if (count > 0) {
        steer.div(count);
        steer.normalize();
        steer.mult(MAX_SPEED);
        steer.sub(this.vel);
        steer.limit(MAX_FORCE);
        this.acc.add(steer);
      }
    }

    update() {
      this.vel.add(this.acc);
      this.vel.limit(MAX_SPEED);
      this.pos.add(this.vel);
      this.acc.mult(0);
      this.lifespan -= this.decay;
    }

    display() {
      this.baseColor.setAlpha(this.lifespan);
      fill(this.baseColor); 
      textSize(TEXT_SIZE);
      text(this.char, this.pos.x, this.pos.y);
    }

    isDead() {
      return this.lifespan <= 0;
    }
  }

  // Iniciar cuando p5 esté listo
  if (typeof p5 !== 'undefined') {
    new p5();
  }
})();
