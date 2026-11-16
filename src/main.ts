import * as THREE from 'three';
import { startLoop } from './core/loop';
import { Input } from './core/input';
import { GamepadSource } from './core/gamepad';
import { makeSnapshot, type Snapshot } from './net/snapshot';
import { PeerLink } from './net/peer';
import { NetSession } from './net/session';
import { CoopCombo } from './gameplay/coopCombo';
import type { GameEvent } from './net/protocol';
import type { StatSummary } from './gameplay/levelStats';
import { Lobby } from './ui/lobby';
import { ControlsPanel } from './ui/controlsPanel';
import { MenuNav } from './ui/menuNav';
import { events } from './core/events';
import { tuning } from './core/tuning';
import { mods, staminaMax } from './core/skillMods';
import { addGroundPlane, createScene } from './render/scene';
import { Graphics, shadows } from './render/graphics';
import { Ripples, type Water } from './render/water';
import { palette } from './render/palette';
import { FollowCamera } from './render/camera';
import { Gull } from './gull/gull';
import { GULL_RADIUS, aimDiveAngle, divePreview, type FlightEvent } from './gull/flight';
import { windAt } from './gull/wind';
import { buildCourse, buildCourseVisuals } from './world/greybox';
import { buildCity } from './world/city';
import { World } from './world/collision';
import type { PropSpawn } from './gameplay/props';
import { Credits } from './ui/credits';
import { PhysicsWorld } from './physics/physics';
import { Interaction, type GagEvent } from './gameplay/interaction';
import { Reticle } from './render/reticle';
import { bestAimTarget, diveHits, updateTargets, type Target } from './gameplay/targets';
import { DiveMarker } from './render/diveMarker';
import { DebugPanel } from './ui/debugPanel';
import { Hud } from './ui/hud';
import { AudioManager } from './core/audio';
import { NpcManager } from './gameplay/npcs';
import { QuestLog, type QuestNote } from './gameplay/quest';
import { QUESTS } from './data/quests';
import { LEVELS, levelById } from './data/levels';
import { levelProgress, levelSetup, levelStars, levelUnlocked, mergeRecord, starCount } from './gameplay/level';
import { TOURIST_SPAWNS } from './data/npcs';
import type { NpcEvent } from './gameplay/npc';
import { Todo } from './ui/todo';
import { CityDefense, type DefenseEvent } from './gameplay/defense';
import { DETERRENT_NAMES, applyHit } from './gameplay/deterrents';
import type { HeatReason } from './gameplay/heat';
import type { Noise } from './gameplay/npc';
import { HeatMeter } from './ui/heatMeter';
import { Announce } from './ui/announce';
import { TriggerSystem, type PropView } from './gameplay/triggers';
import { TRIGGERS } from './data/triggers';
import { WRONG_FERRY } from './data/places';
import { LevelStats } from './gameplay/levelStats';
import { LevelComplete } from './ui/levelComplete';
import { activeMarkers } from './gameplay/questMarkers';
import type { Marker } from './data/quests';
import { MarkerPool } from './render/markers';
import { Waypoints } from './ui/waypoints';
import { SaveStore, type SaveData } from './core/save';
import { SkillSet } from './gameplay/skills';
import { Abilities, aheadOf } from './gameplay/abilities';
import { FlockSystem, PingFx } from './render/flock';
import { RunTimer, isBest } from './gameplay/runTimer';
import { MusicPlayer } from './core/music';
import { MusicDirector } from './gameplay/musicDirector';
import { OptionsStore, applyOptions } from './core/options';
import { StreetLife } from './world/streetLife';
import { LockMarker } from './render/lockMarker';
import { nextLock, rankCandidates, resolveLock, type LockCandidate } from './gameplay/lock';
import { POOP_TARGET_TAGS } from './data/props';
import { OptionsPanel, TitleScreen } from './ui/menus';
import { LevelSelect } from './ui/levelSelect';
import { Tutorial } from './gameplay/tutorial';
import { SKILLS } from './data/skills';
import { NpcModel } from './world/npcModel';
import { loadPeople } from './world/people';
import { GULL_SKINS, skinById, unlockedSkins } from './data/gullSkins';
import { TouchControls } from './ui/touchControls';
import { wantsTouch } from './core/touchMath';
import { HUD_NAMES, hudFlags, nextHudMode, type HudMode } from './ui/hudMode';
import { SkillsPanel, skinProgress } from './ui/skillsPanel';
import { RunHud } from './ui/runHud';

const app = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
app.appendChild(renderer.domElement);

const RAPIER = (await import('@dimforge/rapier3d-compat')).default;
await RAPIER.init();
// rigged people (CC0 Quaternius); without them the game falls back to simple capsule people
NpcModel.assets = await loadPeople(`${import.meta.env.BASE_URL}models/people/human.fbx`);
const phys = new PhysicsWorld(RAPIER);

