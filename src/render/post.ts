import * as THREE from 'three';
import { tuning } from '../core/tuning';

/** The post look is only for the high preset, and only when the player has it switched on. */
export const postActive = (graphics: 'low' | 'high', inkLook: boolean): boolean => graphics === 'high' && inkLook && tuning.post.enabled.value > 0.5;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 texel;
uniform float near;
uniform float far;
uniform float outline;
uniform float width;
uniform float threshold;
uniform float vignette;
uniform float tilt;
uniform float saturation;
uniform vec3 ink;
varying vec2 vUv;

float lin(vec2 uv) {
  float z = texture2D(tDepth, uv).x;
  return (near * far) / (far - z * (far - near));
}

void main() {
  vec2 uv = vUv;
  vec3 c = texture2D(tColor, uv).rgb;
  // tilt-shift: blur grows away from a horizontal band in the middle of the screen
  float band = smoothstep(0.18, 0.5, abs(uv.y - 0.5));
  float blur = tilt * band;
  if (blur > 0.01) {
    vec3 acc = c;
    for (int i = 0; i < 6; i++) {
      float a = float(i) * 1.0472;
      vec2 o = vec2(cos(a), sin(a)) * texel * 6.0 * blur;
      acc += texture2D(tColor, uv + o).rgb;
    }
    c = acc / 7.0;
  }
  // ink outline from depth discontinuities (relative, so it works near and far)
  if (outline > 0.001) {
    float d = lin(uv);
    vec2 w = texel * width;
    float dl = lin(uv + vec2(-w.x, 0.0)), dr = lin(uv + vec2(w.x, 0.0));
    float du = lin(uv + vec2(0.0, w.y)), dd = lin(uv + vec2(0.0, -w.y));
    float edge = max(max(abs(dl - d), abs(dr - d)), max(abs(du - d), abs(dd - d))) / max(d, 1.0);
    float fade = 1.0 - smoothstep(250.0, 700.0, d); // no lines on the far haze
    float e = smoothstep(threshold, threshold * 2.5, edge) * outline * fade;
    c = mix(c, ink * c * 1.4, e);
  }
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, saturation);
  vec2 q = uv - 0.5;
  c *= 1.0 - vignette * smoothstep(0.25, 0.85, dot(q, q) * 2.2);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * Scene -> a half-float target (with a depth texture) -> one full-screen pass: ink outline, soft vignette,
 * a touch of grading and an optional tilt-shift blur, then tone mapping and sRGB. High preset only.
 */
export class Post {
  private target: THREE.WebGLRenderTarget;
  private mat: THREE.ShaderMaterial;
  private quad: THREE.Mesh;
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private scene = new THREE.Scene();

  constructor(private renderer: THREE.WebGLRenderer) {
    this.target = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    this.target.depthTexture = new THREE.DepthTexture(4, 4);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tColor: { value: this.target.texture },
        tDepth: { value: this.target.depthTexture },
        texel: { value: new THREE.Vector2() },
        near: { value: 0.1 },
        far: { value: 1000 },
        outline: { value: 0 },
        width: { value: 1 },
        threshold: { value: 0.05 },
        vignette: { value: 0 },
        tilt: { value: 0 },
        saturation: { value: 1 },
        ink: { value: new THREE.Color(0x4a3a6a) },
      },
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  resize(): void {
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.target.setSize(size.x, size.y);
    this.mat.uniforms.texel.value.set(1 / size.x, 1 / size.y);
  }

  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    const r = this.renderer;
    const p = tuning.post;
    const u = this.mat.uniforms;
    u.near.value = camera.near;
    u.far.value = camera.far;
    u.outline.value = p.outline.value;
    u.width.value = p.width.value;
    u.threshold.value = p.threshold.value;
    u.vignette.value = p.vignette.value;
    u.tilt.value = p.tilt.value;
    u.saturation.value = p.saturation.value;
    r.info.autoReset = false;
    r.info.reset();
    r.setRenderTarget(this.target);
    r.render(scene, camera);
    r.setRenderTarget(null);
    r.render(this.scene, this.cam);
  }

  /** Back to the normal one-pass render (the info counters reset on every render again). */
  release(): void {
    this.renderer.info.autoReset = true;
  }

  dispose(): void {
    this.target.dispose();
    this.target.depthTexture?.dispose();
    this.mat.dispose();
    this.quad.geometry.dispose();
  }
}