const scene = createScene();
const graphics = new Graphics(renderer, scene);
// `?greybox` loads the M1 test course instead of the city
const greybox = new URLSearchParams(location.search).has('greybox');
const store = new SaveStore();
let save: SaveData = store.load();
// the level: ?level=… in the address, else the last one played (automated tests start in free play)
let level = levelById(new URLSearchParams(location.search).get('level') ?? (navigator.webdriver ? 'sandbox' : save.level));
let setup = levelSetup(level, QUESTS, TRIGGERS, TOURIST_SPAWNS);
let world: World;
let targets: Target[];
let targetMeshes: THREE.Object3D[];
let start: { x: number; z: number };
let propSpawns: PropSpawn[] = [];
let keepClearSpots: { x: number; z: number; r: number }[] = [];
let walkable: (x: number, z: number) => boolean = () => true;
let isLand: (x: number, z: number) => boolean = () => true;
let water: Water | null = null;
if (greybox) {
  const course = buildCourse();
  const visuals = buildCourseVisuals(course.boxes, course.targets);
  addGroundPlane(scene, palette.ground);
  scene.add(visuals.group);
  world = new World(course.boxes);
  ({ targets, start } = course);
  targetMeshes = visuals.targetMeshes;
} else {
  const city = buildCity();
  scene.add(city.group);
  world = city.world;
  ({ targets, start, targetMeshes, propSpawns, walkable, isLand, water } = city);
  keepClearSpots = city.keepClear;
  phys.addStaticMesh(city.physicsMesh.vertices, city.physicsMesh.indices);
}
const gull = new Gull(start);
phys.createGullBody(GULL_RADIUS, start.x, GULL_RADIUS, start.z);
const interaction = new Interaction(phys, world, scene);
if (!greybox) {
  gull.isWater = (x, z) => !isLand(x, z);
  interaction.props.isWater = (x, z) => !isLand(x, z);
}
// pedestrians and cyclists on the streets (cosmetic; fewer on the low graphics preset)
const lowGfx = new OptionsStore().load().graphics === 'low' || new URLSearchParams(location.search).has('touch');
const streetLife = greybox ? null : new StreetLife(scene, walkable, keepClearSpots, Math.round(tuning.street.walkers.value * (lowGfx ? 0.5 : 1)), Math.round(tuning.street.cyclists.value * (lowGfx ? 0.5 : 1)));
const ripples = new Ripples();
scene.add(ripples.group);
let rippleT = 0;
for (const sp of [...propSpawns, ...setup.props]) interaction.props.spawn(sp);
// tourists and the quest log only exist in the city
const npcs = greybox ? null : new NpcManager(world, interaction.props, scene, walkable);
if (npcs) {
  for (const sp of setup.tourists) npcs.spawn(sp);
  interaction.npcs = npcs;
}
const makeDefense = (): CityDefense | null => (greybox || !setup.defense ? null : new CityDefense(world, scene, walkable));
// the city's response: heat, vendors, scare lines, nets, the Warden (city only)
let defense = makeDefense();
let heatMeter = defense ? new HeatMeter(document.body) : null;
const announce = new Announce(document.body);
const stepNoises: Noise[] = [];
if (npcs) {
  let nTourist = 0;
  interaction.npcs = {
    snatchCandidates: (b) => npcs.snatchCandidates(b),
    onSnatched: (id) => npcs.onSnatched(id),
    blockedHint: (b) => npcs.blockedHint(b),
    poopSpheres: () => {
      const t = npcs.poopSpheres();
      nTourist = t.length;
      return defense ? [...t, ...defense.poopSpheres()] : t;
    },
    onPooped: (i) => {
      if (i < nTourist) return npcs.onPooped(i);
      defense?.onPooped(i - nTourist);
      return undefined;
    },
  };
}
const quests = new QuestLog(greybox ? [] : setup.quests);
// progress: skills, finished quests, best times (localStorage; every call is safe if storage is blocked)
// gull looks: the ones already earned don't get a "new look" banner again; wear the saved one if it is still unlocked
const knownSkins = new Set(unlockedSkins(skinProgress(save)));
gull.setSkin(skinById(knownSkins.has(save.skin) ? save.skin : 'herring').colours);
const skills = new SkillSet();
skills.restore(save.skills);
const abilities = new Abilities();
const runTimer = new RunTimer();
const music = new MusicPlayer();
const musicDirector = new MusicDirector();
music.muted = save.muted;
// restore progress from the save (silent)
if (save.replayUnlocked && save.extrasOn) quests.setFlag('replay', true);
if (level.sandbox) quests.restoreWon(save.questsWon); // finished quests belong to free play; levels start fresh
const triggers = new TriggerSystem(greybox ? [] : setup.triggers);
const stats = new LevelStats();
const levelComplete = new LevelComplete(document.body);
document.getElementById('levelcomplete')?.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest('button')) levelComplete.hide(); // tap anywhere else to keep playing (phones)
});
const markerPool = new MarkerPool();
const waypoints = new Waypoints(document.body);
scene.add(markerPool.group);
const todo = new Todo(document.body);
todo.defs = setup.quests;
todo.secret = setup.secret;
const skillsPanel = new SkillsPanel(document.body, (id) => pickSkin(id));
const runHud = new RunHud(document.body);
const flock = new FlockSystem(scene);
const pings = new PingFx(scene);
const poopReticle = new Reticle();
scene.add(poopReticle.mesh);
const marker = new DiveMarker();
const lockMarker = new LockMarker();
scene.add(lockMarker.group);
/** The locked target (Tab): dives and droppings home in on it. */
let lockId: string | null = null;
let lockNow: LockCandidate | null = null;
const NPC_LABELS: Record<string, string> = { cleaner: 'the Clean Freak', selfie: 'the selfie tourist', blogger: 'the food blogger', dater: 'a date', child: 'the child' };
/** Everything that can be locked: people, the vendors and the Warden, level targets like the brass sign. */
function lockCandidates(): LockCandidate[] {
  const out: LockCandidate[] = [];
  for (const n of npcs?.npcs ?? []) out.push({ id: `n${n.id}`, x: n.x, y: 1.2, z: n.z, radius: 0.8, label: NPC_LABELS[n.role] ?? 'a tourist' });
  if (defense) {
    if (defense.response.deployed.has('vendors')) for (const v of defense.vendors) out.push({ id: `v${v.id}`, x: v.x, y: 1.2, z: v.z, radius: 0.8, label: 'a vendor' });
    if (defense.warden) out.push({ id: 'warden', x: defense.warden.x, y: 1.4, z: defense.warden.z, radius: 1, label: 'the Warden' });
  }
  for (const p of interaction.props.props) if (!p.broken && p.tag && POOP_TARGET_TAGS.has(p.tag)) out.push({ id: `p${p.id}`, x: p.cur.p.x, y: p.cur.p.y, z: p.cur.p.z, radius: 1.2, label: p.def.name });
  return out;
}
shadows(gull.mesh, true, false);
scene.add(gull.mesh, gull.shadow, marker.group);
const cam = new FollowCamera(innerWidth / innerHeight);
const input = new Input(renderer.domElement);
// phones and tablets: on-screen controls, no pointer lock, a lighter view distance
// ---- players: player 1 (keyboard/mouse/touch, or a gamepad), and with ?coop a debug second gull on a gamepad ----
interface Player {
  id: number;
  gull: Gull;
  input: Input;
  /** Steered over the network (the other online player). */
  remote?: boolean;
  /** Player 2 steers its own view direction (the camera follows player 1). */
  yaw: number;
  pitch: number;
}
const coop = !greybox && new URLSearchParams(location.search).has('coop');
const players: Player[] = [{ id: 0, gull, input, yaw: 0, pitch: 0.25 }];
if (coop) {
  const g2 = new Gull({ x: start.x + 2.5, z: start.z });
  g2.isWater = gull.isWater;
  g2.setSkin(skinById('juvenile').colours); // tell them apart at a glance
  shadows(g2.mesh, true, false);
  scene.add(g2.mesh, g2.shadow);
  players.push({ id: 1, gull: g2, input: new Input(null, false), yaw: 0, pitch: 0.25 });
}
// the first gamepad drives player 2 in co-op, otherwise player 1
const pad = new GamepadSource(coop ? players[1].input : input, 0);
const touch = wantsTouch(location.search, matchMedia('(pointer: coarse)').matches, navigator.maxTouchPoints);
const touchControls = touch ? new TouchControls(document.body, input) : null;
if (touch) {
  document.body.classList.add('touch');
  input.pointerLockAllowed = false;
  graphics.lowPixelRatio = Math.min(devicePixelRatio, 1.5);
  cam.camera.far = 650;
  cam.camera.updateProjectionMatrix();
  addEventListener('contextmenu', (e) => e.preventDefault());
  document.getElementById('todo')?.addEventListener('click', (e) => (e.currentTarget as HTMLElement).classList.toggle('open'));
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    touchControls?.release();
    input.releaseVirtual();
  }
});
(window as unknown as { __lokki: unknown }).__lokki = { gull, cam, world, interaction, npcs, quests, get defense() { return defense; }, noise, heat, triggers, stats, notes, skills, abilities, runTimer, flock, music, musicDirector, store, players, PeerLink, startSession, get net() { return net; }, get level() { return level.id; }, loadLevel, snapshot: () => captureSnapshot(), saveData: () => save, restartLevel };
const debug = new DebugPanel(document.body);
debug.addButton('Reset saved progress', () => {
  store.clear();
  location.reload();
});
const hud = new Hud(document.body);
const credits = new Credits(document.body);
const optStore = new OptionsStore();
const firstVisit = !optStore.has();
const options = optStore.load();
if (touch && firstVisit) options.graphics = 'low'; // phones start on the fast preset (switch in Options)
applyOptions(options);
touchControls?.setHand(options.touchHand);
graphics.apply(options.graphics);
let hudF = applyHud(options.hud);
const levelSelect = new LevelSelect(document.body, (id) => goToLevel(id));
// ---- online co-op: a host runs the game, a guest flies its own gull and sees what the host sends ----
let net: NetSession | null = null;
const lobby = new Lobby(document.body, {
  onConnected: (role, link, hostLevel) => startSession(role, link, hostLevel),
  onLeave: () => endSession('You left the game.'),
  levels: () => LEVELS.filter((l) => levelUnlocked(l, save.levels)).map((l) => ({ id: l.id, name: l.name, current: l.id === level.id })),
  onChangeLevel: () => levelSelect.show(levelRows()),
});
const isGuest = (): boolean => net?.role === 'guest';
const isHost = (): boolean => net?.role === 'host';
function remotePlayer(look: string): Player {
  const g = new Gull({ x: start.x + 2.5, z: start.z });
  g.isWater = gull.isWater;
  g.setSkin(skinById(look).colours);
  shadows(g.mesh, true, false);
  scene.add(g.mesh, g.shadow);
  const p: Player = { id: 1, gull: g, input: new Input(null, false), yaw: 0, pitch: 0.25, remote: true };
  g.setRemote({ id: 1, p: [start.x + 2.5, GULL_RADIUS, start.z], v: [0, 0, 0], h: 0, mode: 'ground', carry: null });
  return p;
}
function startSession(role: 'host' | 'guest', link: PeerLink, hostLevel = ''): void {
  if (players.length > 1) players.length = 1;
  const session = new NetSession(role, link);
  net = session;
  seenRev = -1;
  session.onLeave = (why) => endSession(why);
  session.onEvent = onNetEvent;
  if (role === 'host') {
    session.onHello = () => {
      session.welcome(level.id, save.skin, skills.ids); // sent again for every hello: the first one may have been lost
      if (players.length > 1) return;
      players.push(remotePlayer(session.guestLook));
      lobby.setConnected(session.guestName);
      hud.toast(`${session.guestName} joined!`, 2);
      relayHost();
      loadLevel(hostLevel && LEVELS.some((l) => l.id === hostLevel) ? hostLevel : level.id); // the level the host picked, with the two-player to-dos (the guest follows)
    };
  } else {
    session.onWelcome = () => {
      skills.borrow(session.hostSkills); // a friend with no progress still gets to play with the host's skills
      skillsPanel.refresh(skills, save);
      if (session.hostSkills.length) hud.toast('You can use the host\'s skills in this game.', 2.4);
      players.push(remotePlayer(session.hostLook));
      lobby.setConnected('the host');
    };
    session.hello('Guest', save.skin);
  }
}
function endSession(why: string): void {
  if (!net) return;
  net.bye(why);
  net = null;
  skills.clearBorrowed();
  while (players.length > 1) {
    const p = players.pop()!;
    scene.remove(p.gull.mesh, p.gull.shadow);
  }
  lobby.setConnected(null);
  hud.toast(why, 3);
}
/** The host tells the guest everything it should show or play (toasts, sounds, banners, the level card). */
function relayHost(): void {
  if (relayed) return;
  relayed = true;
  const toast = hud.toast.bind(hud);
  hud.toast = (m, secs) => {
    toast(m, secs);
    if (isHost()) net!.sendEvent({ k: 'toast', text: m, secs });
  };
  const play = audio.play.bind(audio);
  audio.play = ((name: Parameters<typeof play>[0]) => {
    play(name);
    if (isHost()) net!.sendEvent({ k: 'sound', name });
  }) as typeof audio.play;
  const show = announce.show.bind(announce);
  announce.show = (t, sub, kind) => {
    show(t, sub, kind);
    if (isHost()) net!.sendEvent({ k: 'banner', title: t, sub, kind: kind ?? 'alert' });
  };
  const lcShow = levelComplete.show.bind(levelComplete);
  levelComplete.show = (st, qs, ns, nav) => {
    lcShow(st, qs, ns, nav);
    if (isHost()) net!.sendEvent({ k: 'levelComplete', data: { st, qs, ns, heading: nav?.heading, next: nav?.next } });
  };
}
let relayed = false;
function onNetEvent(e: GameEvent): void {
  switch (e.k) {
    case 'toast':
      hud.toast(e.text, e.secs);
      break;
    case 'sound':
      audio.play(e.name as Parameters<typeof audio.play>[0]);
      break;
    case 'banner':
      announce.show(e.title, e.sub, e.kind as Parameters<typeof announce.show>[2]);
      break;
    case 'levelComplete': {
      const d = e.data as { st: StatSummary; qs: { title: string; won: boolean }[]; ns: string[]; heading?: string; next?: { id: string; name: string } };
      levelComplete.show(d.st, d.qs, d.ns, { heading: d.heading ?? 'Level cleared!', next: d.next, go: (t) => (t === 'menu' ? levelComplete.hide() : hud.toast('The host picks the next level.', 1.6)) });
      break;
    }
    case 'poop':
      interaction.ghostPoop({ x: e.p[0], y: e.p[1], z: e.p[2] }, { x: e.v[0], y: e.v[1], z: e.v[2] }, simTime);
      break;
    case 'hit': {
      const h = e.hit as Parameters<typeof applyHit>[1];
      if (applyHit(gull.state, h)) {
        cam.shake(h.kind === 'swat' ? 0.7 : 0.45);
        hud.flash({ spray: '#7ec8ff', swat: '#ffb347', line: '#ffffff', net: '#ffffff' }[h.kind]);
        gull.openBeak(0.7);
      }
      break;
    }
    case 'clear': {
      // the guest's own progress: stars and the level's skill go to its own save
      const def = LEVELS.find((l) => l.id === e.level);
      if (!def) break;
      save = { ...save, levels: { ...save.levels, [def.id]: mergeRecord(save.levels[def.id], e.stars, e.seconds) } };
      if (def.reward) skills.unlock(def.reward);
      persist();
      break;
    }
    case 'hideComplete':
      levelComplete.hide();
      break;
  }
}
const levelRows = () =>
  LEVELS.map((l) => ({ id: l.id, name: l.name, blurb: l.blurb, stars: starCount(save.levels[l.id]), current: l.id === level.id, sandbox: l.sandbox, locked: !levelUnlocked(l, save.levels), unlockHint: l.requires ? `Clear ${levelById(l.requires).name} first` : undefined, best: save.levels[l.id]?.best ? fmtClear(save.levels[l.id].best) : undefined }));
const controlsPanel = new ControlsPanel(document.body);
const menuNav = new MenuNav();
pad.menuOpen = () => menuOpen() || levelComplete.visible; // the level card takes the controller too (it does not pause the game)
pad.onMenu = (a) => menuNav.handle(a);
addEventListener('pointerdown', () => menuNav.clear());
const optionsPanel = new OptionsPanel(document.body, options, (o) => {
  applyOptions(o);
  if (o.graphics !== graphics.level) graphics.apply(o.graphics);
  hudF = applyHud(o.hud);
  touchControls?.setHand(o.touchHand);
  optStore.save(o);
}, () => levelSelect.show(levelRows()), () => lobby.show(), () => skillsPanel.toggle(skills, save), () => controlsPanel.show(), () => touchControls?.arrange(true));
// automated browser tests skip the title screen and the tips (add ?title to see them)
const interactive = !navigator.webdriver || new URLSearchParams(location.search).has('title');
const tutorial = new Tutorial(interactive && !options.tutorialDone);
const miniTimer = document.createElement('div');
miniTimer.id = 'minitimer';
miniTimer.hidden = true;
document.body.appendChild(miniTimer);
/** Show the HUD mode on the page (body classes do the hiding) and return what the game should still draw. */
function applyHud(mode: HudMode) {
  document.body.classList.toggle('hud-minimal', mode === 'minimal');
  document.body.classList.toggle('hud-off', mode === 'off');
  return hudFlags(mode);
}
const tipEl = document.createElement('div');
tipEl.id = 'tip';
tipEl.hidden = true;
document.body.appendChild(tipEl);
function startPlaying(): void {
  title.hide();
  if (touch) {
    // Android: go fullscreen and hold landscape (iPhone Safari cannot; the rotate card covers portrait there)
    const so = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    document.documentElement.requestFullscreen?.().then(() => so.lock?.('landscape')).catch(() => undefined);
  }
  audio.unlock();
  music.start();
}
const fmtClear = (t: number | null): string => (t === null ? '' : `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`);
const title = new TitleScreen(
  document.body,
  {
    onPlay: startPlaying,
    onOptions: () => optionsPanel.show(),
    onCredits: () => credits.toggle(),
    onCoop: () => lobby.show(),
    // another level: remember it and reload into it
    onPickLevel: (id) => goToLevel(id),
  },
  {
    best: fmtClear(save.bestTime),
    skills: skills.ids.length,
    total: SKILLS.length,
    levels: LEVELS.map((l) => ({ id: l.id, name: l.name, blurb: l.blurb, stars: starCount(save.levels[l.id]), current: l.id === level.id, sandbox: l.sandbox, locked: !levelUnlocked(l, save.levels), unlockHint: l.requires ? `Clear ${levelById(l.requires).name} first` : undefined })),
  },
);
if (interactive && !new URLSearchParams(location.search).has('play')) title.show();
input.captureTab = () => !menuOpen();
const menuOpen = (): boolean => title.visible || (lobby.visible && !net) || levelSelect.visible || optionsPanel.visible || controlsPanel.visible || skillsPanel.visible || credits.visible || !!touchControls?.menuOpen;
const audio = new AudioManager();
audio.muted = save.muted;
for (const ev of ['pointerdown', 'touchend', 'keydown'] as const) addEventListener(ev, () => { audio.unlock(); music.start(); });
let simTime = 0;
let hits = 0;
let lastBump = -10;
let lastSnatchAt = -100;
let explainedLearning = false;
let stealTipShown = false;

events.on('tuningChanged', () => {
  phys.setGravity(tuning.physics.gravity.value);
  const f = scene.fog as THREE.Fog;
  f.near = tuning.render.fogNear.value;
  f.far = tuning.render.fogFar.value;
});

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  cam.resize(innerWidth / innerHeight);
});

function onFlightEvents(evs: FlightEvent[]): void {
  for (const e of evs) {
    if (e.type === 'flap') {
      audio.play('flap');
      tutorial.event('flap');
    }
    else if (e.type === 'hop') audio.play('hop');
    else if (e.type === 'diveStart') {
      tutorial.event('dive');
      audio.play('screech');
      gull.openBeak(0.5);
    } else if (e.type === 'exhausted') hud.toast('Out of breath!', 0.6);
    else if (e.type === 'land' && e.water) {
      hud.toast('Splash!', 0.6);
      audio.play('splat');
      ripples.add(gull.state.x, gull.state.z, 1.6);
      interaction.debris.burst({ x: gull.state.x, y: 0.2, z: gull.state.z }, 0xdff4fb, 10);
    } else if (e.type === 'land' && e.quality === 'hard') {
      hud.toast('Oof!');
      cam.shake(0.7);
      interaction.debris.burst(gull.state, 0xe9dcc8, 10); // dust
      audio.play('thud');
      gull.openBeak(0.8);
    } else if (e.type === 'land' && e.quality === 'rough') {
      hud.toast('Rough landing', 0.6);
      cam.shake(0.3);
      audio.play('thud');
    } else if (e.type === 'land' && e.perch) hud.toast('Perched', 0.8);
    else if (e.type === 'bonk') {
      hud.toast('Bonk!');
      cam.shake(0.5);
      audio.play('bonk');
      gull.openBeak(0.8);
    }
  }
}

/** Write the current progress to the save. */
function persist(): void {
  save = { ...save, skills: skills.ids, questsWon: level.sandbox ? quests.wonIds() : save.questsWon, muted: audio.muted, level: level.id };
  store.save(save);
  skillsPanel.refresh(skills, save);
  // new gull looks earned since last time?
  for (const id of unlockedSkins(skinProgress(save))) {
    if (knownSkins.has(id)) continue;
    knownSkins.add(id);
    announce.show(`New gull look: ${skinById(id).name}`, 'Press K to try it on.', 'learned');
  }
}

/** Wear a gull look (only unlocked ones) and remember it. */
function pickSkin(id: string): void {
  if (!unlockedSkins(skinProgress(save)).includes(id)) return;
  save = { ...save, skin: id };
  gull.setSkin(skinById(id).colours);
  store.save(save);
  skillsPanel.refresh(skills, save);
  audio.play('pop');
}

/** Restart the level (R) or start a speedrun (Z). Skills and best times are kept. */
/** Rising warm air (a level's thermals): the lift a gull at this spot gets, in m/s^2. */
function thermalLift(s: { x: number; y: number; z: number }): number {
  for (const t of level.thermals ?? []) if (Math.hypot(s.x - t.x, s.z - t.z) <= t.r && s.y < 60) return t.lift;
  return 0;
}
const thermalFx = new THREE.Group();
scene.add(thermalFx);
/** Pale columns of warm air over the thermals, so they can be found from afar. */
function showThermals(): void {
  thermalFx.clear();
  for (const t of level.thermals ?? []) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(t.r * 0.8, t.r, 60, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
    col.position.set(t.x, 30, t.z);
    thermalFx.add(col);
  }
}
let heat60Fired = false;
let altitudeFired = false;
const thermalsSeen = new Set<number>();
let owlCd = 0;
/** What a level adds to the city when it starts: the city's heat, the Warden's lunch, a current for the message bottle. */
function applyLevelRules(): void {
  heat60Fired = false;
  altitudeFired = false;
  thermalsSeen.clear();
  owlCd = 0;
  skills.grantForLevel(level.skills ?? []);
  showThermals();
  skillsPanel.refresh(skills, save);
  interaction.props.drift = level.drift ?? null;
  if (defense) defense.hiddenLines = !!level.hiddenLines;
  if (!defense || isGuest()) return; // a guest's city is the host's
  defense.lunch = level.wardenLunch ? { x: level.wardenLunch.x, z: level.wardenLunch.z, from: level.wardenLunch.at, to: level.wardenLunch.at + level.wardenLunch.duration, repeat: level.wardenLunch.repeat } : null;
  if (level.deploy) onDefense(defense.deployNow(level.deploy));
  if (level.startHeat) onDefense(defense.ensureHeat(level.startHeat));
}

function restartLevel(mode: 'normal' | 'speedrun'): void {
  levelCleared = false;
  lockId = null;
  combo.reset();
  lastHolder.clear();
  gull.reset();
  gull.setDisguise(false);
  interaction.reset();
  npcs?.reset();
  defense?.reset();
  announce.clear();
  quests.reset();
  triggers.reset();
  stats.reset();
  levelComplete.hide();
  abilities.reset();
  flock.clear();
  musicDirector.reset();
  applyLevelRules();
  if (mode === 'speedrun') runTimer.startSpeedrun();
  else runTimer.setNormal();
  persist();
}

/** Load another level in place (no page reload, so an online co-op link survives). */
function loadLevel(id: string): void {
  level = levelById(id);
  setup = levelSetup(level, QUESTS, TRIGGERS, TOURIST_SPAWNS, players.length > 1);
  interaction.reset(); // drops whatever the beaks hold
  interaction.props.clearAll();
  npcs?.clearAll();
  for (const sp of [...propSpawns, ...setup.props]) interaction.props.spawn(sp);
  if (npcs) for (const sp of setup.tourists) npcs.spawn(sp);
  defense?.dispose();
  defense = makeDefense();
  heatMeter?.remove();
  heatMeter = defense ? new HeatMeter(document.body) : null;
  quests.load(greybox ? [] : setup.quests);
  if (level.sandbox) quests.restoreWon(save.questsWon);
  triggers.load(greybox ? [] : setup.triggers);
  todo.defs = setup.quests;
  todo.secret = setup.secret;
  title.hide();
  levelSelect.hide();
  levelComplete.hide();
  const q = new URLSearchParams(location.search);
  q.set('level', id);
  q.set('play', '');
  history.replaceState(null, '', `?${q.toString()}`);
  restartLevel('normal'); // gull, stats, timers, music; saves the new level
  if (isHost()) levelRev++;
  startPlaying();
}
const goToLevel = (id: string): void => {
  if (isGuest()) hud.toast('The host picks the level.', 1.6);
  else loadLevel(id);
};

/** A level is cleared when its main to-dos are done: stars, the saved result, the skill reward, the level-complete card. */
let levelCleared = false;
function checkLevelDone(): void {
  const p = levelProgress(level, setup, quests.quests);
  if (!p.cleared) return;
  const seconds = stats.summary().seconds;
  const stars = levelStars(level, p, seconds);
  const before = save.levels[level.id];
  if (levelCleared) {
    // a secret to-do found after clearing: add its star
    if (p.allDone && before && !before.stars[1]) {
      save = { ...save, levels: { ...save.levels, [level.id]: { ...before, stars: [before.stars[0], true, before.stars[2]] } } };
      hud.toast('Every to-do done, secrets too! ★', 2.2);
      if (isHost()) net!.sendEvent({ k: 'clear', level: level.id, stars, seconds });
    }
    return;
  }
  levelCleared = true;
  save = { ...save, levels: { ...save.levels, [level.id]: mergeRecord(before, stars, seconds) } };
  if (isHost()) net!.sendEvent({ k: 'clear', level: level.id, stars, seconds }); // the guest keeps its own record too
  const n = stars.filter(Boolean).length;
  const notes = [
    `${'★'.repeat(n)}${'☆'.repeat(3 - n)}  ·  ${stars[0] ? '★' : '☆'} cleared  ·  ${stars[1] ? '★' : '☆'} every to-do (secrets too)  ·  ${stars[2] ? '★' : '☆'} under ${fmtClear(level.parTime ?? 0)}`,
  ];
  if (level.reward) {
    const sk = skills.unlock(level.reward);
    if (sk) {
      notes.push(`New skill: ${sk.name}. ${sk.blurb}`);
      announce.show(`New skill: ${sk.name}`, `${sk.blurb}${sk.key ? ` Press ${sk.key}.` : ''} (K: all skills)`, 'learned');
    }
  }
  const idx = LEVELS.findIndex((l) => l.id === level.id);
  const nextLevel = LEVELS.slice(idx + 1).find((l) => !l.sandbox);
  levelComplete.show(stats.summary(), quests.quests.map((x) => ({ title: setup.secret.has(x.id) && x.status !== 'won' ? '???' : x.title, won: x.status === 'won' })), notes, {
    heading: `${level.name.replace(/^\d+\.\s*/, '')} cleared!`,
    next: nextLevel ? { id: nextLevel.id, name: nextLevel.name } : undefined,
    go: (target) => (target === 'menu' ? (levelComplete.hide(), levelSelect.show(levelRows())) : goToLevel(target)),
  });
}

let snapTick = 0;
/** On a guest: the weight of what the host says is in this gull's beak (it slows the flight). */
let guestCarryMass = 0;
let levelRev = 0;
let seenRev = -1;
/** A guest does not simulate the world: it takes what the host says, and tells the host what its own gull did. */
function guestStep(dt: number): void {
  const n = net!;
  n.tick(dt);
  const hl = n.hostLevel;
  if (hl && hl.rev !== seenRev) {
    seenRev = hl.rev; // the host started or restarted a level: do the same
    n.takeSnapshot();
    loadLevel(hl.id);
    return;
  }
  const snap = n.takeSnapshot();
  if (snap) {
    const host = snap.gulls.find((g) => g.id === 0);
    if (host && players[1]) players[1].gull.setRemote(host);
    interaction.props.setRemote(snap.props);
    const mine = snap.gulls.find((g) => g.id === 1)?.carry;
    guestCarryMass = mine == null ? 0 : interaction.props.byId(mine)?.def.mass ?? 0;
    npcs?.setRemote(snap.npcs);
    quests.applyRemote(snap.quests);
    defense?.heat.setRemote(snap.heat);
    if (snap.d) defense?.applyRemote(snap.d, 0.05);
  }
  interaction.props.stepRemote(dt);
  interaction.stepGhosts(dt, simTime);
  npcs?.stepRemote(dt);
  const s = gull.state;
  const { x, y } = input.axes();
  n.sendInput({
    ax: x, ay: y, flap: input.isDown('Space'), dive: input.isDown('ShiftLeft') || input.isDown('ShiftRight'), yaw: cam.yaw, pitch: cam.pitch,
    s: { id: 1, p: [s.x, s.y, s.z], v: [s.vx, s.vy, s.vz], h: s.heading, mode: s.mode, carry: null, fa: s.flapAnim, ha: s.heightAbove, tr: s.turnRate, dg: abilities.disguised ? 1 : 0, lk: lockNow ? [lockNow.x, lockNow.y, lockNow.z] : undefined },
  });
}

/** The whole game as plain data with stable ids (what the host will send in online co-op). */
function captureSnapshot(): Snapshot {
  return makeSnapshot({
    time: simTime,
    gulls: players.map((p) => ({ id: p.id, ...pickXYZ(p.gull.state), vx: p.gull.state.vx, vy: p.gull.state.vy, vz: p.gull.state.vz, heading: p.gull.state.heading, mode: p.gull.state.mode, carry: interaction.beak(p.id).carried?.id ?? null, flapAnim: p.gull.state.flapAnim, heightAbove: p.gull.state.heightAbove, turnRate: p.gull.state.turnRate, disguised: p.remote ? p.gull.remoteDisguised : abilities.disguised })),
    props: interaction.props.props.map((pr) => ({ id: pr.id, x: pr.cur.p.x, y: pr.cur.p.y, z: pr.cur.p.z, qx: pr.cur.q.x, qy: pr.cur.q.y, qz: pr.cur.q.z, qw: pr.cur.q.w, by: interaction.carrierOf(pr), held: pr.heldBy, broken: pr.broken })),
    npcs: (npcs?.npcs ?? []).map((n) => ({ id: n.id, x: n.x, z: n.z, heading: n.heading, mode: n.mode, holding: n.holding, handAngle: n.handAngle, selfie: n.selfie, selfieCount: n.selfieCount, cleanT: n.cleanT, shieldFrom: n.shieldFrom })),
    heat: defense?.heat.value ?? 0,
    d: defense?.remoteSnap(),
    quests: quests.quests.map((q) => ({ id: q.id, status: q.status, timeLeft: q.timeLeft, timed: q.timed, objectives: q.objectives })),
  });
}
const pickXYZ = (s: { x: number; y: number; z: number }) => ({ x: s.x, y: s.y, z: s.z });

/** A sound the tourists and the Warden can hear. */
function noise(x: number, z: number, loud: number): void {
  npcs?.addNoise(x, z, loud);
  stepNoises.push({ x, z, loud });
}

function heat(reason: HeatReason): void {
  if (defense) onDefense(defense.addHeat(reason));
}

function onDefense(evs: DefenseEvent[]): void {
  for (const e of evs) {
    switch (e.type) {
      case 'tier':
        if (e.up) audio.play('alarm');
        break;
      case 'deployed': {
        const t = tuning.heat;
        const info = {
          vendors: ['Vendors on guard', `Heat ${t.tier1.value}: vendors grab spray bottles. Watch the red fan on the ground and dodge it.`],
          lines: ['Scare lines!', `Heat ${t.tier2.value}: lines hang over the stalls and the square. Fly around them.`],
          nets: ['Nets going up!', `Heat ${t.tier3.value}: nets catch gulls diving from above. Fly in underneath, or climb out through them.`],
          warden: ['The Gull Warden!', `Heat ${t.tier4.value}: he hunts you with his umbrella. Distract him with a noise, then poop him from above.`],
        }[e.id];
        if (e.cause === 'learned') announce.show(`The city adapts: ${info[0]}`, 'The gulls beat the last measure, so the city brings in something new.', 'adapt');
        else announce.show(`City alert: ${info[0]}`, info[1], 'alert');
        audio.play('alarm');
        break;
      }
      case 'dodged': {
        stats.add('dodge');
        notes(quests.onEvent(`dodge:${e.id}`));
        const what = { vendors: 'Dodged the spray!', warden: 'Dodged the swat!', lines: 'Slipped past the scare lines!', nets: 'Flew under the net!' }[e.id];
        hud.toast(`${what} (gulls learning ${e.count}/${e.need})`, 1.6);
        if (!explainedLearning) {
          explainedLearning = true;
          setTimeout(() => hud.toast('Every clean dodge teaches the gulls. A learned deterrent barely hurts any more, but the city brings in something new.', 4.5), 1700);
        }
        break;
      }
      case 'learned':
        announce.show(`The gulls learned: ${DETERRENT_NAMES[e.id]}`, 'It barely works on them any more.', 'learned');
        break;
      case 'hit': {
        stats.add('sprayed');
        const victim = players[e.gull]?.gull ?? gull;
        if (isHost() && players[e.gull]?.remote) net!.sendEvent({ k: 'hit', hit: e.hit }); // the guest flies its own gull: it feels the hit there
        if (e.hit.kind === 'line') notes(quests.onEvent('lineHit'));
        const dropped = applyHit(victim.state, e.hit);
        if (!dropped) {
          hud.toast('Slipped through!', 0.8);
          break;
        }
        const lost = interaction.dropCarried(victim.state, e.gull);
        const what = { spray: 'Sprayed by a vendor!', swat: 'Swatted by the Warden!', line: 'Tangled in a scare line!', net: 'Caught in the net!' }[e.hit.kind];
        hud.toast(lost ? `${what} Dropped the ${lost.def.name}!` : what, 1.4);
        audio.play(e.hit.kind === 'spray' ? 'splat' : e.hit.kind === 'swat' ? 'bonk' : 'twang');
        if (e.gull === 0) cam.shake(e.hit.kind === 'swat' ? 0.7 : 0.45);
        interaction.debris.burst({ x: victim.state.x, y: victim.state.y + 0.3, z: victim.state.z }, 0xffffff, 14); // feathers
        if (e.gull === 0) hud.flash({ spray: '#7ec8ff', swat: '#ffb347', line: '#ffffff', net: '#ffffff' }[e.hit.kind]);
        victim.openBeak(0.7);
        break;
      }
      case 'spray': {
        audio.play('hiss');
        // anyone standing in the spray is soaked: they drop what they hold and run
        if (npcs) for (const n of npcs.soakCone(e.x, e.z, e.aimX, e.aimZ)) hud.toast(n.role === 'rich' ? 'The rich tourist is soaked!' : 'Soaked!', 1.4);
        break;
      }
      case 'vendorDistracted':
        notes(quests.onEvent('vendorDistract'));
        break;
      case 'lunch':
        if (e.on) {
          announce.show('The Warden goes for lunch', 'His umbrella is down and his sandwich is on the bench. Now is your chance.', 'alert');
          notes(quests.onEvent('wardenLunch'));
        }
        else hud.toast('Lunch is over. Back to his rounds.', 1.6);
        break;
      case 'noticed':
        audio.play(e.who === 'warden' ? 'whistle' : 'gasp');
        if (e.who === 'warden') hud.toast('The Warden spotted you!', 1.2);
        break;
      case 'poopVendor':
        audio.play('splat');
        hud.toast('Splat! That vendor is out of action for a bit', 1.4);
        break;
      case 'poopWarden':
        stats.add('poopWarden');
        audio.play('splat');
        audio.play('yelp');
        hud.toast('Splat! The Warden is NOT amused', 1.8);
        notes(quests.onEvent('poopWarden'));
        break;
      case 'umbrella':
        audio.play('clatter');
        hud.toast('Plink! The umbrella took it', 1.2);
        break;
    }
  }
}

/** Quest notifications -> toasts and sounds. */
function notes(list: QuestNote[]): void {
  for (const n of list) {
    const q = quests.quests.find((x) => x.id === n.quest)!;
    const def = setup.quests.find((d) => d.id === n.quest)!;
    if (n.type === 'started') {
      hud.toast(q.timed ? `${q.title}: ${Math.round(q.timeLeft)} seconds!` : `Quest started: ${q.title}`, 1.6);
      if (n.quest === 'finale') announce.show('The ferry horn blows!', 'Chairs in the sandbox, the pastry on the south stall (yellow pillar), and the Warden. The city is on full alert.', 'alert');
      if (n.quest === 'finale') interaction.restock((pr) => pr.type === 'chair' || pr.tag === 'stallBun'); // knocked-over chairs and a taken pastry come back for the finale
      if (def.startHeat && defense) onDefense(defense.ensureHeat(def.startHeat));
    } else if (n.type === 'objective') {
      const text = q.objectives.find((o) => o.id === n.objective)!.text;
      hud.toast(`✓ ${text}`, 1.6);
      if (n.quest === 'date' && n.objective === 'splat') {
        // the ruined date storms off in opposite directions
        npcs?.sendRole('dater', [{ x: 36, z: -9, name: 'stormoff' }, { x: -37, z: -9, name: 'stormoff' }]);
        hud.toast('The date is ruined! They storm off...', 2);
      }
    } else if (n.type === 'won') {
      audio.play('win');
      for (const c of [0xffd36e, 0xff9ec4, 0x9bd8ff, 0xb5e8b0]) interaction.debris.burst({ x: gull.state.x, y: gull.state.y + 1.2, z: gull.state.z }, c, 8); // confetti
      hud.toast(n.quest === 'extras' ? 'All extras done!' : n.quest === 'bonus' ? 'All extra objectives done!' : `Quest complete: ${q.title}!`, 2.4);
      const skill = level.sandbox ? skills.unlockForQuest(n.quest) : null; // levels give their skill when cleared
      if (skill) {
        announce.show(`New skill: ${skill.name}`, `${skill.blurb}${skill.key ? ` Press ${skill.key}.` : ''} (K: all skills)`, 'learned');
        audio.play('win');
      }
      if (n.quest === 'finale') {
        const seconds = runTimer.finish() ?? stats.summary().seconds;
        const notes: string[] = [];
        const first = !save.replayUnlocked;
        const speed = runTimer.mode === 'speedrun';
        if (isBest(seconds, save.bestTime)) notes.push(`New best time: ${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}!`);
        if (speed && isBest(seconds, save.speedrunBest)) {
          save.speedrunBest = seconds;
          notes.push('New speedrun record!');
        }
        save = { ...save, replayUnlocked: true, clears: save.clears + 1, bestTime: isBest(seconds, save.bestTime) ? seconds : save.bestTime };
        if (first) notes.push('Unlocked: extra objectives (X) and speedrun (Z)!');
        levelComplete.show(stats.summary(), quests.quests.filter((x) => x.id !== 'extras' && x.id !== 'bonus').map((x) => ({ title: x.title, won: x.status === 'won' })), notes);
      }
      if (!level.sandbox) checkLevelDone();
      persist();
    } else if (n.type === 'lost') {
      audio.play('lose');
      hud.toast(`${q.title}: time is up! Try again in a moment`, 3);
    } else if (n.type === 'unlocked') {
      announce.show(`New quest: ${q.title}`, def.teaser ?? '', 'learned');
      audio.play('win');
    } else if (n.type === 'retry') {
      hud.toast(`${q.title}: ready to try again`, 1.4);
      if (q.id === 'bottle' || q.id === 'heist' || q.id === 'express') {
        interaction.restock((pr) => pr.tag === 'note' || pr.tag === 'warmBun' || !!pr.tag?.startsWith('heist')); // the bottle, the bun, the stolen goods come back for another try
        triggers.reset();
      }
    }
  }
}

function onNpcEvents(evs: NpcEvent[]): void {
  for (const e of evs) {
    if (e.type === 'noticed') {
      audio.play('gasp');
      notes(quests.onEvent('alert'));
      heat('noticed');
      if (!stealTipShown && e.npc.holding !== null) {
        stealTipShown = true;
        announce.show('Tip: guarded items', 'A red ring means they are guarding it. Dive at it from straight above, or make a noise to distract them and grab it with E from the open side.', 'learned');
      }
    } else if (e.type === 'panic' || e.type === 'chase') audio.play('yelp');
    else if (e.type === 'tookItem') {
      audio.play('pop');
      notes(quests.onEvent(`tookItem:${e.propType}`));
    } else if (e.type === 'yuck') {
      audio.play('yelp');
      hud.toast('Yuck!', 1.4);
      notes(quests.onEvent('yuck'));
    } else if (e.type === 'reclaimed') {
      audio.play('pop');
      hud.toast('They took it back!', 1.4);
    } else if (e.type === 'cheer') {
      audio.play('chime');
      hud.toast('The child hugs the teddy!', 2);
    } else if (e.type === 'review') {
      hud.toast('\u2605\u2606\u2606\u2606\u2606 "Tastes like the Baltic."', 3);
      notes(quests.onEvent('review'));
    } else if (e.type === 'soaked') {
      notes(quests.onEvent('soaked'));
      notes(quests.onEvent(`soaked:${e.npc.role}`));
    } else if (e.type === 'scared') {
      audio.play('gasp');
      notes(quests.onEvent(`owlScare:${e.npc.role}`));
      if (e.carried) notes(quests.onEvent('owlScare:carried'));
    } else if (e.type === 'snatchUnseen') {
      hud.toast('They never saw it coming.', 1.6);
      notes(quests.onEvent('snatchUnseen'));
    } else if (e.type === 'distracted') {
      if (e.npc.holding !== null) {
        hud.toast('They look away...', 1.2);
        notes(quests.onEvent('distract'));
      }
    } else if (e.type === 'signSplat') {
      audio.play('gasp');
      notes(quests.onEvent('signSplat'));
      if (e.splats >= 3) {
        hud.toast('He is losing it!', 1.6);
        notes(quests.onEvent('frantic'));
      }
    } else if (e.type === 'cleanerRobbed') {
      hud.toast('His fish! He did not even notice.', 1.8);
      notes(quests.onEvent('cleanerRobbed'));
    } else if (e.type === 'selfieClick') {
      audio.play('pop');
      if (e.inFrame) {
        hud.toast('Photobomb! Best selfie ever.', 2);
        interaction.debris.burst({ x: e.npc.x, y: 2.2, z: e.npc.z }, 0xffffff, 10); // camera flash
        notes(quests.onEvent('photobomb'));
        if (e.framed >= 2) notes(quests.onEvent('coop:photobomb'));
      }
    } else if (e.type === 'arrived' && e.goal === 'stormoff') {
      notes(quests.onEvent('dateOver'));
    } else if (e.type === 'arrived' && e.goal === 'ferry') {
      hud.toast('They are waiting at the wrong ferry...', 1.8);
      notes(quests.onEvent('wrongFerry'));
    }
  }
}

const combo = new CoopCombo();
/** Who last held each prop (for "pass the parcel"). */
const lastHolder = new Map<number, { by: number; t: number }>();

/** Crow call: a noise ahead of `g` that makes people look. */
function mimic(g: Gull, yaw: number): void {
  const at = aheadOf(g.state, yaw, tuning.skills.mimicDistance.value);
  noise(at.x, at.z, tuning.skills.mimicLoud.value);
  pings.add(at.x, at.z);
  audio.play('crow');
  notes(quests.onEvent('caw'));
  g.openBeak(0.5);
  hud.toast('Caw! Caw!', 0.8);
}
/** Flock call: a few gulls fly to a spot ahead of `g` and dirty it. */
function flockCall(g: Gull, yaw: number): void {
  const at = aheadOf(g.state, yaw, tuning.skills.flockDistance.value);
  flock.start({ x: g.state.x, y: g.state.y, z: g.state.z }, at);
  pings.add(at.x, at.z);
  audio.play('screech');
  notes(quests.onEvent('flock'));
  g.openBeak(0.6);
  hud.toast('Flock call!', 0.9);
}

function onGags(gags: GagEvent[]): void {
  for (const g of gags) {
    switch (g.type) {
      case 'poopDrop': {
        tutorial.event('poop');
        const pg = players[g.by ?? 0]?.gull.state;
        if (isHost() && pg) net!.sendEvent({ k: 'poop', p: [pg.x, pg.y, pg.z], v: [pg.vx, pg.vy, pg.vz] });
        break;
      }
      case 'grab':
        tutorial.event('grab');
        audio.play('pop');
        (players[g.by ?? 0]?.gull ?? gull).openBeak(0.25);
        hud.toast(`Got the ${g.prop.def.name}!`, 0.7);
        if (g.prop.tag) notes(quests.onEvent(`grab:${g.prop.tag}`));
        if (g.prop.tag === 'wardenSandwich' && defense?.warden?.mode === 'lunch') notes(quests.onEvent('sandwichUnseen')); // took it while he was still eating
        notes(quests.onEvent(`grab:${g.prop.type}`));
        if (players.length > 1) {
          const by = g.by ?? 0;
          const was = lastHolder.get(g.prop.id);
          if (was && was.by !== by && simTime - was.t <= 6) notes(quests.onEvent('coop:handover'));
          lastHolder.set(g.prop.id, { by, t: simTime });
        }
        break;
      case 'drop':
        lastHolder.set(g.prop.id, { by: g.by ?? 0, t: simTime });
        break;
      case 'toss':
        audio.play('hop');
        lastHolder.set(g.prop.id, { by: g.by ?? 0, t: simTime });
        break;
      case 'heavy':
        hud.toast(`The ${g.prop.def.name} is too heavy!`, 0.8);
        break;
      case 'splat':
        audio.play('splat');
        noise(g.x, g.z, 0.4);
        break;
      case 'snatch':
        audio.play('yelp');
        hud.toast('Snatched!', 1);
        notes(quests.onEvent(`snatch:${g.prop.type}`));
        notes(quests.onEvent('snatch'));
        if (players.length > 1 && combo.hit('snatch', g.by ?? 0, simTime, 5)) notes(quests.onEvent('coop:snatch'));
        if (simTime - lastSnatchAt < 8) {
          hud.toast('Double snatch!', 1.6);
          notes(quests.onEvent('doubleSnatch'));
        }
        lastSnatchAt = simTime;
        stats.add('snatch');
        heat('snatch');
        break;
      case 'poopNpc':
        audio.play('splat');
        audio.play('yelp');
        hud.toast('Splat! Right on a tourist!', 1.1);
        notes(quests.onEvent('poopNpc'));
        if (players.length > 1 && combo.hit('poopNpc', g.by ?? 0, simTime, 5)) notes(quests.onEvent('coop:poopNpc'));
        if (g.role) notes(quests.onEvent(`poopNpc:${g.role}`));
        stats.add('poopPerson');
        heat('poopNpc');
        break;
      case 'poopProp':
        audio.play('splat');
        hud.toast(`Splat! ${g.prop.def.name}`, 0.9);
        if (g.prop.tag === 'cleanSign' && npcs?.signSplatted()) hud.toast('The Clean Freak drops everything to scrub!', 1.6);
        break;
      case 'break': {
        audio.play('crash');
        cam.shake(0.45);
        hud.toast('Crash!', 0.9);
        const t = g.prop.cur.p;
        noise(t.x, t.z, 1);
        heat('break');
        stats.add('break');
        if (g.prop.type === 'bottle') notes(quests.onEvent('breakBottle'));
        break;
      }
      case 'clatter': {
        // a noisy prop clangs (loud, adds heat); anything else thrown hard just thumps (quieter, but still distracts)
        audio.play(g.quiet ? 'thud' : 'clatter');
        noise(g.prop.cur.p.x, g.prop.cur.p.z, g.quiet ? 0.6 : 1);
        if (!g.quiet) heat('clatter');
        break;
      }
      case 'tipped': {
        hud.toast(`${g.prop.def.name} tipped over!`, 1);
        const t = g.prop.cur.p;
        noise(t.x, t.z, 1);
        heat('tipped');
        stats.add('tip');
        if (g.prop.type === 'bin') notes(quests.onEvent('tipBin'));
        if (g.prop.type === 'chair') notes(quests.onEvent('tipChair'));
        break;
      }
    }
  }
}

applyLevelRules(); // the first level's own rules (heat, lunch, current)

startLoop({
  update(dt) {
    simTime += dt;
    music.setTier(musicDirector.update(dt, defense?.heat.tier ?? 0, quests.quests.some((q) => q.id === 'finale' && q.status === 'active')));
    music.update(dt);
    const m = input.consumeMouse();
    if (title.visible) {
      cam.yaw += dt * 0.12; // slow drift behind the title
      if (input.wasPressed('Enter')) startPlaying();
      input.endStep();
      return;
    }
    if (input.wasPressed('KeyO')) optionsPanel.toggle();
    if (input.wasPressed('KeyL')) {
      if (levelSelect.visible) levelSelect.hide();
      else levelSelect.show(levelRows());
      if (levelSelect.visible && document.pointerLockElement) document.exitPointerLock(); // free the mouse to click a level
    }
    if (input.wasPressed('Escape')) {
      // Esc: close whatever is open, else open the options (the first Esc in mouse-look only frees the mouse)
      if (menuNav.panel() && !title.visible) menuNav.handle('b');
      else if (!title.visible) optionsPanel.show();
    }
    if (input.wasPressed('KeyU')) {
      options.hud = nextHudMode(options.hud);
      hudF = applyHud(options.hud);
      optStore.save(options);
      hud.toast(`HUD: ${HUD_NAMES[options.hud]}`, 0.9);
    }
    if (input.wasPressed('KeyT') && tutorial.running) {
      tutorial.skip();
      options.tutorialDone = true;
      optStore.save(options);
    }
    if (!menuOpen()) cam.rotate(m.dx, m.dy);
    if (input.wasPressed('KeyN')) lobby.toggle();
    if (input.wasPressed('KeyR')) {
      if (isGuest()) hud.toast('The host restarts the level.', 1.4);
      else {
        restartLevel('normal');
        if (isHost()) levelRev++;
      }
    }
    if (input.wasPressed('KeyZ')) {
      if (save.replayUnlocked) {
        restartLevel('speedrun');
        hud.toast('Speedrun! The clock starts when you move.', 2);
      } else hud.toast('Clear the finale to unlock the speedrun.', 1.6);
    }
    if (input.wasPressed('KeyX')) {
      if (save.replayUnlocked) {
        const on = !save.extrasOn;
        save = { ...save, extrasOn: on };
        notes(quests.setFlag('replay', on));
        hud.toast(on ? 'Extra objectives on' : 'Extra objectives off', 1.4);
        persist();
      } else hud.toast('Clear the finale to unlock extra objectives.', 1.6);
    }
    if (input.wasPressed('KeyK')) {
      skillsPanel.toggle(skills, save);
      if (skillsPanel.visible && document.pointerLockElement) document.exitPointerLock(); // free the mouse to click a look
    }
    if (skillsPanel.visible) GULL_SKINS.forEach((sk, i) => input.wasPressed(`Digit${i + 1}`) && pickSkin(sk.id));
    if (input.wasPressed('KeyC')) credits.toggle();
    if (input.wasPressed('Enter') && levelComplete.visible && !levelComplete.goNext()) levelComplete.hide();
    if (input.wasPressed('KeyH') && !menuOpen()) {
      if (isGuest()) net!.tap('KeyH');
      else if (defense?.activateHawk()) {
        hud.toast('Hawk-eye!', 0.8);
        notes(quests.onEvent('hawk'));
      }
    }
    if (input.wasPressed('KeyM')) {
      hud.toast(audio.toggleMute() ? 'Sound off' : 'Sound on', 0.8);
      music.muted = audio.muted;
      persist();
    }
    // an open panel pauses the game, except online: the other player must not freeze, so you just stop steering
    const blocked = menuOpen();
    if (blocked && !net) {
      input.endStep();
      return;
    }
    // active skills
    if (abilities.tick(dt)) {
      notes(quests.onEvent('disguiseEnded'));
      gull.setDisguise(false);
      hud.toast('The disguise is over', 1.2);
    }
    // pigeon levels: a disguised gull must walk like a pigeon: flying or running gives it away
    if (level.pigeonRules && abilities.disguised && !blocked && (gull.state.mode !== 'ground' || Math.hypot(gull.state.vx, gull.state.vz) > tuning.walk.speed.value * 1.25)) {
      abilities.breakDisguise();
      gull.setDisguise(false);
      hud.toast('Pigeons do not fly! Your disguise is blown.', 1.8);
    }
    if (!blocked && input.wasPressed('KeyV') && skills.has('mimic') && abilities.use('mimic')) {
      if (isGuest()) net!.tap('KeyV'); // the host makes the noise
      else mimic(gull, cam.yaw);
    }
    if (!blocked && input.wasPressed('KeyG') && skills.has('flock') && abilities.use('flock')) {
      if (isGuest()) net!.tap('KeyG');
      else flockCall(gull, cam.yaw);
    }
    if (!blocked && input.wasPressed('KeyB') && skills.has('disguise') && abilities.use('disguise')) {
      gull.setDisguise(true);
      audio.play('pop');
      hud.toast('Pigeon mode! The vendors and the Warden ignore you.', 1.6);
    }
    for (const n of flock.update(dt)) noise(n.x, n.z, 0.9);
    for (const d of flock.takeDrops()) interaction.dropDecoyPoop(d, simTime);
    pings.update(dt);
    // speedrun clock: starts on the first move
    if (runTimer.mode === 'speedrun' && !runTimer.running && !runTimer.finished && (input.axes().x !== 0 || input.axes().y !== 0 || input.isDown('Space'))) runTimer.begin();
    runTimer.tick(dt);
    const { x, y } = blocked ? { x: 0, y: 0 } : input.axes();
    if (x !== 0 || y !== 0) tutorial.event('move');
    if (tutorial.tick(dt)) {
      options.tutorialDone = true;
      optStore.save(options);
    }
    // target lock: Tab picks the best target in view, again the next one, then off
    const cands = lockCandidates();
    if (!blocked && input.wasPressed('Tab')) {
      const next = nextLock(lockId, rankCandidates(gull.state, cam.yaw, cands, tuning.lock.range.value, tuning.lock.coneDeg.value));
      lockId = next;
      lockNow = resolveLock(lockId, cands, gull.state, Infinity);
      hud.toast(lockNow ? `Locked on ${lockNow.label}` : 'Lock off', 0.9);
    }
    lockNow = resolveLock(lockId, cands, gull.state, tuning.lock.maxRange.value);
    if (lockId && !lockNow) {
      lockId = null;
      hud.toast('Lock lost', 0.8);
    }
    const lockPoint = lockNow ? { x: lockNow.x, y: lockNow.y, z: lockNow.z } : null;
    const wasDive = gull.state.mode === 'dive';
    const evs = gull.update(
      { ax: x, ay: y, flap: !blocked && input.isDown('Space'),
        dive: !blocked && (input.isDown('ShiftLeft') || input.isDown('ShiftRight')),
        aimPitch: cam.pitch,
        carryMass: isGuest() ? guestCarryMass : interaction.carriedMass(0),
        lock: lockPoint,
        lift: thermalLift(gull.state),
      },
      cam.yaw,
      dt,
      world,
      simTime,
      npcs ? [...targets, ...npcs.handTargets()] : targets,
    );
    onFlightEvents(evs);
    if (npcs?.pushGull(gull.state) && simTime - lastBump > 1) {
      lastBump = simTime;
      audio.play('bonk');
      hud.toast('Blocked! They are guarding it', 1.1);
    }
    if (isGuest()) {
      // the guest only flies; grabbing and pooping are decided by the host
      if (!blocked && input.wasPressed('KeyE')) net!.tap('KeyE');
      if (!blocked && input.wasPressed('KeyQ')) net!.tap('KeyQ');
      if (!blocked && (input.wasPressed('KeyF') || input.wasClicked())) net!.tap('KeyF');
    } else onGags(interaction.updateGull(0, gull.state, { grab: !blocked && input.wasPressed('KeyE'), toss: !blocked && input.wasPressed('KeyQ'), poop: !blocked && (input.wasPressed('KeyF') || input.wasClicked()), lock: lockPoint ? { ...lockPoint, r: lockNow!.radius } : null }, dt, simTime));
    // other players: their own flight and beak (the camera stays on player 1)
    for (const p of players) {
      if (p.id === 0) continue;
      if (p.remote) {
        if (isHost()) {
          const f = net!.guestFrame;
          if (f) p.gull.setRemote(f.s);
          p.gull.stepRemote(dt);
          const taps = net!.takeTaps();
          const yaw = net!.guestFrame?.yaw ?? 0;
          if (taps.includes('KeyV')) mimic(p.gull, yaw);
          if (taps.includes('KeyG')) flockCall(p.gull, yaw);
          if (taps.includes('KeyH') && defense?.activateHawk()) hud.toast('Hawk-eye!', 0.8);
          onGags(interaction.updateGull(p.id, p.gull.state, { grab: taps.includes('KeyE'), toss: taps.includes('KeyQ'), poop: taps.includes('KeyF'), lock: net!.guestFrame?.s.lk ? { x: net!.guestFrame.s.lk[0], y: net!.guestFrame.s.lk[1], z: net!.guestFrame.s.lk[2], r: 0.9 } : null }, dt, simTime));
        } else p.gull.stepRemote(dt); // on a guest this is the host's gull
        continue;
      }
      const look = p.input.consumeMouse();
      p.yaw -= look.dx * tuning.camera.mouseSensitivity.value;
      p.pitch = Math.min(1.2, Math.max(-0.3, p.pitch + look.dy * tuning.camera.mouseSensitivity.value));
      const ax = p.input.axes();
      p.gull.update(
        { ax: ax.x, ay: ax.y, flap: p.input.isDown('Space'), dive: p.input.isDown('ShiftLeft'), aimPitch: p.pitch, carryMass: interaction.carriedMass(p.id) },
        p.yaw,
        dt,
        world,
        simTime,
        targets,
      );
      onGags(interaction.updateGull(p.id, p.gull.state, { grab: p.input.wasPressed('KeyE'), toss: p.input.wasPressed('KeyQ'), poop: p.input.wasPressed('KeyF') }, dt, simTime));
      p.input.endStep();
    }
    if (isGuest()) guestStep(dt);
    else onGags(interaction.step(dt, simTime, gull.state));
    if (npcs && !isGuest()) {
      const g = gull.state;
      onNpcEvents(npcs.update(dt, players.map((p) => ({ x: p.gull.state.x, y: p.gull.state.y, z: p.gull.state.z, diving: p.gull.state.mode === 'dive' }))));
      const stolen = players.some((p) => interaction.beak(p.id).carried?.stolen === true);
      notes(quests.tick({ dt, carryingStolen: stolen, nearestNpc: Math.min(...players.map((p) => npcs.nearestDistance(p.gull.state))) }));
      if (defense) {
        const gulls = players.map((p) => ({ id: p.id, state: p.gull.state, hidden: p.remote ? p.gull.remoteDisguised : p.id === 0 && abilities.disguised, suspicious: interaction.beak(p.id).carried?.stolen === true }));
        onDefense(defense.update(dt, gulls, stepNoises, npcs.npcs.some((n) => n.seesGull)));
        if (!heat60Fired && defense.heat.value >= 60) {
          heat60Fired = true;
          notes(quests.onEvent('heat60'));
        }
      }
      // the plastic owl frightens people (and vendors) near it, on the ground or in the beak
      owlCd = Math.max(0, owlCd - dt);
      const owl = owlCd === 0 ? interaction.props.props.find((p) => p.type === 'owl' && !p.broken && p.heldBy === null) : undefined;
      if (owl) {
        const range = tuning.owl.scareRange.value;
        const sc = npcs.scareNear(owl.cur.p.x, owl.cur.p.z, range, owl.carried);
        const vs = defense?.scareVendors(owl.cur.p.x, owl.cur.p.z, range) ?? 0;
        if (sc.length || vs) {
          owlCd = tuning.owl.cooldown.value;
          if (vs) {
            hud.toast('The vendor freezes: is that a real owl?', 1.6);
            notes(quests.onEvent('owlScare:vendor'));
          }
        }
      }
      stepNoises.length = 0;
      // world triggers (delivery zones, the sea, the ferry horn, bun checkpoints) -> quest events
      const views: PropView[] = interaction.props.props.map((p) => ({
        id: p.id, type: p.type, tag: p.tag, x: p.cur.p.x, y: p.cur.p.y, z: p.cur.p.z, free: !p.broken && !p.carried && p.heldBy === null,
      }));
      const car = interaction.carried;
      const fired = triggers.update(
        {
          props: views,
          gull: { x: g.x, y: g.y, z: g.z, grounded: g.mode === 'ground' },
          carried: car ? { type: car.type, tag: car.tag, x: car.cur.p.x, y: car.cur.p.y, z: car.cur.p.z, free: false } : null,
          npcs: npcs.npcs.map((n) => ({ role: n.role, x: n.x, z: n.z })),
          isLand,
          dt,
        },
        quests.wanted(),
      );
      for (const ev of fired) {
        notes(quests.onEvent(ev));
        if (ev === 'mapInSea') {
          const map = views.find((v) => v.type === 'map' && v.free && !isLand(v.x, v.z));
          if (map?.id !== undefined) npcs.sendVictimTo(map.id, WRONG_FERRY.x, WRONG_FERRY.z, 'ferry');
        }
      }
      stats.tick(dt, defense?.heat.value ?? 0);
    }
    if (isHost() && players.length > 1 && ++snapTick % 3 === 0) net!.sendSnapshot(captureSnapshot(), level.id, levelRev); // about 20 per second
    if (wasDive) {
      const s = gull.state;
      const got = diveHits(targets, { x: s.x, y: s.y, z: s.z }, GULL_RADIUS);
      if (got.length) {
        hits += got.length;
        audio.play('chime');
        hud.toast(got.length > 1 ? `Double hit! x${got.length}` : 'Got it!', 0.8);
      }
    }
    // flying events: riding a new thermal, reaching a great height
    (level.thermals ?? []).forEach((t, i) => {
      if (!thermalsSeen.has(i) && Math.hypot(gull.state.x - t.x, gull.state.z - t.z) <= t.r && gull.state.mode !== 'ground') {
        thermalsSeen.add(i);
        hud.toast('A thermal! Spread your wings and rise.', 1.4);
        notes(quests.onEvent('thermal'));
      }
    });
    if (!altitudeFired && gull.state.y > 80) {
      altitudeFired = true;
      notes(quests.onEvent('altitude80'));
    }
    streetLife?.update(dt, gull.state);
    updateTargets(targets, dt);
    input.endStep();
  },
  render(alpha, frameDt) {
    for (const p of players) p.gull.applyInterpolation(alpha, frameDt, world);
    pad.poll(frameDt, tuning.gamepad.deadzone.value, tuning.gamepad.lookSpeed.value);
    interaction.render(alpha, gull.state, simTime, cam.camera.quaternion);
    npcs?.render(simTime, interaction.beakPos(gull.state), cam.camera.quaternion);
    streetLife?.render(simTime, gull.state);
    defense?.render(simTime, frameDt);
    if (defense && heatMeter) heatMeter.update(defense.heat, defense.response, defense.hawkReady, defense.hawkActive);
    // quest spots, plus a marker on any item that was knocked out of the beak (so it can never be lost)
    const markers: Marker[] = greybox ? [] : activeMarkers(setup.quests, quests.quests);
    const labelled = hudF.waypoints === 'all' ? markers : hudF.waypoints === 'active' ? activeMarkers(setup.quests, quests.quests, true) : [];
    // a small timer on its own when the to-do note is hidden
    const timed = hudF.miniTimer ? quests.quests.find((q) => q.status === 'active' && q.timed) : undefined;
    miniTimer.hidden = !timed;
    if (timed) {
      const sec = Math.max(0, Math.ceil(timed.timeLeft));
      miniTimer.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
      miniTimer.classList.toggle('low', sec <= 10);
    }
    for (const p of interaction.props.props) {
      if (!p.lost || p.broken || p.carried || p.heldBy !== null || markers.length >= 8) continue;
      markers.push({ x: p.cur.p.x, z: p.cur.p.z, r: 1.6, y: Math.max(0, p.cur.p.y - 0.3), label: `Dropped ${p.def.name}` });
    }
    skillsPanel.updateBar(skills, abilities);
    runHud.update(runTimer, save.speedrunBest);
    markerPool.update(markers, simTime);
    waypoints.update(labelled, cam.camera, gull.position, innerWidth, innerHeight);
    todo.update(quests.quests, npcs ? npcs.nearestDistance(gull.state) : Infinity, interaction.carried?.stolen === true);
    targets.forEach((t, i) => (targetMeshes[i].visible = t.cooldown === 0));
    const s = gull.state;
    // dive aim aid: where a dive would land, and which target (if any) is on the line
    const diving = s.mode === 'dive';
    const canDive = s.mode === 'air' && s.stunT === 0 && s.heightAbove >= tuning.dive.minHeight.value;
    let aimTarget: ReturnType<typeof bestAimTarget> = null;
    if (diving || canDive) {
      const heading = diving ? s.heading : cam.yaw;
      const angle = diving ? s.diveAngle : aimDiveAngle(cam.pitch);
      aimTarget = bestAimTarget(npcs ? [...targets, ...npcs.handTargets()] : targets, s, heading, angle);
      marker.update(gull.position, divePreview(s, heading, angle, world), aimTarget !== null, diving);
    } else {
      marker.update(null, null, false, false);
    }
    targets.forEach((t, i) => targetMeshes[i].scale.setScalar(t === aimTarget ? 1.5 : 1));
    // poop aim reticle + context prompt
    const poopReady = 1 - Math.min(1, interaction.poopCd / (tuning.poop.cooldown.value * mods.poopCooldown));
    const aimPoop = s.mode !== 'ground' && s.stunT === 0 && interaction.poopCd <= 0;
    const poopHit = aimPoop ? interaction.poopPrediction(s, simTime, lockNow ? { x: lockNow.x, y: lockNow.y, z: lockNow.z, r: lockNow.radius } : null) : null;
    lockMarker.update(lockNow, lockNow?.radius ?? 1, cam.camera, simTime, lockNow ? Math.hypot(lockNow.x - s.x, lockNow.z - s.z) : 0);
    const blocked = poopHit?.tag === 'umbrella';
    poopReticle.update(poopHit, blocked);
    touchControls?.update(interaction.grabPrompt(s), !!interaction.carried, { V: skills.has('mimic'), G: skills.has('flock'), B: skills.has('disguise') }, (code) => abilities.fraction(code === 'KeyV' ? 'mimic' : code === 'KeyG' ? 'flock' : 'disguise'));
    hud.setInteraction(blocked ? 'Umbrella blocks it! Distract the Warden with a noise first (drop or throw a bottle)' : interaction.grabPrompt(s), poopReady);
    cam.update(gull.position, frameDt, { vx: s.vx, vy: s.vy, vz: s.vz, diving: s.mode === 'dive', turnRate: s.turnRate });
    audio.setAir(Math.hypot(s.vx, s.vy, s.vz) / tuning.dive.speed.value, s.mode !== 'ground');
    graphics.update(gull.position);
    water?.update(simTime);
    ripples.update(frameDt);
    rippleT -= frameDt;
    if (s.mode === 'ground' && s.overWater && rippleT <= 0) {
      rippleT = Math.hypot(s.vx, s.vz) > 0.4 ? 0.45 : 1.6; // paddling makes more rings than floating
      ripples.add(s.x, s.z, 0.8);
    }
    renderer.render(scene, cam.camera);
    debug.frame(frameDt, `${renderer.info.render.calls} calls · ${(renderer.info.render.triangles / 1000).toFixed(0)}k tris`);
    const tip = tutorial.current;
    tipEl.hidden = !(tip || tutorial.outroShowing) || menuOpen();
    if (!tipEl.hidden) tipEl.innerHTML = tip ? (touch ? `${tip.touch.text} <small>${tip.touch.keys} · ☰ › Skip tips</small>` : `${tip.text} <small>${tip.keys} · T skips tips</small>`) : 'That is the whole trick. The to-do list (top left) has the rest. Go be a menace!';
    hud.update(s, staminaMax(), windAt(simTime), cam.yaw, hits, targets.length, frameDt);
  },
});

(window as unknown as { __lokkiReady: boolean }).__lokkiReady = true;
const boot = document.getElementById('boot');
boot?.classList.add('gone');
setTimeout(() => boot?.remove(), 700);
events.emit('ready', undefined);
