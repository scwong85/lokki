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
import type { LevelDef } from './data/levels/types';
import { reactionPlays, reactionsFor } from './data/reactions';
import { PlaytestLog, RATING_KEYS, recapOf } from './core/playtest';
import { hitOnlyReachable, introducedAt, isUnlocked, parseGate, switchHitAllowed, switchMech, type Gate, type MechId } from './gameplay/mechanics';
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
import type { DistrictSnap } from './net/snapshot';
import { PassTracker, Tangle, decoyCovers, spotterHit } from './gameplay/coopPlay';
import { Emotes, type EmoteKind } from './render/emotes';
import { Puffs, type PuffKind } from './render/puffs';
import { HavocRun } from './gameplay/havoc/scoring';
import { RunLog } from './gameplay/runLog';
import { HavocHud } from './ui/havocHud';
import { Tram } from './gameplay/tram';
import { PigeonGang } from './gameplay/pigeons';
import { PicnicGuests } from './world/picnicGuests';
import { RowTimes } from './gameplay/rowTimes';
import { PigeonRace, Raid, type ConeView } from './gameplay/pigeonRace';
import { PICNIC_COMMENTS } from './data/levels/picnic';
import { Sunbathers } from './gameplay/sunbathers';
import { Dog } from './gameplay/dogs';
import { Sprinklers } from './gameplay/sprinklers';
import { TramView, PigeonView, SunbatherView, DogView, SprinklerView } from './world/senateFx';
import { TriggerSystem, type PropView } from './gameplay/triggers';
import { TRIGGERS } from './data/triggers';
import { WRONG_FERRY } from './data/places';
import { LevelStats } from './gameplay/levelStats';
import { LevelComplete } from './ui/levelComplete';
import { Polaroids } from './ui/polaroids';
import { Outro, outroCamera, planRun, yawFor } from './gameplay/outro';
import { distanceGain } from './core/spatial';
import { TapHold } from './gameplay/tapHold';
import { comfort, followYawStep, FOLLOW_RATE, LookSmoother, smoothAxis, vignetteAmount } from './core/comfort';
import { activeMarkers } from './gameplay/questMarkers';
import type { Marker } from './data/quests';
import { MarkerPool } from './render/markers';
import { ladderSteps } from './gameplay/hintLadder';
import { buildDecor, setRibbonCut, TABLE_TOP, HALL } from './render/decor';
import { poisFor } from './data/pois';
import { strollerCount, strollerSpawns } from './gameplay/crowd';
import { ChainDetector, IdleNudge, badgesEarned } from './gameplay/chainReaction';
import { Timetable } from './gameplay/timetable';
import { ItemGlow } from './render/itemGlow';
import { wantedItems } from './gameplay/itemGlow';
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
import { Snow } from './render/snow';
import { KalleView } from './world/kalle';
import { Sky } from './render/sky';
import { tickMotion } from './render/motion';
import { districtOf } from './world/districts';
import { Birds } from './world/birds';
import { TRAM as SENATE_TRAM } from './data/levels/senate2';
import { STATUE, counter } from './data/places';
import { SKIES, skyById } from './data/skies';
import { LockMarker } from './render/lockMarker';
import { nextLock, rankCandidates, resolveLock, type LockCandidate } from './gameplay/lock';
import { POOP_TARGET_TAGS, PROPS, restY } from './data/props';
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
import { Post, postActive } from './render/post';

const app = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
const post = new Post(renderer);
post.resize();
app.appendChild(renderer.domElement);

const RAPIER = (await import('@dimforge/rapier3d-compat')).default;
await RAPIER.init();
// rigged people (CC0 Quaternius); without them the game falls back to simple capsule people
NpcModel.assets = await loadPeople(`${import.meta.env.BASE_URL}models/people/human.fbx`);
const phys = new PhysicsWorld(RAPIER);

const scene = createScene();
const graphics = new Graphics(renderer, scene);
const sky = new Sky(scene);
graphics.sky = sky;
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
// the gull starts where the level says (a stage in Senate Square must not begin at the Market Square)
const firstStart = { x: level.start?.x ?? start.x, z: level.start?.z ?? start.z };
/** Where the gull starts in the level that is loaded now (levels change in place, so this is not a constant). */
const levelStart = (): { x: number; z: number } => ({ x: level.start?.x ?? start.x, z: level.start?.z ?? start.z });
const gull = new Gull(firstStart);
phys.createGullBody(GULL_RADIUS, firstStart.x, GULL_RADIUS, firstStart.z);
const interaction = new Interaction(phys, world, scene);
if (!greybox) {
  gull.isWater = (x, z) => !isLand(x, z);
  interaction.props.isWater = (x, z) => !isLand(x, z);
}
// pedestrians and cyclists on the streets (cosmetic; fewer on the low graphics preset)
const lowGfx = new OptionsStore().load().graphics === 'low' || new URLSearchParams(location.search).has('touch');
// small white birds circling over the harbour, the parks and the squares (fewer on the low preset)
const birds = greybox ? null : new Birds(lowGfx ? 8 : 16);
if (birds) scene.add(birds.mesh);
const streetLife = greybox ? null : new StreetLife(scene, walkable, keepClearSpots, Math.round(tuning.street.walkers.value * (lowGfx ? 0.5 : 1)), Math.round(tuning.street.cyclists.value * (lowGfx ? 0.5 : 1)));
const ripples = new Ripples();
scene.add(ripples.group);
let rippleT = 0;
for (const sp of [...propSpawns, ...setup.props]) interaction.props.spawn(sp);
// tourists and the quest log only exist in the city
const npcs = greybox ? null : new NpcManager(world, interaction.props, scene, walkable);
if (npcs) {
  for (const sp of setup.tourists) npcs.spawn(sp);
  for (const sp of strollerSpawns(level.id, levelStart(), strollerCount(level), walkable, setup.tourists, poisFor(level.district))) npcs.spawn(sp);
  npcs.stations = [...(level.stations ?? [])];
  npcs.crumbs = [...(level.crumbs ?? [])];
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
    onGroundPickup: (id) => npcs.onGroundPickup(id),
    tugCandidates: (b) => npcs.tugCandidates(b),
    onTugStart: (id) => npcs.onTugStart(id),
    onTugEnd: (id, won) => npcs.onTugEnd(id, won),
    pullOf: (id) => npcs.pullOf(id),
    isTugged: (id) => npcs.isTugged(id),
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
// every game event passes through here: it goes in the run log, and scores in Havoc Hour
{
  const raw = quests.onEvent.bind(quests);
  quests.onEvent = (type) => {
    runLog.add(simTime, type);
    if (type === 'ribbonCut') for (const r of decorRibbons) setRibbonCut(r, true);
    nudge.poke();
    const hit = isGuest() ? null : chain.feed(simTime, type);
    if (hit) {
      runLog.add(simTime, `chain:${hit.kinds}`);
      hud.toast(`Chain reaction! ×${hit.kinds}`, 2);
      polaroids.request('Chain reaction!');
      audio.play('chime');
    }
    const r = havoc?.feed(type);
    if (r) {
      havocHud.pop(r);
      if (!r.repeat && r.mult > 1) audio.play('chime'); // a rising multiplier gets a bell
    }
    return raw(type);
  };
}
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
const polaroidsProjectV = new THREE.Vector3();
const polaroids = new Polaroids(document.body);
polaroids.project = (p) => {
  polaroidsProjectV.set(p.x, p.y, p.z).project(cam.camera);
  return { x: (polaroidsProjectV.x + 1) / 2, y: (1 - polaroidsProjectV.y) / 2, onScreen: polaroidsProjectV.z < 1 && Math.abs(polaroidsProjectV.x) < 0.95 && Math.abs(polaroidsProjectV.y) < 0.95 };
};
const tugEl = document.createElement('div'); // the tug-of-war meter
tugEl.id = 'tugbar';
tugEl.hidden = true;
tugEl.innerHTML = '<span>TUG!</span><b><i></i></b>';
document.body.appendChild(tugEl);
const vignetteEl = document.createElement('div'); // the comfort vignette: darkens the edges in fast turns and dives
vignetteEl.id = 'comfort-vignette';
document.body.appendChild(vignetteEl);
if (navigator.webdriver) document.body.classList.add('no-anim'); // browser tests run on software rendering
document.getElementById('levelcomplete')?.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest('button')) levelComplete.hide(); // tap anywhere else to keep playing (phones)
});
const markerPool = new MarkerPool();
const waypoints = new Waypoints(document.body);
scene.add(markerPool.group);
const itemGlow = new ItemGlow();
scene.add(itemGlow.group);
const todo = new Todo(document.body);
todo.defs = setup.quests;
todo.secret = setup.secret;
todo.side = setup.side;
const skillsPanel = new SkillsPanel(document.body, (id) => pickSkin(id));
const runHud = new RunHud(document.body);
/** Havoc Hour: the chain scorer for a timed chaos run (null in normal levels), the log of everything that happened, and its screen. */
const havocHud = new HavocHud(document.body);
const runLog = new RunLog();
const chain = new ChainDetector();
const nudge = new IdleNudge();
let havoc: HavocRun | null = null;
let havocShown = false;
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
(window as unknown as { __lokki: unknown }).__lokki = { scene, gull, cam, world, interaction, npcs, quests, get defense() { return defense; }, get kalle() { return kalleView?.kalle ?? null; }, noise, heat, triggers, stats, notes, skills, abilities, runTimer, flock, music, musicDirector, store, players, PeerLink, startSession, get net() { return net; }, get level() { return level.id; }, get quiet() { return { clock: quietClock, left: quietLeft }; }, get sunbathers() { return sunbathers; }, get dogs() { return dogs.map((d) => d.dog); }, get sprinklers() { return sprinklers; }, get render() { return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }; }, get sky() { return sky; }, get polaroids() { return polaroids; }, get gate() { return gate; }, applyGates, get hidden() { return hiddenNow(gull.state); }, get playtest() { return playtest; }, strikePose: (k: string) => strikePose(players[0], k), photoPoses, get switches() { return level.switches ?? []; }, peckNow: () => { const sw = switchNear(gull.state); if (sw) peck(sw, players[0]); return !!sw; }, get tugProgress() { return interaction.tugProgress(0); }, get audio() { return audio; }, honkNow: () => honk(players[0]), cannonballAt: (x: number, z: number, impact: number) => cannonball(x, z, impact), ringBell, get outro() { return outro; }, finishLevelNow: () => checkLevelDone(), skies: SKIES, get havoc() { return havoc; }, get runLog() { return runLog; }, get emotes() { return emotes; }, get puffs() { return puffs; }, get passes() { return passes; }, get tangle() { return tangle; }, get tram() { return tram; }, get gang() { return gang; }, get rowTimes() { return rowTimes; }, tuning, get race() { return race; }, get raid() { return raid; }, get picnicGuests() { return guests; }, get bell() { return { clock: bellClock, left: bellLeft }; }, loadLevel, snapshot: () => captureSnapshot(), saveData: () => save, restartLevel };
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
post.resize();
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
        hud.flash({ spray: '#7ec8ff', swat: '#ffb347', line: '#ffffff', net: '#ffffff', drone: '#ff6b6b' }[h.kind]);
        gull.openBeak(0.7);
      }
      break;
    }
    case 'fx':
      puffs.burst(e.kind as PuffKind, { x: e.p[0], y: e.p[1], z: e.p[2] }, e.scale ?? 1);
      break;
    case 'emote':
      emoteOver(playerByNetId(e.g), e.e as EmoteKind, false);
      break;
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
  LEVELS.map((l) => ({ id: l.id, name: l.name, blurb: l.blurb, stars: starCount(save.levels[l.id]), district: l.district, series: l.series, arc: l.arc, stage: l.stage, current: l.id === level.id, sandbox: l.sandbox, locked: !levelUnlocked(l, save.levels), unlockHint: l.requires ? `Clear ${levelById(l.requires).name} first` : undefined, best: save.levels[l.id]?.best ? fmtClear(save.levels[l.id].best) : undefined }));
const controlsPanel = new ControlsPanel(document.body);
const menuNav = new MenuNav();
pad.menuOpen = () => menuOpen() || levelComplete.visible; // the level card takes the controller too (it does not pause the game)
pad.onMenu = (a) => menuNav.handle(a);
addEventListener('pointerdown', () => menuNav.clear());
const optionsPanel = new OptionsPanel(document.body, options, (o) => {
  applyOptions(o);
  if (o.graphics !== graphics.level) {
    graphics.apply(o.graphics);
    post.resize();
  }
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
/** Poses (the emote keys 1 to 4) count in a photo for a few seconds (Act 2). */
const posing = new Map<number, { kind: string; until: number }>();
let lastPose = '';
function strikePose(pl: Player | undefined, kind: string): void {
  if (!pl || !mech('pose')) return;
  posing.set(pl.id, { kind, until: simTime + tuning.pose.hold.value });
}
function photoPoses(who: number[]): string[] {
  return who.map((i) => players[i]).filter(Boolean).map((p) => posing.get(p.id)).filter((x): x is { kind: string; until: number } => !!x && x.until >= simTime).map((x) => x.kind);
}
/**
 * The punchline photo (M104): a to-do with a victim is photographed a beat later (when their reaction shows), framed on the victim's
 * head rather than the middle of the screen. No slow motion and no camera move (both felt wrong, M87): only the picture.
 */
function punchlinePhoto(role: string, caption: string): void {
  const victim = () => {
    const s = gull.state;
    const n = npcs?.npcs.filter((x) => x.role === role).sort((a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z))[0];
    return n ? { x: n.x, y: n.y + 1.7, z: n.z } : null;
  };
  beats.push({ at: simTime + tuning.juice.punchlineDelay.value, run: () => polaroids.request(caption, victim) });
}
/** Little things that happen a moment later (the second half of a double take). */
const beats: { at: number; run: () => void }[] = [];
function beatsStep(): void {
  for (let i = beats.length - 1; i >= 0; i--) if (simTime >= beats[i].at) beats.splice(i, 1)[0].run();
}
/** When each collection row was delivered, for the results card (M111). */
const rowTimes = new RowTimes();
const reactionsDone = new Set<string>();
/** How many times each quest event has happened in this level (for reactions that escalate). */
const eventCounts = new Map<string, number>();
/** The world answers a quest event (docs/design/puzzle-quality.md): a person's mood, someone walks over, an audience laughs. */
function runReactions(event: string): void {
  if (isGuest()) return;
  const count = (eventCounts.get(event) ?? 0) + 1;
  eventCounts.set(event, count);
  reactionsFor(level.reactions, event).forEach((r, i) => {
    if (!reactionPlays(r, `${level.id}:${event}:${i}`, count, reactionsDone)) return; // the first, second, third time can each get their own beat
    if (r.mood) npcs?.moodRole(r.mood.role, r.mood.mood);
    if (r.send) npcs?.sendRole(r.send.role, r.send.goals, r.send.stay);
    if (r.distract) npcs?.distractRole(r.distract.role, r.distract.seconds);
    if (r.oblivious) npcs?.obliviousRole(r.oblivious.role, r.oblivious.seconds);
    if (r.witness && npcs) {
      const w = r.witness;
      const centres = w.role ? npcs.npcs.filter((n) => n.role === w.role).map((n) => ({ x: n.x, z: n.z })) : w.x !== undefined && w.z !== undefined ? [{ x: w.x, z: w.z }] : [];
      const seen = new Set<number>();
      for (const c of centres) for (const n of npcs.near(c.x, c.z, w.r)) if (!seen.has(n.id)) { seen.add(n.id); emoteAtNpc(n, w.emote); }
    }
    if (r.say) hud.toast(r.say, 2.2);
    if (r.sound) audio.play(r.sound);
    if (r.noise && npcs) npcs.addNoise(r.noise.x, r.noise.z, r.noise.loud ?? 1);
    if (r.cast && npcs) {
      npcs.spawnLate(r.cast);
      for (const sp of r.cast) fx('dust', { x: sp.x, y: 0.4, z: sp.z }, 0.6);
    }
    if (r.spawn) {
      interaction.props.spawn({ type: r.spawn.type, x: r.spawn.x, y: restY(r.spawn.type), z: r.spawn.z, tag: r.spawn.tag });
      fx('stars', { x: r.spawn.x, y: 0.8, z: r.spawn.z }, 0.6);
    }
    if (r.hunt) defense?.alertWarden();
    if (r.emit) notes(quests.onEvent(r.emit));
  });
}
quests.hook = runReactions;
const playtest = new PlaytestLog((() => { try { return localStorage; } catch { return null; } })());
let ratingFor: { quest: string; until: number } | null = null;
const ratingEl = document.createElement('div');
ratingEl.id = 'playtest-card';
ratingEl.hidden = true;
ratingEl.style.cssText = 'position:fixed;left:12px;bottom:12px;padding:8px 12px;background:rgba(255,248,230,.92);border-radius:10px;font:600 13px system-ui;color:#4a3b2a;z-index:30;box-shadow:0 2px 8px rgba(0,0,0,.2)';
document.body.appendChild(ratingEl);
function askRating(quest: string, title: string): void {
  if (level.sandbox || navigator.webdriver) return;
  ratingFor = { quest, until: simTime + 9 };
  ratingEl.textContent = `${title}: how was that?  7 stuck · 8 got it · 9 funny`;
  ratingEl.hidden = false;
}
function ratingKeys(): void {
  if (!ratingFor) return;
  if (simTime > ratingFor.until) {
    ratingFor = null;
    ratingEl.hidden = true;
    return;
  }
  for (const [code, rating] of Object.entries(RATING_KEYS)) {
    if (input.wasPressed(code)) {
      playtest.add(level.id, ratingFor.quest, rating, simTime);
      hud.toast('Noted. Thanks!', 0.9);
      ratingFor = null;
      ratingEl.hidden = true;
      return;
    }
  }
}
const introShown = new Set<string>();
/** The opening beat of a campaign stage: what is new here (the place and the mechanics it introduces). */
function stageIntro(): void {
  if (!level.arc || !level.stage || introShown.has(level.id) || navigator.webdriver) return;
  introShown.add(level.id);
  if (level.intro) announce.show(level.intro.title, level.intro.text, 'learned');
  for (const m of introducedAt({ arc: level.arc, stage: level.stage })) announce.show(`New: ${m.name}`, m.tip, 'learned');
}
function startPlaying(): void {
  title.hide();
  stageIntro();
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
    levels: LEVELS.map((l) => ({ id: l.id, name: l.name, blurb: l.blurb, stars: starCount(save.levels[l.id]), district: l.district, series: l.series, arc: l.arc, stage: l.stage, current: l.id === level.id, sandbox: l.sandbox, locked: !levelUnlocked(l, save.levels), unlockHint: l.requires ? `Clear ${levelById(l.requires).name} first` : undefined })),
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
  post.resize();
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
      const big = e.impact >= tuning.cannon.minImpact.value;
      hud.toast(big ? 'CANNONBALL!' : 'Splash!', big ? 1.2 : 0.6);
      audio.play('splash', big ? 1.5 : 0.8);
      ripples.add(gull.state.x, gull.state.z, big ? 3.4 : 1.6);
      puffs.burst('splash', { x: gull.state.x, y: 0.2, z: gull.state.z }, big ? 2.4 : 1);
      if (big) cannonball(gull.state.x, gull.state.z, e.impact);
    } else if (e.type === 'land' && e.quality === 'hard') {
      hud.toast('Oof!');
      cam.shake(0.7);
      puffs.burst('dust', gull.state, 1.5);
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

/** A hard splashdown: a wave soaks whoever stands within reach (the bigger the dive, the wider it goes). */
function cannonball(x: number, z: number, impact: number): void {
  if (!mech('cannonball')) return;
  cam.shake(0.45);
  gull.wiggleT = 0.6;
  emotes.show('laugh', 'cannon', () => ({ x: gull.position.x, y: gull.position.y + 0.9, z: gull.position.z }), 1.6);
  if (isGuest()) return;
  const c = tuning.cannon;
  const r = Math.min(c.radiusMax.value, c.radiusBase.value + impact * c.radiusPerSpeed.value);
  const soaked = npcs?.soakRadius(x, z, r) ?? 0;
  noise(x, z, 2);
  notes(quests.onEvent('cannonball'));
  for (let k = 1; k <= Math.min(soaked, 6); k++) notes(quests.onEvent(`cannon${k}`));
  if (soaked > 0) {
    hud.toast(soaked === 1 ? 'Soaked one!' : `Soaked ${soaked}!`, 1.6);
    polaroids.request('Cannonball!');
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
/** The rival gull Kalle (levels with one). */
let kalleView: KalleView | null = null;
let kalleProp: ReturnType<typeof interaction.props.byId> = undefined;
function setupKalle(): void {
  if (kalleView) scene.remove(kalleView.group);
  kalleView = null;
  kalleProp = undefined;
  if (!level.kalle || greybox) return;
  kalleView = new KalleView({ x: level.kalle.x, z: level.kalle.z }, level.kalle.goal);
  scene.add(kalleView.group);
}
const KALLE_MODES = ['perch', 'seek', 'carry', 'flee'] as const;
/** Run Kalle one step (host / single player): which snacks are free, his grabs, deliveries and drops. */
function stepKalleGame(dt: number): void {
  const kv = kalleView;
  if (!kv) return;
  const snacks = interaction.props.props
    .filter((p) => PROPS[p.type].tags.includes('edible') && !p.broken && !p.carried && p.heldBy === null && p.cur.p.y < 2.2 && !p.tag?.startsWith('kalleHome'))
    .map((p) => ({ id: p.id, x: p.cur.p.x, y: p.cur.p.y, z: p.cur.p.z }));
  const gulls = players.map((p) => ({ x: p.gull.state.x, y: p.gull.state.y, z: p.gull.state.z, diving: p.gull.state.mode === 'dive' }));
  for (const e of kv.step(dt, snacks, gulls)) {
    const prop = interaction.props.byId(e.id);
    if (!prop) continue;
    if (e.type === 'grab') {
      interaction.props.grab(prop);
      kalleProp = prop;
      hud.toast('Kalle snatched a snack!', 1.1);
    } else if (e.type === 'deliver') {
      interaction.props.destroy(prop);
      kalleProp = undefined;
      hud.toast(`Kalle ate it: ${kv.kalle.score} / ${kv.goal}`, 1.4);
      if (kv.kalle.score >= kv.goal) {
        announce.show('Kalle wins the snack duel!', 'He got there first. Try again (R) and be faster.', 'alert');
        notes(quests.onEvent('kalleWins'));
        setTimeout(() => {
          if (kalleView === kv) {
            restartLevel('normal');
            if (isHost()) levelRev++;
          }
        }, 2600);
      }
    } else {
      interaction.props.release(prop, { x: 0, y: 2, z: 0 });
      kalleProp = undefined;
      hud.toast('Kalle dropped his snack!', 1.2);
      notes(quests.onEvent('kalleDrop'));
    }
  }
  if (kv.kalle.carrying !== null && kalleProp) interaction.props.setCarryTarget(kalleProp, kv.beak(), kv.kalle.heading);
}

/** Senate Square: the tram (a moving roof to ride, stopped by a bottle on the track) and the Pigeon Gang on the statue. */
let tram: Tram | null = null;
let tramView: TramView | null = null;
let gang: PigeonGang | null = null;
let gangView: PigeonView | null = null;
let rideT = 0;
let quietClock = 0;
let quietLeft = 0;
let quietCd = 0;
let hushCd = 0;
let onRoofBefore = false;
const roofBox: import('./world/collision').Box = { min: [0, 0, 0], max: [0, 0, 0], kind: 'perch', color: 0xb9c4cf };
const switchViews: THREE.Object3D[] = [];
/** Stage gating: which mechanics this level has (docs/design/arcs.md). `?gate=1.3` tries a stage's set; no gate means everything. */
let gate: Gate | null = null;
function updateGate(): void {
  gate = parseGate(new URLSearchParams(location.search).get('gate')) ?? level.gate ?? (level.arc && level.stage ? { arc: level.arc, stage: level.stage } : null);
}
const mech = (id: MechId): boolean => isUnlocked(id, gate);
/** Push the gate into the systems that enforce it (called when the level changes and every tick). */
function applyGates(): void {
  updateGate();
  interaction.gates = { poop: mech('poop'), toss: mech('toss'), tug: mech('tug') };
  if (npcs) npcs.gates = { contagion: mech('contagion'), slam: mech('slam'), slip: mech('slip') };
}
const lockedSeen = new Set<MechId>();
/** The first time a locked verb is tried: a soft "not yet" so nobody thinks the game is broken. */
function lockedCue(id: MechId): void {
  if (lockedSeen.has(id)) return;
  lockedSeen.add(id);
  hud.toast('Not yet: you will learn that later.', 1.4);
}
interface DominoRun { tiles: THREE.Group[]; start: number; dx: number; dz: number; fell: number }
let dominoes: DominoRun[] = [];
let disguiseT = 0;
let duetT = 0;
let capHat: THREE.Mesh | null = null;
const swept = new Set<number>();
/** Per-tick extras of the mischief toys: dominoes falling, the disguise running out, light things blown by low wingbeats. */
function toyStep(dt: number): void {
  applyGates();
  // a duet: every gull taunting at once for a few seconds (co-op)
  if (players.length > 1 && players.every((p) => p.gull.taunting)) {
    duetT += dt;
    if (duetT >= tuning.coop.duetSeconds.value) {
      duetT = -1e9; // once per taunt
      notes(quests.onEvent('coop:duet'));
    }
  } else duetT = 0;
  for (const d of dominoes) {
    const tf0 = simTime - d.start;
    d.tiles.forEach((t, i) => {
      const tf = tf0 - i * tuning.domino.interval.value;
      t.rotation.z = -Math.min(1, Math.max(0, tf / 0.35)) * 1.45;
      if (tf >= 0 && i >= d.fell) {
        d.fell = i + 1;
        audio.play('thud', 0.5);
        npcs?.knockAt(t.position.x + d.dx * 1.0, t.position.z + d.dz * 1.0, 1.1, { x: d.dx, z: d.dz });
      }
    });
  }
  if (disguiseT > 0) {
    disguiseT -= dt;
    if (disguiseT <= 0) hud.toast('The captain\'s cap blows away.', 1.4);
  }
  if (capHat) {
    capHat.visible = disguiseT > 0;
    capHat.position.set(gull.position.x, gull.position.y + 0.55, gull.position.z);
  }
  // wings low over the ground blow light things away
  const s = gull.state;
  if (mech('gust') && s.flapAnim < dt * 1.6 && s.mode !== 'ground' && s.heightAbove < tuning.gust.maxHeight.value && interaction.props) {
    const g = tuning.gust;
    let any = false;
    for (const p of interaction.props.free()) {
      if (PROPS[p.type].mass > g.maxMass.value) continue;
      const dx = p.cur.p.x - s.x, dz = p.cur.p.z - s.z;
      const d = Math.hypot(dx, dz);
      if (d > g.radius.value || p.cur.p.y > s.y) continue;
      const k = d > 0.05 ? 1 / d : 0;
      interaction.props.release(p, { x: (d > 0.05 ? dx * k : Math.sin(-s.heading)) * g.push.value, y: g.lift.value, z: (d > 0.05 ? dz * k : -Math.cos(s.heading)) * g.push.value });
      any = true;
    }
    if (any) puffs.burst('feathers', { x: s.x, y: s.y - 0.4, z: s.z }, 0.3);
  }
  const sw = level.sweep;
  if (sw) {
    for (const p of interaction.props.props) {
      if (p.tag !== sw.tag || swept.has(p.id)) continue;
      const z = sw.zone;
      if (p.cur.p.x >= z.minX && p.cur.p.x <= z.maxX && p.cur.p.z >= z.minZ && p.cur.p.z <= z.maxZ) {
        swept.add(p.id);
        notes(quests.onEvent(`${sw.event}:${swept.size}`));
        hud.toast('Swept away!', 1);
      }
    }
  }
}
function hiddenNow(s: { x: number; z: number; vx: number; vz: number; mode: string }): boolean {
  if (!mech('hide') || s.mode !== 'ground' || Math.hypot(s.vx, s.vz) > tuning.hide.maxSpeed.value) return false;
  return (level.hides ?? []).some((h) => Math.hypot(h.x - s.x, h.z - s.z) < h.r);
}
const switchCd = new Map<string, number>();
/** The ribbon decor of this level (it is cut when the `ribbonCut` event fires). */
const decorRibbons: THREE.Group[] = [];
const decorBoxes: import('@dimforge/rapier3d-compat').Collider[] = [];
function setupSwitches(): void {
  for (const g of switchViews) scene.remove(g);
  switchViews.length = 0;
  for (const c of decorBoxes) phys.removeCollider(c);
  decorBoxes.length = 0;
  decorRibbons.length = 0;
  // solid furniture for the gull and for people: tables, kiosks, jukeboxes and buttons (the tables' tops are perches)
  world.furniture.length = 0;
  const solid = (x: number, z: number, hx: number, hz: number, h: number, kind: 'perch' | 'prop'): void => {
    world.furniture.push({ min: [x - hx, 0, z - hz], max: [x + hx, h, z + hz], kind, color: 0 });
  };
  for (const d of level.decor ?? []) {
    if (d.kind === 'table' || d.kind === 'stall') solid(d.x, d.z, TABLE_TOP.hx, TABLE_TOP.hz, TABLE_TOP.y + TABLE_TOP.hy, 'perch');
    else if (d.kind === 'hall') solid(d.x, d.z, HALL.hx, HALL.hz, HALL.h, 'perch');
    else if (d.kind === 'kiosk') solid(d.x, d.z, 1.6, 0.6, 1.08, 'perch');
  }
  for (const sw of level.switches ?? []) if (sw.effect === 'dance' || sw.effect === 'alarm' || sw.effect === 'soak') solid(sw.x, sw.z, 0.55, 0.35, 1.5, 'perch');
  for (const d of level.decor ?? []) {
    const view = buildDecor(d);
    scene.add(view);
    switchViews.push(view);
    if (d.kind === 'ribbon') decorRibbons.push(view);
    if (d.kind === 'table' || d.kind === 'stall') decorBoxes.push(phys.addStaticBox(d.x, TABLE_TOP.y, d.z, TABLE_TOP.hx, TABLE_TOP.hy, TABLE_TOP.hz)); // (tables are not rotated in the levels that use them)
    if (d.kind === 'hall') decorBoxes.push(phys.addStaticBox(d.x, HALL.h / 2, d.z, HALL.hx, HALL.h / 2, HALL.hz)); // things put down on the roof stay there
  }
  dominoes = [];
  swept.clear();
  disguiseT = 0;
  if (!capHat) {
    capHat = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.35, 10), new THREE.MeshLambertMaterial({ color: 0xd9402f }));
    scene.add(capHat);
  }
  capHat.visible = false;
  switchCd.clear();
  for (const h of level.hides ?? []) {
    const bush = new THREE.Mesh(new THREE.SphereGeometry(h.r, 10, 8), new THREE.MeshLambertMaterial({ color: 0x6fae6a }));
    bush.scale.y = 0.8;
    bush.position.set(h.x, h.r * 0.6, h.z);
    scene.add(bush);
    switchViews.push(bush);
  }
  for (const sw of level.switches ?? []) {
    if (sw.effect === 'yank') {
      const t = new THREE.Group();
      const top = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.08, 14), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      top.position.y = 0.9;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.9, 8), new THREE.MeshLambertMaterial({ color: 0x8b6b4a }));
      leg.position.y = 0.45;
      const hang = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.35, 14, 1, true), new THREE.MeshLambertMaterial({ color: 0xff8fa3, side: THREE.DoubleSide }));
      hang.position.y = 0.75;
      t.add(top, leg, hang);
      for (let i = 0; i < 4; i++) {
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 10), new THREE.MeshLambertMaterial({ color: 0xffd36e }));
        plate.position.set(Math.cos(i * 1.57) * 0.6, 0.97, Math.sin(i * 1.57) * 0.6);
        t.add(plate);
      }
      t.position.set(sw.x, 0, sw.z);
      t.name = `cloth:${sw.id}`;
      scene.add(t);
      switchViews.push(t);
      continue;
    }
    if (sw.effect === 'domino') {
      const tg = sw.target ?? { x: sw.x + 8, z: sw.z };
      const n = sw.tiles ?? 8;
      const len = Math.hypot(tg.x - sw.x, tg.z - sw.z);
      const dx = (tg.x - sw.x) / len, dz = (tg.z - sw.z) / len;
      const tiles: THREE.Group[] = [];
      for (let i = 0; i < n; i++) {
        const t = new THREE.Group();
        t.position.set(sw.x + dx * (len * i) / (n - 1), 0, sw.z + dz * (len * i) / (n - 1));
        t.rotation.y = -Math.atan2(dz, dx);
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.6, 0.9), new THREE.MeshLambertMaterial({ color: i % 2 ? 0xf7a1c4 : 0xffd36e }));
        b.position.y = 0.8;
        t.add(b);
        scene.add(t);
        switchViews.push(t);
        tiles.push(t);
      }
      dominoes.push({ tiles, start: 1e9, dx, dz, fell: 0 });
      continue;
    }
    if (sw.effect === 'disguise') {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.2, 8), new THREE.MeshLambertMaterial({ color: 0x8b6b4a }));
      post.position.set(sw.x, 0.6, sw.z);
      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.45, 10), new THREE.MeshLambertMaterial({ color: 0xd9402f }));
      hat.position.set(sw.x, 1.45, sw.z);
      scene.add(post, hat);
      switchViews.push(post, hat);
      continue;
    }
    if (sw.effect === 'summon') {
      const by = sw.y ?? 0, tall = sw.hitOnly ? 1.6 : 0.9; // a door bell or a gong stands taller, out of beak's reach
      const bell = new THREE.Mesh(new THREE.SphereGeometry(sw.hitOnly ? 0.45 : 0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xffd36e }));
      bell.position.set(sw.x, by + tall, sw.z);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, tall, 8), new THREE.MeshLambertMaterial({ color: 0x8b6b4a }));
      base.position.set(sw.x, by + tall / 2, sw.z);
      scene.add(bell, base);
      switchViews.push(bell, base);
      continue;
    }
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.7), new THREE.MeshLambertMaterial({ color: sw.effect === 'dance' ? 0xc94f7c : sw.effect === 'alarm' ? 0xd9402f : 0x3f8fd9 }));
    body.position.y = 0.75;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.7, 12, 1, false, 0, Math.PI), new THREE.MeshLambertMaterial({ color: 0xffd36e }));
    top.rotation.z = Math.PI / 2;
    top.rotation.y = Math.PI / 2;
    top.position.y = 1.55;
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.05), new THREE.MeshBasicMaterial({ color: 0xfff3b0 }));
    glow.position.set(0, 0.95, 0.36);
    g.add(body, top, glow);
    g.position.set(sw.x, 0, sw.z);
    scene.add(g);
    switchViews.push(g);
  }
}
/** The switch the gull is next to (nothing carried), if any. */
function switchNear(s: { x: number; z: number }): NonNullable<LevelDef['switches']>[number] | null {
  for (const sw of level.switches ?? []) if (!sw.hitOnly && (sw.free || mech(switchMech(sw.effect))) && Math.hypot(sw.x - s.x, sw.z - s.z) < 2.4 && (switchCd.get(sw.id) ?? 0) <= 0) return sw;
  return null;
}
/** A splat or a thrown thing that lands on a switch sets it off, as a peck would (ring the bell from the sky, M101). */
function hitSwitch(x: number, z: number, by: 'thrown' | 'splat' = 'thrown'): void {
  if (isGuest()) return;
  for (const sw of level.switches ?? []) {
    if (!switchHitAllowed(sw.hitOnly, by)) continue; // a bell under an awning: a splat lands on the awning (M111)
    // a hit-only switch (a door bell, a gong on a roof) needs something to throw or drop, not the peck
    if (!(sw.free || (sw.hitOnly ? hitOnlyReachable(sw.hitOnly, mech) : mech(switchMech(sw.effect)))) || (switchCd.get(sw.id) ?? 0) > 0 || Math.hypot(sw.x - x, sw.z - z) > tuning.watch.hitRange.value) continue;
    peck(sw, players[0]);
    notes(quests.onEvent(`hit:${sw.id}`));
    return;
  }
}
function peck(sw: NonNullable<LevelDef['switches']>[number], pl: Player): void {
  switchCd.set(sw.id, sw.cooldown ?? 4);
  const s = pl.gull.state;
  pl.gull.openBeak(0.4);
  pl.gull.wiggleT = 0.4;
  audio.play(sw.effect === 'dance' ? 'jukebox' : sw.effect === 'alarm' ? 'alarm' : sw.effect === 'yank' ? 'crash' : sw.effect === 'summon' ? 'tramBell' : sw.effect === 'disguise' ? 'pop' : sw.effect === 'domino' ? 'thud' : 'splash');
  fx('stars', { x: sw.x, y: 1.6, z: sw.z }, 0.8);
  notes(quests.onEvent(`pecked:${sw.id}`));
  if (npcs && sw.effect === 'dance') {
    const evs = npcs.danceNear(sw.x, sw.z, tuning.dance.range.value, tuning.dance.seconds.value);
    onNpcEvents(evs);
    npcs.playMusic(sw.x, sw.z, tuning.dance.seconds.value, tuning.dance.range.value, tuning.boombox.gather.value); // free people come over, too
  }
  if (npcs && sw.effect === 'soak') {
    const t = sw.target ?? sw;
    npcs.soakRadius(t.x, t.z, tuning.button.soakRadius.value);
    fx('stars', { x: t.x, y: 2, z: t.z }, 1);
  }
  if (npcs && sw.effect === 'yank') {
    // the cloth comes off: everything on the table flies, and people near it jump
    const gd = sw.goods;
    const v = tuning.cloth.launch.value;
    for (let i = 0; gd && i < gd.count; i++) {
      const a = (i / gd.count) * Math.PI * 2;
      const pr = interaction.props.spawn({ type: gd.type, x: sw.x + Math.cos(a) * 0.5, y: 1.1, z: sw.z + Math.sin(a) * 0.5, tag: gd.tag });
      interaction.props.drop(pr, { x: Math.cos(a) * v, y: 2.5, z: Math.sin(a) * v });
    }
    for (const v2 of switchViews) if (v2.name === `cloth:${sw.id}`) v2.children.forEach((c, i) => { if (i === 2) c.visible = false; });
    noise(sw.x, sw.z, 2);
    fx('stars', { x: sw.x, y: 1.2, z: sw.z }, 1);
    npcs.scareNear(sw.x, sw.z, tuning.cloth.scareRadius.value, false);
  }
  if (sw.effect === 'domino') {
    const d = dominoes.find((x) => x.tiles[0].position.x === sw.x && x.tiles[0].position.z === sw.z);
    if (d && d.start > 1e8) d.start = simTime;
  }
  if (sw.effect === 'disguise') {
    disguiseT = tuning.disguise.seconds.value;
    hud.toast('The captain\'s cap! Nobody sees a gull now.', 2);
    polaroids.request('Ahoy!');
  }
  if (npcs && sw.effect === 'summon' && sw.role) npcs.sendRole(sw.role, [{ x: sw.x + 1.4, z: sw.z, name: 'bell' }]);
  if (npcs && sw.effect === 'alarm') noise(sw.x, sw.z, tuning.button.alarmLoud.value);
  void s;
}
/** Where the not-yet-won secret to-dos start (their first marker): the secret trail. */
function secretSpots(): { x: number; y: number; z: number }[] {
  const out: { x: number; y: number; z: number }[] = [];
  for (const id of setup.secret) {
    const q = quests.quests.find((x) => x.id === id);
    const d = setup.quests.find((x) => x.id === id);
    if (!q || !d || q.status === 'won') continue;
    const m = d.startMarkers?.[0] ?? d.objectives[0].markers?.[0];
    if (m) out.push({ x: m.x, y: m.y ?? 0, z: m.z });
  }
  return out;
}
/** The day's timetable: ferries, showers and gusts, the same every time a level is played. */
let timetable: Timetable | null = null;
let puddleT = 0;
let gustT = 0;
let gustDir = 0;
function timetableStep(dt: number): void {
  if (!timetable || !npcs) return;
  for (const e of timetable.update(dt)) {
    runLog.add(simTime, `timetable:${e.kind}:${e.phase}`);
    if (e.kind === 'ferry') {
      audio.play('horn');
      hud.toast('A ferry comes in. Passengers!', 2);
      notes(quests.onEvent('ferryIn')); // the people who work the ferry react (M107)
      npcs.ferryCrowd({ x: WRONG_FERRY.x, z: WRONG_FERRY.z }, levelStart(), Math.round(tuning.timetable.crowd.value), 12, (i) => [0xf7a1c4, 0x9ec9f0, 0xffd36e, 0xb8e0c8, 0xc7b5e0, 0xf2a35e][i % 6], poisFor(level.district));
    } else if (e.kind === 'rain') {
      rain.on = e.phase === 'start';
      if (e.phase === 'start') hud.toast('A shower! The paving gets slippery.', 2);
    } else if (e.kind === 'gust' && e.phase === 'start') {
      gustT = tuning.timetable.gustSeconds.value;
      gustDir = (simTime * 1.7) % (Math.PI * 2);
      hud.toast('A gust of wind!', 1.6);
    }
  }
  if (timetable.active('rain')) {
    puddleT -= dt;
    if (puddleT <= 0) {
      puddleT = tuning.timetable.puddles.value;
      const a = (simTime * 12.9898) % (Math.PI * 2), r = 4 + ((simTime * 7.3) % 18);
      const x = gull.state.x + Math.cos(a) * r, z = gull.state.z + Math.sin(a) * r;
      if (walkable(x, z)) npcs.addHazard(x, z, 35, 1.5);
    }
  }
  if (gustT > 0) {
    gustT -= dt;
    const push = tuning.timetable.gustPush.value;
    for (const p of interaction.props.free()) {
      if (PROPS[p.type].mass > tuning.gust.maxMass.value || p.cur.p.y > 3) continue;
      if (Math.floor(simTime * 4) !== Math.floor((simTime - dt) * 4)) interaction.props.release(p, { x: Math.cos(gustDir) * push, y: 1.2, z: Math.sin(gustDir) * push });
    }
  }
}
/** Where the hint ladder has got to for a step; steps without ladder data are always fully shown. */
const rungOf = (quest: string, objective: string): number => todo.ladder.rung(`${quest}:${objective}`);
/** "Just tell me" (J, or the ? on the note): the next rung of the steps being worked on now. */
function askHint(): void {
  const cur = ladderSteps(setup.quests, quests.quests, todo.scout.focus);
  if (!cur.length) {
    hud.toast('No hint needed here: it is all in the note.', 1.4);
    return;
  }
  const r = todo.ladder.ask(cur);
  hud.toast(r >= 3 ? 'Here is how.' : r === 2 ? 'Look for the marker on the map.' : 'A hint appeared on the note.', 1.4);
}
todo.onAsk = askHint;
/** Caught red-handed (M96): a watcher who has chased the gull down takes the loot back to where it was, and the gull is thrown back, dazed. */
/**
 * The Market Guard blows his whistle (M111): everybody looks, the item he saw goes home (into its owner's hand, or where it started), and the
 * gull is shoved away and dazed. Only an item still in the beak counts: once it lies on the picnic it is safe.
 */
function guardWhistle(e: Extract<NpcEvent, { type: 'whistle' }>): void {
  const pl = players[e.gull];
  if (!pl || !npcs || isGuest()) return;
  const loot = interaction.beak(e.gull).carried;
  if (!loot || loot.tag !== e.tag) return;
  const s = pl.gull.state;
  const back = interaction.dropCarried(s, e.gull);
  if (back) {
    npcs.returnLoot(back);
    back.lost = false;
  }
  const dx = s.x - e.npc.x, dz = s.z - e.npc.z, d = Math.hypot(dx, dz) || 1;
  s.vx = (dx / d) * tuning.guard.shove.value;
  s.vz = (dz / d) * tuning.guard.shove.value;
  s.stunT = Math.max(s.stunT, tuning.guard.stun.value);
  cam.shake(0.4);
  audio.play('whistle');
  hud.flash('#ffb347');
  hud.toast(`${e.npc.name ?? 'The Guard'} blows the whistle! The ${loot.def.name} goes back.`, 2.4);
  emoteAtNpc(e.npc, 'alert');
  for (const o of npcs.near(e.npc.x, e.npc.z, 16)) if (o !== e.npc) emoteAtNpc(o, 'alert'); // everyone looks
  notes(quests.onEvent(`whistle:${e.npc.role}`));
}
function watchersCatch(): void {
  if (!npcs || isGuest()) return;
  const loot = interaction.carried;
  if (!loot?.tag) return;
  const s = gull.state;
  for (const n of npcs.npcs) {
    if (n.watch !== loot.tag || n.mode !== 'chase' || Math.hypot(n.x - s.x, n.z - s.z) > tuning.watch.catchRange.value || s.y - n.y > 2.4) continue;
    const back = interaction.dropCarried(s, 0);
    if (back) {
      interaction.props.reset(back); // straight back where it was
      back.lost = false;
    }
    const dx = s.x - n.x, dz = s.z - n.z, d = Math.hypot(dx, dz) || 1;
    s.vx = (dx / d) * tuning.watch.shove.value;
    s.vz = (dz / d) * tuning.watch.shove.value;
    s.stunT = Math.max(s.stunT, tuning.watch.stun.value);
    n.watchCd = tuning.watch.cooldown.value;
    n.relentless = false;
    n.mode = 'idle'; // back to minding things
    n.t = 0;
    n.nextT = 2;
    cam.shake(0.5);
    audio.play('bonk');
    hud.flash('#ffb347');
    hud.toast(`${n.name ?? 'They'} caught you! The ${loot.def.name} goes straight back on the table.`, 2.4);
    emoteAtNpc(n, 'laugh');
    notes(quests.onEvent(`gotcha:${n.role}`));
    return;
  }
}
/** An idea for a player who has gone quiet: the tip of the first open step, else a nudge to experiment. */
const IDEAS = ['Try pecking, pushing or dropping something. What happens?', 'Scout from the air: items sparkle when you are near (H: Hawk-eye lights them all).', 'Someone looks busy. What would make them look away?', 'Try a honk (T), a poop, or a dive at something that looks fragile.'];
function nudgeText(): string {
  for (const q of quests.quests) {
    if (q.status !== 'active') continue;
    const d = setup.quests.find((x) => x.id === q.id);
    const i = q.objectives.findIndex((o, k) => !o.done && !(d?.objectives[k].after && !q.objectives.find((x) => x.id === d.objectives[k].after)?.done));
    const hint = i >= 0 ? d?.objectives[i].hint : undefined;
    if (hint) return `Idea: ${hint}`;
  }
  return `Idea: ${IDEAS[(nudge.count - 1) % IDEAS.length]}`;
}
/** The boom box plays for a while (a peck, or being picked up) and the crowd follows it wherever it goes. */
let boomId: number | null = null;
function startBoombox(p: { id: number; cur: { p: { x: number; y: number; z: number } } }): void {
  if (!npcs || isGuest()) return;
  boomId = p.id;
  npcs.playMusic(p.cur.p.x, p.cur.p.z, tuning.boombox.seconds.value, tuning.boombox.range.value, tuning.boombox.gather.value);
  audio.play('jukebox');
  notes(quests.onEvent('pecked:boombox'));
  hud.toast('Music! People are coming.', 1.6);
  fx('stars', { x: p.cur.p.x, y: p.cur.p.y + 0.6, z: p.cur.p.z }, 0.8);
}
function boomboxStep(): void {
  if (boomId === null || !npcs) return;
  const p = interaction.props.byId(boomId);
  if (!p || p.broken || !npcs.musicPlaying) {
    boomId = null;
    return;
  }
  npcs.moveMusic(p.cur.p.x, p.cur.p.z);
}
/** The gull picnic (M107): guest gulls that land as rows are delivered, and the Pigeon Gang's raid halfway. */
let guests: PicnicGuests | null = null;
let picnicRows = 0;
/** The pigeons by a kiosk race a gull for a dropped cone and chase it to the picnic (M112); the raid on the roof, and what the pigeons carry off. */
let race: PigeonRace | null = null;
let raid: Raid | null = null;
let flockView: PigeonView | null = null;
/** The flock's stand-in for a gang: PigeonView reads its mode and where it sits (the race moves it). */
const flockGang = { mode: 'guarding', def: { x: 0, z: 0, y: 0, ring: 2.2 } } as unknown as PigeonGang;
/** Quest tags of the items delivered to the picnic, in order (the raid takes the last one). */
const delivered: string[] = [];
function setupPicnic(): void {
  if (guests) scene.remove(guests.group);
  if (flockView) scene.remove(flockView.group);
  guests = null;
  race = null;
  raid = null;
  flockView = null;
  delivered.length = 0;
  picnicRows = 0;
  commented.clear();
  seatsDone = false;
  const p = level.picnic;
  if (!p) return;
  guests = new PicnicGuests(p, p.guests);
  scene.add(guests.group);
  raid = new Raid(tuning.picnic.raidTakeAfter.value);
  const pr = level.pigeonRace;
  if (pr) {
    const t = tuning.pigeonRace;
    race = new PigeonRace({ home: pr.home, arrive: { x: p.x, z: p.z, r: tuning.picnic.zoneHalf.value + 1.5, minY: p.y - 1.5 }, raceSeconds: t.raceSeconds.value, chaseSeconds: t.chaseSeconds.value, eatenSeconds: t.eatenSeconds.value, chaseFollow: t.chaseFollow.value });
    Object.assign(flockGang.def, { x: pr.home.x, z: pr.home.z, y: 0.4 });
    flockView = new PigeonView(flockGang, pr.birds);
    scene.add(flockView.group);
  }
}
/** The cone as the race sees it. */
function coneView(tag: string): { view: ConeView | null; carrier: number } {
  const cone = interaction.props.props.find((q) => q.tag === tag && !q.broken);
  if (!cone) return { view: null, carrier: -1 };
  const carrier = players.findIndex((_, i) => interaction.beak(i).carried === cone);
  const at = { x: cone.cur.p.x, y: cone.cur.p.y, z: cone.cur.p.z };
  if (carrier >= 0) return { view: { state: 'carried', ...at }, carrier };
  return { view: { state: cone.heldBy !== null ? 'held' : 'free', ...at }, carrier: -1 };
}
/** Each step: the pigeon race, the flock, the raid clock. */
function pigeonRaceStep(dt: number): void {
  const p = level.picnic;
  if (!p || isGuest()) return;
  const pr = level.pigeonRace;
  if (raid) raid.takeAfter = tuning.picnic.raidTakeAfter.value; // live, so the tuning panel changes it at once
  if (race && pr) {
    const t = tuning.pigeonRace;
    Object.assign(race.cfg, { raceSeconds: t.raceSeconds.value, chaseSeconds: t.chaseSeconds.value, eatenSeconds: t.eatenSeconds.value, chaseFollow: t.chaseFollow.value });
    const { view, carrier } = coneView(pr.tag);
    const gs = players[carrier >= 0 ? carrier : 0]?.gull.state;
    for (const e of race.update(dt, { cone: view, gull: gs ? { x: gs.x, y: gs.y, z: gs.z } : null })) {
      if (e === 'raceStart') {
        hud.toast('The pigeons spot the cone!', 1.8);
        audio.play('gasp');
        notes(quests.onEvent('pigeonRace'));
      } else if (e === 'coneEaten') {
        if (view) fx('feathers', { x: view.x, y: 0.6, z: view.z }, 1.4);
        hud.toast('The pigeons gobble the cone. He buys another.', 2.2);
        npcs?.restockHeld(pr.owner, (q) => interaction.restock((x) => x === q));
        notes(quests.onEvent('pigeonsAteCone'));
      } else if (e === 'chaseStart') {
        hud.toast('Pigeons on your tail! Get it to the picnic.', 2.2);
        notes(quests.onEvent('pigeonChase'));
      } else if (e === 'arrived') {
        startRaid();
        raid?.start();
        notes(quests.onEvent('pigeonsArrive'));
      } else if (e === 'gaveUp') hud.toast('The pigeons lose interest.', 1.6);
    }
    flockGang.def.x = race.x;
    flockGang.def.z = race.z;
    flockGang.def.y = race.y;
    flockView?.update(dt);
  }
  if (raid?.active && gang && gang.mode !== 'guarding') raid.settle(); // a honk or a bun settled them
  if (raid?.update(dt)) raidTakes();
}
/** The pigeons fly off with the last item delivered and drop it a long way off: one trip to fetch it back (M112). */
function raidTakes(): void {
  const p = level.picnic;
  const pq = setup.quests.find((d) => d.collect);
  if (!p?.takeTo || !pq?.collect) return;
  const tag = delivered[delivered.length - 1];
  const rowDef = pq.objectives.find((o) => o.row?.tag === tag);
  const prop = tag ? interaction.props.props.find((q) => q.tag === tag && !q.broken && !q.carried && q.heldBy === null) : undefined;
  if (!rowDef || !prop) return;
  const half = tuning.picnic.zoneHalf.value;
  if (Math.abs(prop.cur.p.x - p.x) > half || Math.abs(prop.cur.p.z - p.z) > half || prop.cur.p.y < p.y - 0.4) return; // it is not on the blanket any more
  fx('feathers', { x: prop.cur.p.x, y: prop.cur.p.y + 0.4, z: prop.cur.p.z }, 1.6);
  prop.body.setTranslation({ x: p.takeTo.x, y: 0.7, z: p.takeTo.z }, true);
  prop.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  quests.undo(pq.id, rowDef.id);
  triggers.unfire(`served:${rowDef.id}`);
  delivered.pop();
  picnicRows = Math.max(0, picnicRows - 1);
  hud.toast(`The pigeons carry off the ${prop.def.name}! It is lying over there.`, 2.8);
  audio.play('gasp');
  notes(quests.onEvent('raidTook'));
}
/** A row was delivered: a guest flies in; at the halfway mark the pigeons notice. */
function picnicRow(tag?: string): void {
  const p = level.picnic;
  if (!p || !guests) return;
  picnicRows++;
  if (tag) delivered.push(tag);
  guests.arrive();
  audio.play('chime');
  if (p.raidAt !== undefined && picnicRows === p.raidAt) startRaid();
}
/** The Pigeon Gang flies up and sits round the picnic, mobbing any gull that comes near: a honk (or a bun) settles it. */
function startRaid(): void {
  const p = level.picnic;
  if (!p || gang) return;
  gang = new PigeonGang({ x: p.x, z: p.z, y: p.y, ring: tuning.picnic.raidRing.value });
  gangView = new PigeonView(gang, Math.round(tuning.pigeons.count.value));
  scene.add(gangView.group);
  hud.toast('Uninvited guests! The Pigeon Gang is on your picnic.', 2.4);
  audio.play('gasp');
  notes(quests.setFlag('raid', true));
  notes(quests.onEvent('raid'));
}
const commented = new Set<number>();
let seatsDone = false;
/** The picnic each step: the guests comment on things that are not on the menu; two gulls sitting down together after the gong (co-op). */
function picnicStep(): void {
  const p = level.picnic;
  if (!p || isGuest()) return;
  const menu = new Set((level.extraTriggers ?? []).filter((t) => t.kind === 'propInZone' && t.event.startsWith('picnic:')).map((t) => (t as { tag?: string }).tag));
  const half = tuning.picnic.zoneHalf.value;
  const on = (x: number, y: number, z: number) => Math.abs(x - p.x) <= half && Math.abs(z - p.z) <= half && y >= p.y - 0.4;
  for (const pr of interaction.props.free()) {
    if (commented.has(pr.id) || (pr.tag && menu.has(pr.tag)) || !on(pr.cur.p.x, pr.cur.p.y, pr.cur.p.z)) continue;
    commented.add(pr.id);
    hud.toast(PICNIC_COMMENTS[pr.type] ?? `The guests stare at the ${pr.def.name}.`, 2);
  }
  if (!seatsDone && players.length > 1 && quests.quests.find((q) => q.id === 'picnicGong')?.status === 'won' && players.every((pl) => pl.gull.state.mode === 'ground' && on(pl.gull.state.x, pl.gull.state.y, pl.gull.state.z))) {
    seatsDone = true;
    notes(quests.onEvent('coop:seats'));
  }
}
/** A honk near the raid scatters it, and they come back as polite guests (friends), not as a mob. */
function shooRaid(x: number, z: number): void {
  const p = level.picnic;
  if (!p || !gang || gang.mode !== 'guarding' || Math.hypot(x - p.x, z - p.z) > tuning.picnic.raidRange.value) return;
  gang.mode = 'scattered';
  gang.wasFriends = true;
  fx('feathers', { x: p.x, y: p.y + 0.8, z: p.z }, 1.5);
  hud.toast('Shoo! The pigeons scatter off your picnic.', 1.8);
  notes(quests.onEvent('raidShooed'));
}
function setupSenate(): void {
  if (tramView) scene.remove(tramView.group);
  if (gangView) scene.remove(gangView.group);
  tramView = null;
  gangView = null;
  tram = null;
  gang = null;
  rideT = 0;
  quietClock = 0;
  quietLeft = 0;
  quietCd = 0;
  hushCd = 0;
  onRoofBefore = false;
  world.movers.length = 0;
  if (greybox) return;
  // the tram runs on its line in every level (the tram levels change what it does): it is part of the city
  const tramDef = level.tram ?? SENATE_TRAM;
  {
    tram = new Tram(tramDef);
    tramView = new TramView(tram, tramDef);
    scene.add(tramView.group);
    world.movers.push(roofBox);
    placeRoof();
  }
  if (level.pigeons) {
    gang = new PigeonGang(level.pigeons);
    if (skills.has('pigeons')) {
      gang.mode = 'friends'; // Pigeon Diplomacy: the gang remembers you
      gang.wasFriends = true;
    }
    gangView = new PigeonView(gang, Math.round(tuning.pigeons.count.value));
    scene.add(gangView.group);
  }
}
function placeRoof(): void {
  if (!tram) return;
  const d = tram.def;
  roofBox.min = [tram.x - d.length / 2, d.roofY - 0.5, d.z - d.width / 2];
  roofBox.max = [tram.x + d.length / 2, d.roofY + 0.2, d.z + d.width / 2];
}
function stepSenate(dt: number): void {
  const qb = level.quietBreaks;
  if (qb) {
    quietClock += dt;
    if (quietLeft > 0) quietLeft -= dt;
    else if (quietClock >= qb.first && (quietClock - qb.first) % qb.every < dt) {
      quietLeft = qb.duration;
      hud.toast('The band falls silent for the quiet bit...', 2);
      notes(quests.onEvent('quietBit'));
    }
  }
  const qz = level.quiet;
  if (qz) {
    quietCd -= dt;
    hushCd -= dt;
    for (const pl of players) {
      const s = pl.gull.state;
      if (s.mode !== 'ground' && Math.hypot(s.x - qz.x, s.z - qz.z) < qz.r && s.y < 30 && quietCd <= 0) {
        quietCd = tuning.quiet.interval.value;
        noise(s.x, s.z, tuning.quiet.loud.value);
        if (hushCd <= 0) {
          hushCd = 4;
          hud.toast('SHHH! This is a library!', 1.4);
          notes(quests.onEvent('hushed'));
        }
      }
    }
  }
  const free = interaction.props.props.filter((p) => !p.broken && !p.carried && p.heldBy === null);
  if (tram) {
    const blocker = !level.tram ? undefined : free.find((p) => p.type === 'bottle' && p.cur.p.y < 1.6 && tram!.trackAhead(p.cur.p.x, p.cur.p.z, tuning.tram.brakeDistance.value));
    const ev = tram.update(dt, !!blocker);
    placeRoof();
    for (const e of ev) {
      if (e.type === 'blocked') {
        hud.toast('The tram stops. The driver climbs out to clear the track...', 2.2);
        audio.play('tramBell');
        notes(quests.onEvent('tramBlocked'));
        if (blocker) npcs?.sendRole('driver', [{ x: blocker.cur.p.x, z: blocker.cur.p.z, name: 'the bottle' }]);
      } else if (e.type === 'cleared') {
        for (const p of free) if (p.type === 'bottle' && tram.trackAhead(p.cur.p.x, p.cur.p.z, tuning.tram.brakeDistance.value + 4)) interaction.props.destroy(p);
        npcs?.sendRole('driver', [{ x: tram.def.stopX - 7, z: tram.def.z + 3, name: 'the tram' }]);
      } else {
        const d = Math.hypot(gull.state.x - tram.x, gull.state.z - tram.def.z);
        if (level.tram || d < 160) audio.play('tramBell', distanceGain(d, 15, 160, 0)); // ding-ding, fading with distance
        if (level.tram || d < 70) noise(tram.x, tram.def.z, 1.2);
      }
    }
    // riders: a gull standing on the roof is carried along
    let riding = false;
    for (const pl of players) {
      const s = pl.gull.state;
      if (tram.onRoof(s.x, s.z, -0.2) && s.mode === 'ground' && s.y <= tram.def.roofY + 1.6) {
        pl.gull.carry(tram.vx * dt, 0);
        if (!pl.remote) riding = true;
      }
    }
    if (riding && !onRoofBefore) notes(quests.onEvent('tramBoard'));
    onRoofBefore = riding;
    rideT = riding && tram.mode === 'run' ? rideT + dt : 0;
    if (rideT >= 8) {
      rideT = -1e9;
      notes(quests.onEvent('tramRide'));
    }
    tramView?.update();
  }
  if (gang) {
    const gulls = players.filter((p) => !(p.remote ? p.gull.remoteDisguised : abilities.disguised));
    let near: { x: number; y: number; z: number } | null = null;
    let nd = Infinity;
    for (const pl of gulls) {
      const d = Math.hypot(pl.gull.state.x - gang.def.x, pl.gull.state.z - gang.def.z);
      if (d < nd) { nd = d; near = pl.gull.state; }
    }
    const gy = gang.def.y ?? 0;
    const dropped = free.filter((p) => (p.type === 'bun' || p.type === 'salmiakki') && Math.abs(p.cur.p.y - gy) < 1.4).map((p) => ({ type: p.type, x: p.cur.p.x, z: p.cur.p.z }));
    const r = gang.update(dt, near && near.y < gy + 7 ? near : null, dropped);
    if (r.shove) {
      const pl = gulls.find((q) => q.gull.state === near);
      if (pl) pl.gull.carry(r.shove.x, r.shove.z);
    }
    for (const e of r.events) {
      if (e.type === 'chase') hud.toast('The Pigeon Gang mobs you! Bring them a bun.', 1.8);
      else if (e.type === 'befriended' || e.type === 'fed' || e.type === 'scattered') {
        const gone = free.find((p) => p.type === (e.type === 'scattered' ? 'salmiakki' : 'bun') && Math.hypot(p.cur.p.x - gang!.def.x, p.cur.p.z - gang!.def.z) < tuning.pigeons.guardRadius.value + tuning.pigeons.feedRadius.value);
        if (gone) interaction.props.destroy(gone);
        hud.toast(e.type === 'scattered' ? 'Pfft! The pigeons hate salmiakki and scatter!' : e.type === 'fed' ? 'The Pigeon Gang gobbles the bun. Old friends!' : 'The Pigeon Gang loves you. You are an honorary pigeon!', 2);
        audio.play(e.type === 'scattered' ? 'chime' : 'pop');
        fx(e.type === 'scattered' ? 'feathers' : 'hearts', { x: gang.def.x, y: 1, z: gang.def.z }, 1.5);
        notes(quests.onEvent(e.type === 'scattered' ? 'pigeonsScattered' : 'pigeonsFriends'));
        notes(quests.onEvent('pigeonsSettled'));
      }
    }
    gangView?.update(dt);
  }
}

/** Ambient puffs near the player: steam above the market stalls and blossom drifting down in the Esplanadi park. */
let steamT = 0;
let petalT = 0;
let fountainT = 0;
function ambientStep(dt: number): void {
  if (greybox || !(tuning.juice.puffs.value > 0)) return;
  const g = gull.state;
  steamT += dt;
  if (steamT > 0.55 && tuning.motion.steam.value > 0) {
    steamT = 0;
    for (const [c, r] of [[1, 1], [3, 1], [5, 1], [7, 1]] as const) {
      const s = counter(c, r);
      if (Math.hypot(g.x - s.x, g.z - s.z) < 70) puffs.burst('steam', { x: s.x + (Math.random() - 0.5) * 1.5, y: 1.5, z: s.z + (Math.random() - 0.5) * 1.5 }, 0.4);
    }
  }
  // the Havis Amanda fountain sprays round the basin when you are near
  fountainT += dt;
  if (fountainT > 0.18 && Math.hypot(g.x - STATUE.x, g.z - STATUE.z) < 80) {
    fountainT = 0;
    const a = Math.random() * Math.PI * 2;
    puffs.burst('splash', { x: STATUE.x + Math.cos(a) * 3.0, y: 0.7, z: STATUE.z + Math.sin(a) * 3.0 }, 0.3);
  }
  petalT += dt;
  if (petalT > 0.3 && tuning.motion.petals.value > 0 && districtOf(g.x, g.z) === 'esplanadi') {
    petalT = 0;
    puffs.burst('petals', { x: g.x + (Math.random() - 0.5) * 18, y: Math.max(g.y, 3) + 4 + Math.random() * 3, z: g.z + (Math.random() - 0.5) * 18 }, 0.25);
  }
}

/** Esplanadi: sunbathers (your shadow wakes them), park dogs (chase gulls on the ground, fetch balls) and the lawn sprinklers. */
let sunbathers: Sunbathers | null = null;
let sunView: SunbatherView | null = null;
let dogs: { dog: Dog; view: DogView; ball: ReturnType<typeof interaction.props.byId> }[] = [];
let sprinklers: Sprinklers | null = null;
let sprayView: SprinklerView | null = null;
let sprayScareCd = 0;
function clearEspa(): void {
  if (sunView) scene.remove(sunView.group);
  if (sprayView) scene.remove(sprayView.group);
  for (const d of dogs) scene.remove(d.view.group);
  sunbathers = null;
  sunView = null;
  dogs = [];
  sprinklers = null;
  sprayView = null;
  sprayScareCd = 0;
}
function setupEsplanadi(): void {
  clearEspa();
  if (greybox) return;
  if (level.sunbathers) {
    sunbathers = new Sunbathers(level.sunbathers);
    sunView = new SunbatherView(sunbathers);
    scene.add(sunView.group);
  }
  for (const d of level.dogs ?? []) {
    const dog = new Dog(d.x, d.z, d.ownerX, d.ownerZ);
    const view = new DogView(dog);
    scene.add(view.group);
    dogs.push({ dog, view, ball: undefined });
  }
  if (level.sprinklers) {
    sprinklers = new Sprinklers(level.sprinklers.zones);
    sprayView = new SprinklerView(sprinklers);
    scene.add(sprayView.group);
  }
}
function startSprinklers(): void {
  if (!sprinklers) return;
  for (const e of sprinklers.start()) if (e.type === 'on') {
    hud.toast('Psssshhh! The sprinklers come on!', 2);
    audio.play('chime');
    notes(quests.onEvent('sprinklersOn'));
  }
}
function stepEsplanadi(dt: number): void {
  const free = interaction.props.props.filter((p) => !p.broken && !p.carried && p.heldBy === null);
  const gullsNow = players.map((pl) => ({ x: pl.gull.state.x, y: pl.gull.state.y, z: pl.gull.state.z, grounded: pl.gull.state.mode === 'ground' }));
  if (sunbathers) {
    const sunGulls = players.map((pl) => {
      const s = pl.gull.state;
      const h = Math.max(0, s.y - 0.4);
      return { x: s.x, y: h, z: s.z, cloud: s.mode !== 'ground' && s.y > 5 && !pl.remote && skills.has('cloudglide') };
    });
    const r = sunbathers.update(dt, sunGulls);
    for (const e of r.events) {
      if (e.type === 'woke') {
        hud.toast('Hey! Someone is blocking the sun!', 1.6);
        emoteAt('anger', sunbathers.list[e.index], sunbathers.list[e.index].x, 1.3, sunbathers.list[e.index].z);
        audio.play('pop');
        notes(quests.onEvent('sunbatherWoke'));
        heat('noticed');
      } else if (e.type === 'allAwake') {
        hud.toast('Everyone sits up at once. Synchronised screaming!', 2.2);
        notes(quests.onEvent('allAwake'));
      }
    }
    for (const sh of r.shoves) players[sh.gull]?.gull.carry(sh.x, sh.z);
    sunView?.update();
  }
  for (const d of dogs) {
    const balls = free.filter((p) => p.type === 'ball' || PROPS[p.type].tags.includes('hat')).map((p) => ({ id: p.id, x: p.cur.p.x, y: p.cur.p.y, z: p.cur.p.z }));
    const ev = d.dog.update(dt, gullsNow, balls);
    for (const e of ev) {
      if (e.type === 'pickup') {
        const prop = interaction.props.byId(e.id);
        if (prop) {
          interaction.props.grab(prop);
          d.ball = prop;
          if (prop.type !== 'ball') notes(quests.onEvent('dogFetchedHat'));
        }
      } else if (e.type === 'drop') {
        if (d.ball) interaction.props.release(d.ball, { x: 0, y: 1, z: 0 });
        d.ball = undefined;
        hud.toast('Good boy! He brings it back.', 1.4);
        notes(quests.onEvent('dogFetched'));
      } else if (e.type === 'bark') {
        audio.play('crow');
        emotes.show('alert', d.dog, () => ({ x: d.dog.x, y: 1.3, z: d.dog.z }));
        noise(d.dog.x, d.dog.z, 1.2);
      } else if (e.type === 'bite') {
        players[0]?.gull.carry(Math.sign(e.x) * 1.5, Math.sign(e.z) * 1.5);
        hud.toast('The dog chases you off!', 1.4);
      }
    }
    if (d.ball) interaction.props.setCarryTarget(d.ball, { x: d.dog.x + Math.sin(d.dog.heading) * 0.5, y: 0.8, z: d.dog.z + Math.cos(d.dog.heading) * 0.5 }, d.dog.heading);
    if (d.dog.running) {
      let scattered = false;
      for (const p of free) {
        if (!PROPS[p.type].tags.includes('edible') || p.cur.p.y > 1.3) continue;
        if (Math.hypot(p.cur.p.x - d.dog.x, p.cur.p.z - d.dog.z) < tuning.dog.scatterRadius.value) {
          interaction.props.release(p, { x: Math.sin(d.dog.heading) * 2.5, y: 3, z: Math.cos(d.dog.heading) * 2.5 });
          p.stolen = true; // knocked loose by the dog: carrying it off counts as getting away with it
          scattered = true;
        }
      }
      if (scattered) {
        noise(d.dog.x, d.dog.z, 1.6);
        hud.toast('The dog tears through the picnic!', 1.6);
        notes(quests.onEvent('dogScatter'));
      }
    }
    d.view.update(dt);
  }
  if (sprinklers && level.sprinklers) {
    const v = level.sprinklers.valve;
    for (const g of gullsNow) if (g.grounded && g.y < 3 && Math.hypot(g.x - v.x, g.z - v.z) <= v.r) startSprinklers();
    for (const e of sprinklers.update(dt)) if (e.type === 'off') hud.toast('The sprinklers switch off.', 1.2);
    sprayScareCd -= dt;
    if (sprinklers.running && sprayScareCd <= 0) {
      sprayScareCd = 1.5;
      for (const z of sprinklers.zones) for (let k = npcs?.scareNear(z.x, z.z, z.r + 1, false).length ?? 0; k > 0; k--) notes(quests.onEvent('sprinkled'));
    }
    sprayView?.update(dt);
  }
}

/** What a guest needs to draw the district cast (tram, pigeons, sunbathers, dogs, sprinklers). */
const TRAM_MODES = ['run', 'dwell', 'blocked'] as const;
const GANG_MODES = ['guarding', 'friends', 'scattered'] as const;
function districtSnap(): DistrictSnap | undefined {
  if (!tram && !gang && !sunbathers && !dogs.length && !sprinklers) return undefined;
  const r2 = (v: number) => Math.round(v * 100) / 100;
  return {
    ...(tram ? { tr: [r2(tram.x), tram.dir, TRAM_MODES.indexOf(tram.mode)] as [number, number, number] } : {}),
    ...(gang ? { pg: GANG_MODES.indexOf(gang.mode) } : {}),
    ...(sunbathers ? { sb: sunbathers.list.map((s) => (s.state === 'awake' ? 1 : 0)) } : {}),
    ...(dogs.length ? { dg: dogs.map((d) => [r2(d.dog.x), r2(d.dog.z), r2(d.dog.heading), d.dog.running ? 1 : 0] as [number, number, number, number]) } : {}),
    ...(sprinklers ? { sp: r2(sprinklers.remaining) } : {}),
  };
}
let districtRemote: DistrictSnap | null = null;
/** On a guest: ease the district cast toward the host's news, and ride the tram roof locally. */
function stepDistrictRemote(dt: number): void {
  const d = districtRemote;
  if (!d) return;
  if (tram && d.tr) {
    const before = tram.x;
    const gap = d.tr[0] - tram.x;
    tram.x = Math.abs(gap) > 12 ? d.tr[0] : tram.x + Math.max(-1, Math.min(1, gap / (tuning.tram.speed.value * dt * 1.6 || 1))) * tuning.tram.speed.value * dt * 1.6;
    if (Math.abs(d.tr[0] - tram.x) < 0.02) tram.x = d.tr[0];
    tram.dir = d.tr[1] >= 0 ? 1 : -1;
    tram.mode = TRAM_MODES[d.tr[2]] ?? 'run';
    tram.vx = dt > 0 ? (tram.x - before) / dt : 0;
    placeRoof();
    const s = gull.state;
    if (tram.onRoof(s.x, s.z, -0.2) && s.mode === 'ground' && s.y <= tram.def.roofY + 1.6) gull.carry(tram.x - before, 0);
    tramView?.update();
  }
  if (gang && d.pg !== undefined) {
    gang.mode = GANG_MODES[d.pg] ?? 'guarding';
    gangView?.update(dt);
  }
  if (sunbathers && d.sb) {
    sunbathers.list.forEach((s, i) => (s.state = d.sb![i] ? 'awake' : 'asleep'));
    sunView?.update();
  }
  if (d.dg) dogs.forEach((dg, i) => {
    const t = d.dg![i];
    if (!t) return;
    const k = Math.min(1, dt * 12);
    dg.dog.x += (t[0] - dg.dog.x) * k;
    dg.dog.z += (t[1] - dg.dog.z) * k;
    dg.dog.heading = t[2];
    dg.dog.running = !!t[3];
    dg.view.update(dt);
  });
  if (sprinklers && d.sp !== undefined) {
    sprinklers.setRemaining(d.sp);
    sprayView?.update(dt);
  }
}

/** Juice (G1) and co-op teamwork (F1): emotes over heads, particles, taunt, passes, spotter, rescue. */
const emotes = new Emotes();
const puffs = new Puffs();
scene.add(emotes.group, puffs.mesh);
const passes = new PassTracker();
const tangle = new Tangle();
const tauntT: number[] = [];
const tapHolds: TapHold[] = [];
const lookSmoother = new LookSmoother();
let lookIdle = 0;
let steerX = 0;
let steerY = 0;
/** T: a quick tap is a honk, holding it is a taunt. Returns whether the player is taunting now (held past the tap time). */
function tauntInput(i: number, down: boolean, dt: number): boolean {
  const th = (tapHolds[i] ??= new TapHold(() => tuning.honk.tapMax.value, () => tuning.honk.cooldown.value));
  const r = th.update(down, dt);
  if (r.tap && players[i]) {
    if (mech('honk')) honk(players[i]);
    else if (!players[i].remote) lockedCue('honk');
  }
  return r.holding && mech('taunt');
}
/** A loud screech: calm people jump (and drop what they hold if their back is turned), sleepers wake, pigeons fly. */
function honk(pl: Player): void {
  const g = pl.gull;
  const s = g.state;
  audio.play('honk', pl.remote ? 0.6 : 1);
  g.openBeak(0.5);
  g.wiggleT = 0.45;
  if (!pl.remote) cam.shake(0.2);
  puffs.burst('feathers', { x: s.x, y: s.y + 0.4, z: s.z }, 0.5);
  emoteOver(pl, 'alert', false);
  if (isGuest()) return;
  noise(s.x, s.z, 2.6);
  notes(quests.onEvent('honk'));
  if (npcs) {
    if (hiddenNow(s)) onNpcEvents(npcs.boo(s.x, s.z, tuning.hide.booRange.value));
    onNpcEvents(npcs.honk(s.x, s.z, tuning.honk.range.value));
  }
  if (level.picnic) shooRaid(s.x, s.z);
  else gang?.honk(s.x, s.z, tuning.honk.range.value);
  if (mech('dogcall')) for (const d of dogs) if (Math.hypot(d.dog.x - s.x, d.dog.z - s.z) < tuning.honk.range.value * 2.5) d.dog.summon(s.x, s.z);
  if (sunbathers) for (const sb of sunbathers.list) if (sb.state === 'asleep' && Math.hypot(sb.x - s.x, sb.z - s.z) < tuning.honk.range.value * 0.6) { sb.state = 'awake'; sb.t = tuning.sun.awakeSeconds.value; }
}
const npcModeSeen = new Map<number, string>();
const EMOTE_KEYS: EmoteKind[] = ['wave', 'laugh', 'point', 'facepalm'];
/** A player by network id, on either side (a guest keeps itself first in its own list). */
const playerByNetId = (id: number): Player | undefined => (isGuest() ? players[id === 1 ? 0 : 1] : players[id]);
const netIdOf = (pl: Player): number => (isGuest() ? (pl === players[0] ? 1 : 0) : pl.id);
/** Particles here, and on the guest's screen too. */
function fx(kind: PuffKind, at: { x: number; y: number; z: number }, scale = 1): void {
  puffs.enabled = tuning.juice.puffs.value > 0;
  puffs.burst(kind, at, scale);
  if (isHost()) net!.sendEvent({ k: 'fx', kind, p: [at.x, at.y, at.z], scale });
}
function emoteOver(pl: Player | undefined, kind: EmoteKind, tell = true): void {
  if (!pl) return;
  const g = pl.gull;
  emotes.show(kind, g, () => ({ x: g.position.x, y: g.position.y + 0.75, z: g.position.z }), tuning.juice.emoteSeconds.value);
  g.wiggleT = Math.max(g.wiggleT, 0.5);
  if (tell && isHost()) net!.sendEvent({ k: 'emote', g: netIdOf(pl), e: kind });
}
function emoteAt(kind: EmoteKind, key: unknown, x: number, y: number, z: number): void {
  emotes.show(kind, key, () => ({ x, y, z }), tuning.juice.emoteSeconds.value);
}
function resetCoopJuice(): void {
  districtRemote = null;
  passes.reset();
  tangle.reset();
  emotes.clear();
  npcModeSeen.clear();
  for (const p of players) p.gull.taunting = p.gull.tangled = false;
}
const NPC_EMOTE: Record<string, EmoteKind | undefined> = { notice: 'alert', shield: 'anger', chase: 'anger', panic: 'sweat', yuck: 'facepalm', cheer: 'heart' };
/** Every machine: reactions show over people's heads when their mood changes, and taunting gulls show off. */
function juiceStep(dt: number): void {
  for (const n of npcs?.npcs ?? []) {
    const was = npcModeSeen.get(n.id);
    if (was !== n.mode) {
      npcModeSeen.set(n.id, n.mode);
      const k = was === undefined ? undefined : NPC_EMOTE[n.mode];
      if (k) emotes.show(k, n, () => ({ x: n.x, y: 2.05, z: n.z }), tuning.juice.emoteSeconds.value);
    }
  }
  players.forEach((pl, i) => {
    const g = pl.gull;
    tauntT[i] = Math.max(0, (tauntT[i] ?? 0) - dt);
    if (g.taunting && tauntT[i] <= 0) {
      tauntT[i] = tuning.coop.tauntEvery.value;
      emoteOver(pl, 'note', false);
      g.openBeak(0.35);
      g.wiggleT = 0.6;
      if (!pl.remote) audio.play('screech');
      if (!isGuest()) {
        noise(g.state.x, g.state.z, tuning.coop.tauntLoud.value);
        notes(quests.onEvent('taunt'));
      }
    }
    if (g.tangled && Math.floor(simTime * 1.2) !== Math.floor((simTime - dt) * 1.2)) emoteOver(pl, 'sweat', false);
  });
}
/** Host / single player: passes fly into the partner's beak, caught gulls wait for a rescue. */
function coopStep(dt: number): void {
  if (players.length < 2) return;
  for (const id of passes.fresh(simTime)) {
    const prop = interaction.props.byId(id);
    if (!prop || prop.carried || prop.heldBy !== null || prop.broken) continue;
    for (const pl of players) {
      const s = pl.gull.state;
      if (interaction.beak(pl.id).carried) continue;
      const d = Math.hypot(prop.cur.p.x - s.x, prop.cur.p.y - s.y, prop.cur.p.z - s.z);
      if (passes.autoCatch(id, pl.id, simTime, d, s.mode !== 'ground')) {
        onGags(interaction.catchProp(pl.id, prop));
        break;
      }
    }
  }
  const freed = tangle.update(dt, players.map((pl) => pl.gull.state));
  players.forEach((pl, i) => {
    pl.gull.tangled = tangle.stuck(i);
    if (pl.gull.tangled && !pl.remote) pl.gull.state.stunT = Math.max(pl.gull.state.stunT, 0.3);
  });
  for (const [who, by] of freed) {
    const v = players[who].gull.state;
    hud.toast('Pecked free! Teamwork.', 1.4);
    audio.play('pop');
    fx('feathers', { x: v.x, y: v.y + 0.3, z: v.z });
    emoteOver(players[who], 'heart');
    emoteOver(players[by], 'star');
    if (!players[who].remote) players[who].gull.state.stunT = 0;
    notes(quests.onEvent('coop:rescue'));
  }
}
const spotAssist = (mine: number) => {
  const l = partnerLock(mine);
  return l ? { ...l, r: tuning.coop.spotAssist.value } : null;
};
/** The partner's lock as a bomb sight, when this gull has no lock of its own. */
function partnerLock(mine: number): { x: number; y: number; z: number } | null {
  if (players.length < 2 || !isHost()) return null;
  if (mine === 0) {
    const lk = net!.guestFrame?.s.lk;
    return lk ? { x: lk[0], y: lk[1], z: lk[2] } : null;
  }
  return lockNow ? { x: lockNow.x, y: lockNow.y, z: lockNow.z } : null;
}

const snow = new Snow();
scene.add(snow.points);
const rain = new Snow(9, 0.1, 0xaecbe8, 0.1); // a shower: the same cloud of points, falling fast
scene.add(rain.points);
/** The sea: you swim in it and things float, except in winter levels when it is frozen ice (walk on it). */
function applySeaRules(): void {
  if (greybox) return;
  const winter = !!level.winter;
  const wet = (x: number, z: number): boolean => !isLand(x, z);
  for (const p of players) p.gull.isWater = winter ? null : wet;
  interaction.props.isWater = winter ? null : wet;
  water?.setFrozen(winter);
  snow.on = winter;
}

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
/** The cathedral bell: rings on a schedule (and when you ring it yourself); while it rings, people look up at the tower. */
const paradeDone = new Set<string>();
let bellClock = 0;
let bellLeft = 0;
let bellLastNoise = 0;
function ringBell(): void {
  const b = level.bells;
  if (!b) return;
  bellLeft = b.duration;
  bellLastNoise = 0;
  const g0 = gull.state;
  audio.play('bell', distanceGain(Math.hypot(g0.x - b.x, g0.z - b.z), 30, 450, 0.4)); // a church bell carries over the whole square
  // a sandwich taken while the bell was quiet must not end the heist: the picnickers bring out fresh ones
  const fresh = npcs?.restockHeld('picnic', (pr) => interaction.restock((x) => x === pr)) ?? 0;
  if (fresh) hud.toast('The picnickers have fresh sandwiches.', 2);
  hud.toast('BONG! Everyone looks up at the tower.', 1.6);
  notes(quests.onEvent('bell'));
}
let heat60Fired = false;
let altitudeFired = false;
const thermalsSeen = new Set<number>();
let owlCd = 0;
/** What a level adds to the city when it starts: the city's heat, the Warden's lunch, a current for the message bottle. */
function applyLevelRules(): void {
  heat60Fired = false;
  bellClock = 0;
  paradeDone.clear();
  bellLeft = 0;
  altitudeFired = false;
  thermalsSeen.clear();
  owlCd = 0;
  skills.grantForLevel(level.skills ?? []);
  showThermals();
  applySeaRules();
  sky.apply(skyById(level.sky ?? (level.night ? 'night' : 'noon')));
  setupKalle();
  setupSenate();
  setupPicnic();
  setupSwitches();
  applyGates();
  setupEsplanadi();
  resetCoopJuice();
  havoc = level.havoc && !isGuest() ? new HavocRun(level.havoc.seconds) : null;
  havocShown = false;
  runLog.clear();
  havocHud.show(!!havoc);
  skillsPanel.refresh(skills, save);
  interaction.props.drift = level.drift ?? null;
  if (defense) defense.hiddenLines = !!level.hiddenLines;
  if (!defense || isGuest()) return; // a guest's city is the host's
  defense.lunch = level.wardenLunch ? { x: level.wardenLunch.x, z: level.wardenLunch.z, from: level.wardenLunch.at, to: level.wardenLunch.at + level.wardenLunch.duration, repeat: level.wardenLunch.repeat } : null;
  if (level.deploy) onDefense(defense.deployNow(level.deploy));
  if (level.sleepingVendors) defense.setSleepy(true);
  if (level.drone) defense.spawnDrone(level.drone.x, level.drone.z);
  if (level.startHeat) onDefense(defense.ensureHeat(level.startHeat));
}

function restartLevel(mode: 'normal' | 'speedrun'): void {
  reactionsDone.clear();
  eventCounts.clear();
  beats.length = 0;
  posing.clear();
  lastPose = '';
  levelCleared = false;
  chain.reset();
  nudge.poke();
  todo.ladder.reset();
  todo.scout.reset();
  rowTimes.reset();
  timetable = level.timetable?.length ? new Timetable(level.timetable, 17, level.ferryGap) : null;
  rain.on = false;
  puddleT = 0;
  gustT = 0;
  for (const p of players) p.gull.setStart(level.start?.x ?? start.x, level.start?.z ?? start.z);
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
  polaroids.clear();
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
  if (npcs) {
    for (const sp of setup.tourists) npcs.spawn(sp);
    // the background crowd: the same people whether the level is the first one loaded or picked from the menu later
    for (const sp of strollerSpawns(level.id, levelStart(), strollerCount(level), walkable, setup.tourists, poisFor(level.district))) npcs.spawn(sp);
  }
  if (npcs) { npcs.stations = [...(level.stations ?? [])]; npcs.crumbs = [...(level.crumbs ?? [])]; npcs.crumbsEaten = 0; }
  defense?.dispose();
  defense = makeDefense();
  heatMeter?.remove();
  heatMeter = defense ? new HeatMeter(document.body) : null;
  quests.load(greybox ? [] : setup.quests);
  if (level.sandbox) quests.restoreWon(save.questsWon);
  triggers.load(greybox ? [] : setup.triggers);
  todo.defs = setup.quests;
  todo.secret = setup.secret;
  todo.side = setup.side;
  todo.scout.reset();
  rowTimes.reset();
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

/** The victory run after a level: the gull lands, runs at the camera laughing, and then the card shows. */
const outro = new Outro(() => ({ land: tuning.outro.landSeconds.value, run: tuning.outro.runSeconds.value, hold: tuning.outro.holdSeconds.value }));
let outroCard: (() => void) | null = null;
let outroClock = 0;
let outroLaugh = 0;
let outroHold: { x: number; z: number } | null = null;
const groundAt = (x: number, z: number): { y: number; water: boolean } => ({ y: world.surfaceBelow(x, z, 500).y, water: !level.winter && !isLand(x, z) });
function startOutro(showCard: () => void): void {
  const automated = navigator.webdriver && !new URLSearchParams(location.search).has('outro'); // browser tests expect the card at once (?outro turns it back on)
  if (tuning.outro.enabled.value < 0.5 || players.length > 1 || net || automated) {
    showCard();
    return;
  }
  const s = gull.state;
  const plan = planRun(groundAt, { x: s.x, z: s.z }, tuning.walk.speed.value * tuning.outro.runSeconds.value + tuning.outro.camDistance.value + 2, -s.heading);
  outroCard = showCard;
  outroClock = 0;
  outroLaugh = 0;
  lockId = null;
  const top = world.surfaceBelow(plan.start.x, plan.start.z, 500).y;
  gull.place(plan.start.x, Math.max(s.y, top + 3.5, s.mode === 'ground' ? top + 0.5 : 0), plan.start.z);
  s.vx = 0;
  s.vz = 0;
  s.vy = 0;
  outro.start(plan, tuning.walk.speed.value);
  document.body.classList.add('outro');
}
function endOutro(): void {
  document.body.classList.remove('outro');
  if (outro.plan) cam.yaw = yawFor(outro.plan.dir); // the normal camera picks up behind the gull
  const show = outroCard;
  outroCard = null;
  show?.();
}

/** The always-on layers: the tram's rumble by distance, the sea when you are near water, and the city murmur by how many people are close. */
let ambientT = 0;
let seaNear = 0;
function ambientSound(dt: number): void {
  const s = gull.state;
  ambientT -= dt;
  if (ambientT <= 0) {
    ambientT = 0.5;
    let wet = 0;
    for (const r of [14, 40]) for (let i = 0; i < 8; i++) if (!isLand(s.x + Math.cos((i * Math.PI) / 4) * r, s.z + Math.sin((i * Math.PI) / 4) * r)) wet++;
    seaNear = Math.min(1, wet / 8) * (s.y > 60 ? 0.5 : 1);
  }
  const tramLoud = tram ? distanceGain(Math.hypot(s.x - tram.x, s.z - tram.def.z), 10, 120, 0) * (tram.mode === 'run' ? 1 : 0.15) : 0;
  const crowd = npcs ? Math.min(1, npcs.npcs.filter((n) => Math.hypot(n.x - s.x, n.z - s.z) < 25).length / 8) * (s.y > 30 ? 0.3 : 1) : 0;
  audio.setAmbient({ tram: tramLoud, sea: seaNear, city: crowd });
}

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
  // the hidden to-dos: how many are still out there (an open loop to come back for)
  if (setup.secret.size) {
    const found = [...setup.secret].filter((id) => quests.quests.find((q) => q.id === id)?.status === 'won').length;
    notes.push(found === setup.secret.size ? `Secret to-dos: all ${found} found.` : `Secret to-dos: ${found} of ${setup.secret.size} found. ${setup.secret.size - found} still hidden in this level.`);
  }
  // where the minutes went (M111): the time each row of a collection was delivered, and how long after the one before
  const collection = setup.quests.find((q) => q.collect);
  notes.push(...rowTimes.lines(collection?.collect?.courses?.map((c) => c.name) ?? []));
  if (level.endingNote) notes.push(level.endingNote);
  if (level.reward) {
    const sk = skills.unlock(level.reward);
    if (sk) {
      notes.push(`New skill: ${sk.name}. ${sk.blurb}`);
      announce.show(`New skill: ${sk.name}`, `${sk.blurb}${sk.key ? ` Press ${sk.key}.` : ''} (K: all skills)`, 'learned');
    }
  }
  const earned = badgesEarned(runLog.tally(), chain.best).filter((b) => !save.badges.includes(b.id));
  if (earned.length) {
    save = { ...save, badges: [...save.badges, ...earned.map((b) => b.id)] };
    for (const b of earned) notes.push(`Badge: ${b.name}. ${b.blurb}`);
  }
  const idx = LEVELS.findIndex((l) => l.id === level.id);
  const nextLevel = LEVELS.slice(idx + 1).find((l) => !l.sandbox);
  const summary = stats.summary();
  const rows = quests.quests.map((x) => ({ title: setup.secret.has(x.id) && x.status !== 'won' ? '???' : x.title, won: x.status === 'won' }));
  startOutro(() => {
    levelComplete.setPhotos(polaroids.album);
    levelComplete.show(summary, rows, notes, {
      heading: `${level.name.replace(/^\d+\.\s*/, '')} cleared!`,
      next: nextLevel ? { id: nextLevel.id, name: nextLevel.name } : undefined,
      go: (target) => (target === 'menu' ? (levelComplete.hide(), levelSelect.show(levelRows())) : goToLevel(target)),
    });
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
    if (snap.k && kalleView) kalleView.setRemote(snap.k[0], snap.k[1], snap.k[2], snap.k[3], KALLE_MODES[snap.k[4]] ?? 'perch');
    if (snap.x) districtRemote = snap.x;
    gull.tangled = !!snap.gulls.find((g) => g.id === 1)?.tg;
    if (players[1]) players[1].gull.tangled = !!host?.tg;
  }
  if (gull.tangled) gull.state.stunT = Math.max(gull.state.stunT, 0.3);
  stepDistrictRemote(dt);
  interaction.props.stepRemote(dt);
  interaction.stepGhosts(dt, simTime);
  npcs?.stepRemote(dt);
  const s = gull.state;
  const { x, y } = input.axes();
  n.sendInput({
    ax: x, ay: y, flap: input.isDown('Space'), dive: input.isDown('ShiftLeft') || input.isDown('ShiftRight'), yaw: cam.yaw, pitch: cam.pitch,
    s: { id: 1, p: [s.x, s.y, s.z], v: [s.vx, s.vy, s.vz], h: s.heading, mode: s.mode, carry: null, fa: s.flapAnim, ha: s.heightAbove, tr: s.turnRate, dg: abilities.disguised ? 1 : 0, tn: gull.taunting ? 1 : 0, lk: lockNow ? [lockNow.x, lockNow.y, lockNow.z] : undefined },
  });
}

/** The whole game as plain data with stable ids (what the host will send in online co-op). */
function captureSnapshot(): Snapshot {
  return makeSnapshot({
    time: simTime,
    gulls: players.map((p) => ({ id: p.id, ...pickXYZ(p.gull.state), vx: p.gull.state.vx, vy: p.gull.state.vy, vz: p.gull.state.vz, heading: p.gull.state.heading, mode: p.gull.state.mode, carry: interaction.beak(p.id).carried?.id ?? null, flapAnim: p.gull.state.flapAnim, heightAbove: p.gull.state.heightAbove, turnRate: p.gull.state.turnRate, disguised: p.remote ? p.gull.remoteDisguised : abilities.disguised, taunt: p.gull.taunting, tangled: p.gull.tangled })),
    props: interaction.props.props.map((pr) => ({ id: pr.id, x: pr.cur.p.x, y: pr.cur.p.y, z: pr.cur.p.z, qx: pr.cur.q.x, qy: pr.cur.q.y, qz: pr.cur.q.z, qw: pr.cur.q.w, by: interaction.carrierOf(pr), held: pr.heldBy, broken: pr.broken })),
    npcs: (npcs?.npcs ?? []).map((n) => ({ id: n.id, x: n.x, z: n.z, heading: n.heading, mode: n.mode, holding: n.holding, handAngle: n.handAngle, selfie: n.selfie, selfieCount: n.selfieCount, cleanT: n.cleanT, shieldFrom: n.shieldFrom })),
    heat: defense?.heat.value ?? 0,
    d: defense?.remoteSnap(),
    k: kalleView ? [kalleView.kalle.x, kalleView.kalle.y, kalleView.kalle.z, kalleView.kalle.heading, KALLE_MODES.indexOf(kalleView.kalle.mode)] : undefined,
    x: districtSnap(),
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
        if (e.hit.kind === 'spray' && interaction.tugProgress(e.gull) !== null) {
          interaction.interruptTug(e.gull); // sprayed in the middle of a tug: you lose it
          hud.toast('Sprayed mid-tug! They keep it.', 1.6);
        }
        const lost = interaction.dropCarried(victim.state, e.gull);
        const what = { spray: 'Sprayed by a vendor!', swat: 'Swatted by the Warden!', line: 'Tangled in a scare line!', net: 'Caught in the net!', drone: 'Hit by the drone!' }[e.hit.kind];
        hud.toast(lost ? `${what} Dropped the ${lost.def.name}!` : what, 1.4);
        audio.play(e.hit.kind === 'spray' ? 'splat' : e.hit.kind === 'swat' ? 'bonk' : 'twang');
        if (e.gull === 0) cam.shake(e.hit.kind === 'swat' ? 0.7 : 0.45);
        fx('feathers', { x: victim.state.x, y: victim.state.y + 0.3, z: victim.state.z });
        if (e.gull === 0 && havoc) havocHud.broken(havoc.hit());
        if (players.length > 1 && (e.hit.kind === 'net' || e.hit.kind === 'line' || e.hit.kind === 'spray')) {
          tangle.caught(e.gull);
          hud.toast('Caught! Your partner can peck you free.', 1.8);
        }
        if (e.gull === 0) hud.flash({ spray: '#7ec8ff', swat: '#ffb347', line: '#ffffff', net: '#ffffff', drone: '#ff6b6b' }[e.hit.kind]);
        victim.openBeak(0.7);
        break;
      }
      case 'spray': {
        audio.play('hiss');
        // anyone standing in the spray is soaked: they drop what they hold and run
        if (npcs) for (const n of npcs.soakCone(e.x, e.z, e.aimX, e.aimZ)) hud.toast(n.role === 'rich' ? 'The rich tourist is soaked!' : 'Soaked!', 1.4);
        break;
      }
      case 'vendorWoke':
        hud.toast('A vendor woke up!', 1.3);
        notes(quests.onEvent('vendorWoke'));
        break;
      case 'droneDodged':
        hud.toast('Dodged the drone!', 1.1);
        notes(quests.onEvent('droneDodged'));
        break;
      case 'droneBonk':
        audio.play('bonk');
        hud.toast('Bonk! The drone\'s battery is draining.', 1.5);
        notes(quests.onEvent('droneBonk'));
        break;
      case 'droneDown':
        announce.show('The drone ran out of battery!', 'It landed. Steal its battery to stop it for good.', 'learned');
        interaction.props.spawn({ type: 'battery', x: e.x, y: restY('battery'), z: e.z, tag: 'droneBattery' });
        break;
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
        if (e.who === 'warden') {
          hud.toast('The Warden spotted you!', 1.2);
          notes(quests.onEvent('wardenHunt'));
        }
        break;
      case 'poopVendor':
        notes(quests.onEvent('poopVendor'));
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
      if (n.quest === 'finale') audio.play('horn');
      if (n.quest === 'finale') announce.show('The ferry horn blows!', 'Chairs in the sandbox, the pastry on the south stall (yellow pillar), and the Warden. The city is on full alert.', 'alert');
      if (n.quest === 'finale') interaction.restock((pr) => pr.type === 'chair' || pr.tag === 'stallBun'); // knocked-over chairs and a taken pastry come back for the finale
      if (def.startHeat && defense) onDefense(defense.ensureHeat(def.startHeat));
    } else if (n.type === 'objective') {
      const rowDef = def.collect ? def.objectives.find((o) => o.id === n.objective) : undefined;
      if (rowDef?.row) {
        picnicRow(rowDef.row.tag);
        rowTimes.record(def.id, rowDef.id, `${rowDef.row.item} (${rowDef.row.owner})`, rowDef.row.course ?? 1, stats.summary().seconds);
      }
      const text = q.objectives.find((o) => o.id === n.objective)!.text;
      hud.toast(`✓ ${text}`, 1.6);
      const victim = def.objectives.find((o) => o.id === n.objective)?.victim;
      if (victim) punchlinePhoto(victim, def.objectives.find((o) => o.id === n.objective)?.outcome ?? text);
      else polaroids.request(text);
      gull.wiggleT = 0.8;
      fx('stars', { x: gull.state.x, y: gull.state.y + 0.8, z: gull.state.z }, 0.6);
      if (n.quest === 'date' && n.objective === 'splat') {
        // the ruined date storms off in opposite directions
        npcs?.sendRole('dater', [{ x: 36, z: -9, name: 'stormoff' }, { x: -37, z: -9, name: 'stormoff' }]);
        hud.toast('The date is ruined! They storm off...', 2);
      }
    } else if (n.type === 'course') {
      // a course of a collection is served (M111): a cheer, and the world moves on (the ferry crowd, the Guard starts his rounds)
      const cname = def.collect?.courses?.[n.course - 1]?.name ?? `Course ${n.course}`;
      rowTimes.course(n.course, stats.summary().seconds);
      hud.toast(`${cname} served!`, 2.6);
      audio.play('chime');
      fx('confetti', { x: gull.state.x, y: gull.state.y + 1.2, z: gull.state.z }, 0.8);
      notes(quests.onEvent(`courseServed:${n.course}`));
    } else if (n.type === 'won') {
      audio.play('win');
      if (n.quest === 'picnicGong' && guests) {
        guests.feasting = true; // the gong: the guests tuck in, and the victims come to look
        notes(quests.onEvent('picnicFeast'));
      }
      if (def.chain && !level.sandbox) {
        // the accomplishment beat: what you did, step by step
        announce.show(`${def.title}: you did it`, recapOf(def.objectives.filter((o) => o.kind === 'event')), 'learned');
        askRating(def.id, def.title);
      }
      fx('confetti', { x: gull.state.x, y: gull.state.y + 1.2, z: gull.state.z });
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

function emoteAtNpc(n: { id: number; x: number; z: number }, kind: EmoteKind | null): void {
  if (!kind) return;
  emotes.show(kind, `npc${n.id}`, () => ({ x: n.x, y: 2.3, z: n.z }), 1.6);
}
function onNpcEvents(evs: NpcEvent[]): void {
  for (const e of evs) {
    if (e.type === 'arrived') notes(quests.onEvent(`arrived:${e.goal}:${e.npc.role}`)); // somebody got where they were sent (the bell, the muster)
    if (e.type === 'noticed') {
      audio.play('gasp');
      notes(quests.onEvent('alert'));
      heat('noticed');
      if (!stealTipShown && e.npc.holding !== null) {
        stealTipShown = true;
        announce.show('Tip: guarded items', 'A red ring means they are guarding it. Dive at it from straight above, or make a noise to distract them and grab it with E from the open side.', 'learned');
      }
    } else if (e.type === 'mood') {
      // a change of mood shows over their head and is what chains are built from
      emoteAtNpc(e.npc, e.mood === 'angry' ? 'anger' : e.mood === 'annoyed' ? 'sweat' : e.mood === 'upset' ? 'facepalm' : e.mood === 'delighted' ? 'heart' : null);
      if (e.mood !== 'calm') notes(quests.onEvent(`mood:${e.npc.role}:${e.mood}`));
    } else if (e.type === 'startled') {
      emoteAtNpc(e.npc, e.dropped ? 'alert' : 'question');
      if (e.dropped) {
        hud.toast('They jump and drop it!', 1.6);
        notes(quests.onEvent(`honkDrop:${e.npc.role}`));
        notes(quests.onEvent('honkDrop'));
        if (race && level.pigeonRace?.on === `honkDrop:${e.npc.role}`) {
          const c = coneView(level.pigeonRace.tag).view;
          if (c) race.start(c);
        }
        polaroids.request('HONK!');
      }
      notes(quests.onEvent(`honked:${e.npc.role}`));
    } else if (e.type === 'slipped') {
      audio.play('splat');
      audio.play('yelp');
      emotes.show('laugh', 'slip', () => ({ x: gull.position.x, y: gull.position.y + 0.75, z: gull.position.z }), 1.8);
      gull.openBeak(0.8);
      gull.wiggleT = 0.8;
      fx('stars', { x: e.npc.x, y: 1.2, z: e.npc.z }, 0.8);
      polaroids.request('Whoops!');
      if (!isGuest()) {
        hud.toast('Whoa!', 1.2);
        notes(quests.onEvent(`slipped:${e.npc.role}`));
      }
    } else if (e.type === 'spread') {
      notes(quests.onEvent(`spread:${e.count}`));
      if (e.count === 5) polaroids.request('Panic!');
    } else if (e.type === 'boo') {
      emoteAtNpc(e.npc, 'alert');
      notes(quests.onEvent('boo'));
      notes(quests.onEvent(`boo:${e.npc.role}`));
    } else if (e.type === 'slam') {
      audio.play('bonk');
      cam.shake(0.35);
      notes(quests.onEvent('slammed'));
    } else if (e.type === 'knockdown') {
      audio.play('thud');
      notes(quests.onEvent(`knockdown:${e.count}`));
      if (e.count === 4) polaroids.request('Strike!');
    } else if (e.type === 'sawWith') {
      // the cross-wire: "that is MY pie!" They march over to the culprit, who looks up, puzzled
      emoteAtNpc(e.npc, 'anger');
      emoteAtNpc(e.other, 'question');
      npcs?.sendTo(e.npc, e.other.x, e.other.z, 'confront');
      notes(quests.onEvent(`sawWith:${e.npc.role}:${e.other.role}`));
    } else if (e.type === 'ritual') {
      notes(quests.onEvent(`ritual:${e.npc.role}`));
    } else if (e.type === 'flourishLost') {
      emoteAtNpc(e.npc, 'question'); // he reaches up for it, and it is not coming back down
      notes(quests.onEvent(`flourishLost:${e.npc.role}`));
    } else if (e.type === 'discovered') {
      // the double take: a puzzled look at the empty spot, then (a moment later) the penny drops
      const who = e.npc;
      emoteAtNpc(who, 'question');
      beats.push({ at: simTime + tuning.watch.doubleTake.value, run: () => {
        emoteAtNpc(who, 'anger');
        audio.play('gasp');
        punchlinePhoto(who.role, `${who.name ?? 'Somebody'}: "WHERE IS IT?"`);
        notes(quests.onEvent(`discovered:${who.role}`));
      } });
    } else if (e.type === 'whistle') {
      guardWhistle(e);
    } else if (e.type === 'caught') {
      emoteAtNpc(e.npc, 'anger');
      audio.play('gasp');
      hud.toast('Spotted with the loot!', 1.4);
      notes(quests.onEvent(`caught:${e.npc.role}`));
    } else if (e.type === 'crumbCall') {
      emoteAtNpc(e.npc, 'alert'); // somebody spotted the food
    } else if (e.type === 'crumb') {
      audio.play('pop');
      fx('hearts', { x: e.npc.x, y: 1.8, z: e.npc.z }, 0.6);
      for (let i = 1; i <= e.count; i++) notes(quests.onEvent(`crumbs:${i}`));
    } else if (e.type === 'dancing') {
      for (let i = 1; i <= e.count; i++) notes(quests.onEvent(`dancers:${i}`));
      if (e.count >= 4) polaroids.request('Dance party!');
    } else if (e.type === 'atStation') {
      notes(quests.onEvent(`atStation:${e.npc.role}:${e.station}`));
    } else if (e.type === 'bought') {
      audio.play('pop');
      hud.toast('Bought a treat to feel better.', 1.8);
      notes(quests.onEvent(`bought:${e.npc.role}`));
    } else if (e.type === 'panic' || e.type === 'chase') {
      audio.play('yelp');
      if (e.type === 'chase') {
        notes(quests.onEvent(`robbed:${e.npc.role}`)); // snatched from them
        notes(quests.onEvent('robbed'));
      }
    }
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
    } else if (e.type === 'danced') {
      notes(quests.onEvent(`dancing:${e.npc.role}`));
    } else if (e.type === 'distracted') {
      notes(quests.onEvent(`distract:${e.npc.role}`)); // somebody looked away (holding something or not)
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
        // a pose in the picture ruins it your way (Act 2)
        const poses = photoPoses(e.who);
        if (poses.length) {
          notes(quests.onEvent('pose:any'));
          for (const k of new Set(poses)) notes(quests.onEvent(`pose:${k}`));
          if (lastPose && poses[0] !== lastPose) notes(quests.onEvent('pose:new')); // a different pose from the last photo
          lastPose = poses[0];
          if (poses.length >= 2) notes(quests.onEvent('coop:pose'));
          polaroids.request('Say pigeon!');
        }
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
  if (quietLeft > 0) {
    notes(quests.onEvent('mimicQuiet'));
    hud.toast('Every phone in the crowd rings at once!', 1.8);
  }
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
        if (g.prop.type === 'boombox') startBoombox(g.prop);
        tutorial.event('grab');
        audio.play('pop');
        (players[g.by ?? 0]?.gull ?? gull).openBeak(0.25);
        hud.toast(`Got the ${g.prop.def.name}!`, 0.7);
        if (g.prop.tag) notes(quests.onEvent(`grab:${g.prop.tag}`));
        if (g.prop.tag === 'droneBattery') {
          defense?.removeDrone();
          hud.toast('You took its battery: the drone is dead.', 1.8);
        }
        if (PROPS[g.prop.type].tags.includes('edible')) notes(quests.onEvent('snack'));
        if (g.prop.tag === 'wardenSandwich' && defense?.warden?.mode === 'lunch') notes(quests.onEvent('sandwichUnseen')); // took it while he was still eating
        notes(quests.onEvent(`grab:${g.prop.type}`));
        if (PROPS[g.prop.type].tags.includes('edible')) fx('crumbs', g.prop.cur.p, 0.7);
        if (players.length > 1) {
          const by = g.by ?? 0;
          if (passes.grabbed(g.prop.id, by, simTime, players[by]?.gull.state.mode !== 'ground')) {
            hud.toast(passes.chain > 1 ? `Caught! Pass x${passes.chain}` : 'Caught in mid-air!', 1.2);
            fx('stars', g.prop.cur.p);
            emoteOver(players[by], 'star');
            notes(quests.onEvent('coop:pass'));
            if (passes.chain >= 3) notes(quests.onEvent('coop:volley'));
          }
          const was = lastHolder.get(g.prop.id);
          if (was && was.by !== by && simTime - was.t <= 6) notes(quests.onEvent('coop:handover'));
          lastHolder.set(g.prop.id, { by, t: simTime });
        }
        break;
      case 'drop':
        passes.released(g.prop.id, g.by ?? 0, simTime);
        lastHolder.set(g.prop.id, { by: g.by ?? 0, t: simTime });
        break;
      case 'toss':
        audio.play('hop');
        passes.released(g.prop.id, g.by ?? 0, simTime);
        lastHolder.set(g.prop.id, { by: g.by ?? 0, t: simTime });
        break;
      case 'heavy':
        if (g.prop.type === 'boombox') startBoombox(g.prop);
        else hud.toast(`The ${g.prop.def.name} is too heavy!`, 0.8);
        break;
      case 'splat':
        audio.play('splat');
        noise(g.x, g.z, 0.4);
        if (!isGuest()) {
          npcs?.addHazard(g.x, g.z); // a wet patch: whoever walks through it slips
          hitSwitch(g.x, g.z, 'splat');
          for (const z of level.splatZones ?? []) if (g.x >= z.zone.minX && g.x <= z.zone.maxX && g.z >= z.zone.minZ && g.z <= z.zone.maxZ) notes(quests.onEvent(z.event));
        }
        break;
      case 'tugStart':
        hud.toast('Tug of war! Mash E!', 1.4);
        audio.play('twang');
        break;
      case 'tugWin': {
        hud.toast('Won the tug!', 1.2);
        audio.play('pop');
        fx('stars', g.prop.cur.p, 0.7);
        notes(quests.onEvent('tugWin'));
        if ((g.team ?? 1) >= 2) notes(quests.onEvent('coop:tug'));
        if (g.prop.tag) notes(quests.onEvent(`tugWin:${g.prop.tag}`));
        break;
      }
      case 'tugLost':
        hud.toast('They hung on to it!', 1.4);
        audio.play('gasp');
        notes(quests.onEvent('tugLost'));
        break;
      case 'snatch':
        audio.play('yelp');
        hud.toast('Snatched!', 1);
        notes(quests.onEvent(`snatch:${g.prop.type}`));
        notes(quests.onEvent('snatch'));
        notes(quests.onEvent('snack'));
        if (bellLeft > 0) notes(quests.onEvent('bellSnatch'));
        if (players.length > 1 && combo.hit('snatch', g.by ?? 0, simTime, 5)) notes(quests.onEvent('coop:snatch'));
        {
          const thief = players[g.by ?? 0] ?? players[0];
          fx('stars', g.prop.cur.p);
          thief.gull.squash.kick(tuning.juice.snatchStretch.value);
          if (decoyCovers(g.by ?? 0, thief.gull.state, players.map((pl) => ({ x: pl.gull.state.x, z: pl.gull.state.z, taunt: pl.gull.taunting })))) {
            hud.toast('Perfect decoy! They never looked.', 1.6);
            emoteOver(players.find((pl) => pl !== thief && pl.gull.taunting), 'laugh');
            notes(quests.onEvent('coop:decoy'));
          }
        }
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
        if (bellLeft > 0) notes(quests.onEvent('bellPoop')); // splatted while everyone is looking up at the tower
        if (players.length > 1 && combo.hit('poopNpc', g.by ?? 0, simTime, 5)) notes(quests.onEvent('coop:poopNpc'));
        if (g.x !== undefined && g.z !== undefined && spotterHit(partnerLock(g.by ?? 0), { x: g.x, z: g.z })) {
          hud.toast('Spotted and splatted! Nice teamwork.', 1.6);
          fx('stars', { x: g.x, y: 1.8, z: g.z });
          notes(quests.onEvent('coop:spotted'));
        }
        if (g.role) notes(quests.onEvent(`poopNpc:${g.role}`));
        stats.add('poopPerson');
        heat('poopNpc');
        break;
      case 'poopProp':
        audio.play('splat');
        hud.toast(`Splat! ${g.prop.def.name}`, 0.9);
        if (g.prop.tag === 'cleanSign' && npcs?.signSplatted()) hud.toast('The Clean Freak drops everything to scrub!', 1.6);
        if (g.prop.type === 'balloon') {
          // pop!
          interaction.props.destroy(g.prop);
          audio.play('pop');
          hud.toast('Pop!', 0.8);
          notes(quests.onEvent('balloonPop'));
        }
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
        hitSwitch(t.x, t.z);
        break;
      }
      case 'clatter': {
        // a noisy prop clangs (loud, adds heat); anything else thrown hard just thumps (quieter, but still distracts)
        audio.play(g.quiet ? 'thud' : 'clatter');
        noise(g.prop.cur.p.x, g.prop.cur.p.z, g.quiet ? 0.6 : 1);
        if (!g.quiet) heat('clatter');
        hitSwitch(g.prop.cur.p.x, g.prop.cur.p.z);
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
    if (input.wasPressed('KeyJ') && !menuOpen()) askHint();
    if (input.wasPressed('KeyU')) {
      options.hud = nextHudMode(options.hud);
      hudF = applyHud(options.hud);
      optStore.save(options);
      hud.toast(`HUD: ${HUD_NAMES[options.hud]}`, 0.9);
    }
    if (input.wasPressed('KeyY') && tutorial.running) {
      tutorial.skip();
      options.tutorialDone = true;
      optStore.save(options);
    }
    // mouse look: optionally spread over a few frames (comfort), vertical can be inverted
    const look = lookSmoother.step(m.dx, m.dy, dt, comfort.mods.lookTau);
    if (!menuOpen()) cam.rotate(look.dx, comfort.invertY ? -look.dy : look.dy);
    lookIdle = Math.abs(m.dx) + Math.abs(m.dy) > 0.5 ? 0 : lookIdle + dt;
    // the camera drifts round behind the gull's heading when you are not looking around yourself
    if (!menuOpen() && !outro.active && !lockNow && lookIdle > 1.2 && Math.hypot(gull.state.vx, gull.state.vz) > 2.5) cam.yaw = followYawStep(cam.yaw, gull.state.heading, dt, FOLLOW_RATE[comfort.follow]);
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
    // co-op: hold T to taunt (people nearby watch you, not your partner); 1-4 are emotes
    const tIn = tauntInput(0, !blocked && input.isDown('KeyT'), dt);
    gull.taunting = tIn && gull.state.stunT <= 0; // T: tap = honk, hold = taunt (T used to skip the tips: that is Y now)
    if (!blocked && !skillsPanel.visible) EMOTE_KEYS.forEach((k, i) => {
      if (!input.wasPressed(`Digit${i + 1}`)) return;
      emoteOver(players[0], k);
      strikePose(players[0], k);
      if (isGuest()) net!.tap(`Digit${i + 1}`);
    });
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
    const scripted = outro.active;
    if (scripted && ['Space', 'Enter', 'Escape', 'KeyE', 'KeyF', 'KeyQ'].some((k) => input.wasPressed(k))) {
      outro.skip();
      endOutro();
    }
    const rawAx = blocked || scripted ? { x: 0, y: scripted && outro.phase === 'run' ? 1 : 0 } : input.axes();
    // smooth steering: a keyboard press ramps up over a fraction of a second instead of jerking the gull round
    const tau = comfort.smoothSteer && !scripted ? comfort.mods.stickTau : 0;
    steerX = smoothAxis(steerX, rawAx.x, dt, tau);
    steerY = smoothAxis(steerY, rawAx.y, dt, tau);
    const x = Math.abs(steerX) < 0.01 ? 0 : steerX;
    const y = Math.abs(steerY) < 0.01 ? 0 : steerY;
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
    if (scripted && outro.phase === 'land' && gull.state.mode !== 'ground') {
      // a gentle scripted descent, then the normal landing code does the rest
      const gs = gull.state;
      outroHold = { x: gs.x, z: gs.z };
      const gnd = world.surfaceBelow(gs.x, gs.z, gs.y).y;
      gs.vx *= 0.9;
      gs.vz *= 0.9;
      gs.vy = -Math.max(2.5, Math.max(0, gs.y - gnd) / Math.max(0.3, tuning.outro.landSeconds.value));
    }
    const evs = gull.update(
      { ax: x, ay: y, flap: !blocked && !scripted && input.isDown('Space'),
        dive: !blocked && !scripted && (input.isDown('ShiftLeft') || input.isDown('ShiftRight')),
        aimPitch: cam.pitch,
        carryMass: isGuest() ? guestCarryMass : interaction.carriedMass(0),
        lock: lockPoint,
        lift: thermalLift(gull.state),
      },
      scripted && outro.plan ? yawFor(outro.plan.dir) : cam.yaw,
      dt,
      world,
      simTime,
      npcs ? [...targets, ...npcs.handTargets()] : targets,
    );
    onFlightEvents(evs);
    if (outroHold && outro.phase === 'land') {
      // no glide drift on the way down: the gull drops straight onto the spot
      gull.state.x = outroHold.x;
      gull.state.z = outroHold.z;
      gull.state.vx = 0;
      gull.state.vz = 0;
    }
    outroHold = null;
    if (scripted) {
      const was = outro.phase;
      const ended = outro.tick(dt, gull.state.mode === 'ground');
      if (was === 'land' && outro.phase !== 'land') {
        fx('confetti', { x: gull.state.x, y: gull.state.y + 1.2, z: gull.state.z });
        audio.play('win');
      }
      if (ended) endOutro();
    }
    if (npcs && !isGuest()) npcs.slam(gull.state);
    if (!isGuest()) toyStep(dt);
    ratingKeys();
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
    } else {
      for (const [k, v] of switchCd) switchCd.set(k, v - dt);
      const sw = switchNear(gull.state);
      if (sw && !blocked && !interaction.carried && input.wasPressed('KeyE')) peck(sw, players[0]);
      onGags(interaction.updateGull(0, gull.state, { grab: !blocked && input.wasPressed('KeyE'), grabHeld: !blocked && input.isDown('KeyE'), toss: !blocked && input.wasPressed('KeyQ'), poop: !blocked && (input.wasPressed('KeyF') || input.wasClicked()), lock: lockPoint ? { ...lockPoint, r: lockNow!.radius } : spotAssist(0) }, dt, simTime));
    }
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
          EMOTE_KEYS.forEach((k, i) => { if (taps.includes(`Digit${i + 1}`)) { emoteOver(p, k); strikePose(p, k); } });
          if (taps.includes('KeyV')) mimic(p.gull, yaw);
          if (taps.includes('KeyG')) flockCall(p.gull, yaw);
          if (taps.includes('KeyH') && defense?.activateHawk()) hud.toast('Hawk-eye!', 0.8);
          onGags(interaction.updateGull(p.id, p.gull.state, { grab: taps.includes('KeyE'), toss: taps.includes('KeyQ'), poop: taps.includes('KeyF'), lock: net!.guestFrame?.s.lk ? { x: net!.guestFrame.s.lk[0], y: net!.guestFrame.s.lk[1], z: net!.guestFrame.s.lk[2], r: 0.9 } : spotAssist(p.id) }, dt, simTime));
        } else p.gull.stepRemote(dt); // on a guest this is the host's gull
        continue;
      }
      p.gull.taunting = tauntInput(players.indexOf(p), p.input.isDown('KeyT'), dt);
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
      onGags(interaction.updateGull(p.id, p.gull.state, { grab: p.input.wasPressed('KeyE'), grabHeld: p.input.isDown('KeyE'), toss: p.input.wasPressed('KeyQ'), poop: p.input.wasPressed('KeyF') }, dt, simTime));
      p.input.endStep();
    }
    if (isGuest()) guestStep(dt);
    else onGags(interaction.step(dt, simTime, gull.state));
    if (npcs && !isGuest()) {
      const g = gull.state;
      boomboxStep();
      beatsStep();
      watchersCatch();
      if (!levelCleared) todo.ladder.tick(dt, ladderSteps(setup.quests, quests.quests, todo.scout.focus));
      if (!isGuest()) timetableStep(dt);
      if (!isGuest() && !levelCleared && !level.sandbox && !havoc && nudge.update(dt, tuning.nudge.after.value, tuning.nudge.every.value)) hud.toast(nudgeText(), 4);
      onNpcEvents(npcs.update(dt, players.map((p) => ({ x: p.gull.state.x, y: p.gull.state.y, z: p.gull.state.z, diving: p.gull.state.mode === 'dive', taunt: p.gull.taunting, hidden: hiddenNow(p.gull.state), disguise: disguiseT > 0, carrying: interaction.beak(players.indexOf(p)).carried?.tag ?? null }))));
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
        if (ev === 'bellRung') ringBell();
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
    // the conga line: events when enough followers are in a place (once each)
    if (level.parade && npcs && !isGuest()) {
      for (const st of level.parade.stops) {
        if (paradeDone.has(st.event)) continue;
        const n = st.at ? npcs.followersNear(st.at.x, st.at.z, st.at.r) : npcs.followingCount();
        if (n < st.need) continue;
        paradeDone.add(st.event);
        if (st.text) hud.toast(st.text, 2.4);
        audio.play('chime');
        notes(quests.onEvent(st.event));
        if (st.send) npcs.sendRole(st.send.role, st.send.goals);
      }
    }
    // the cathedral bell
    if (level.bells && !isGuest()) {
      bellClock += dt;
      if (bellClock >= level.bells.first && (bellClock - level.bells.first) % level.bells.every < dt) ringBell();
      if (bellLeft > 0) {
        bellLeft -= dt;
        bellLastNoise -= dt;
        if (bellLastNoise <= 0) {
          bellLastNoise = 1; // a fresh "everybody look" each second while it rings
          noise(level.bells.x, level.bells.z, 3);
        }
      }
    }
    streetLife?.update(dt, gull.state);
    snow.update(dt, gull.state, simTime);
    rain.update(dt, gull.state, simTime);
    if (!isGuest()) stepKalleGame(dt);
    if (!isGuest()) stepSenate(dt);
    picnicStep();
    pigeonRaceStep(dt);
    if (!isGuest()) stepEsplanadi(dt);
    ambientStep(dt);
    if (!isGuest()) coopStep(dt);
    if (havoc && !havoc.done) {
      if (!havoc.started && (Math.hypot(gull.state.vx, gull.state.vz) > 1.5 || simTime > tuning.havoc.startDelay.value + 10)) havoc.start();
      havoc.update(dt);
    }
    if (havoc?.done && !havocShown) {
      havocShown = true;
      const prev = save.havocBest;
      const newBest = havoc.score > prev;
      if (newBest) save = { ...save, havocBest: havoc.score };
      persist();
      havocHud.results(havoc, Math.max(prev, havoc.score), newBest, `${runLog.events.length} things happened`);
      audio.play('win');
      fx('confetti', { x: gull.state.x, y: gull.state.y + 1.2, z: gull.state.z });
    }
    juiceStep(dt);
    updateTargets(targets, dt);
    input.endStep();
  },
  render(alpha, frameDt) {
    for (const p of players) p.gull.applyInterpolation(alpha, frameDt, world);
    pad.poll(frameDt, tuning.gamepad.deadzone.value, tuning.gamepad.lookSpeed.value);
    interaction.render(alpha, gull.state, simTime, cam.camera.quaternion);
    npcs?.render(simTime, interaction.beakPos(gull.state), cam.camera.quaternion);
    streetLife?.render(simTime, gull.state);
    kalleView?.render(frameDt);
    guests?.update(frameDt);
    defense?.render(simTime, frameDt);
    if (defense && heatMeter) heatMeter.update(defense.heat, defense.response, defense.hawkReady, defense.hawkActive);
    // quest spots, plus a marker on any item that was knocked out of the beak (so it can never be lost)
    const markers: Marker[] = greybox ? [] : activeMarkers(setup.quests, quests.quests, false, rungOf);
    const labelled = hudF.waypoints === 'all' ? markers : hudF.waypoints === 'active' ? activeMarkers(setup.quests, quests.quests, true, rungOf) : [];
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
    itemGlow.update(greybox ? [] : interaction.props.props, gull.position, wantedItems(setup.quests, quests.quests), defense?.hawkActive === true, options.highlight, simTime, secretSpots());
    waypoints.update(labelled, cam.camera, gull.position, innerWidth, innerHeight);
    todo.ladder.mode = options.hints;
    todo.revealNear = new Set(setup.quests.filter((q) => q.reveal && setup.secret.has(q.id) && Math.hypot(q.reveal.x - gull.state.x, q.reveal.z - gull.state.z) <= q.reveal.r).map((q) => q.id));
    todo.scout.update(setup.quests, quests.quests, gull.state);
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
    touchControls?.update(interaction.grabPrompt(s), !!interaction.carried, { V: skills.has('mimic'), G: skills.has('flock'), B: skills.has('disguise') }, (code) => abilities.fraction(code === 'KeyV' ? 'mimic' : code === 'KeyG' ? 'flock' : 'disguise'), players.length > 1 || setup.quests.some((q) => q.chain), { poop: !mech('poop'), toss: !mech('toss'), taunt: !mech('taunt') });
    hud.setInteraction(blocked ? 'Umbrella blocks it! Distract the Warden with a noise first (drop or throw a bottle)' : (!interaction.carried && switchNear(s) ? `E: ${({ yank: 'yank', summon: 'ring', domino: 'push', disguise: 'wear' } as Record<string, string>)[switchNear(s)!.effect] ?? 'peck'} the ${switchNear(s)!.label}` : '') || interaction.grabPrompt(s), poopReady);
    if (outro.active && outro.plan) {
      outroClock += frameDt;
      const t = tuning.outro;
      const c = outroCamera(gull.position, outro.plan.dir, outroClock, { distance: t.camDistance.value, height: t.camHeight.value, sway: t.camSway.value }, outro.plan.y);
      cam.cinematic(c.pos, c.look, outroClock < 0.05 ? 1 : 1 - Math.exp(-5 * frameDt));
      if (outro.phase === 'run' || outro.phase === 'hold') {
        gull.openBeak(0.25);
        gull.wiggleT = Math.max(gull.wiggleT, 0.2);
        outroLaugh -= frameDt;
        if (outroLaugh <= 0) {
          outroLaugh = 0.9;
          audio.play('screech');
          emotes.show('laugh', gull, () => ({ x: gull.position.x, y: gull.position.y + 0.75, z: gull.position.z }), 1.2);
        }
      }
    } else cam.update(gull.position, frameDt, { vx: s.vx, vy: s.vy, vz: s.vz, diving: s.mode === 'dive', turnRate: s.turnRate });
    audio.setAir(Math.hypot(s.vx, s.vy, s.vz) / tuning.dive.speed.value, s.mode !== 'ground');
    ambientSound(frameDt);
    const tugP = interaction.tugProgress(0);
    tugEl.hidden = tugP === null;
    if (tugP !== null) (tugEl.querySelector('i') as HTMLElement).style.width = `${Math.round(Math.max(0, Math.min(1, tugP)) * 100)}%`;
    vignetteEl.style.opacity = vignetteAmount(s.turnRate, s.mode === 'dive', Math.hypot(s.vx, s.vy, s.vz) / tuning.dive.speed.value, comfort.mods.vignette).toFixed(2);
    graphics.update(gull.position);
    sky.update(frameDt, cam.camera.position, simTime);
    tickMotion(simTime);
    birds?.update(simTime);
    water?.update(simTime);
    ripples.update(frameDt);
    if (havoc) havocHud.update(havoc);
    emotes.update(frameDt);
    puffs.update(frameDt);
    rippleT -= frameDt;
    if (s.mode === 'ground' && s.overWater && rippleT <= 0) {
      rippleT = Math.hypot(s.vx, s.vz) > 0.4 ? 0.45 : 1.6; // paddling makes more rings than floating
      ripples.add(s.x, s.z, 0.8);
    }
    if (postActive(graphics.level, options.inkLook)) post.render(scene, cam.camera);
    else {
      post.release();
      renderer.render(scene, cam.camera);
    }
    polaroids.tick(frameDt);
    polaroids.capture(renderer.domElement, simTime);
    debug.frame(frameDt, `${renderer.info.render.calls} calls · ${(renderer.info.render.triangles / 1000).toFixed(0)}k tris`);
    const tip = tutorial.current;
    tipEl.hidden = !(tip || tutorial.outroShowing) || menuOpen();
    if (!tipEl.hidden) tipEl.innerHTML = tip ? (touch ? `${tip.touch.text} <small>${tip.touch.keys} · ☰ › Skip tips</small>` : `${tip.text} <small>${tip.keys} · Y skips tips</small>`) : 'That is the whole trick. The to-do list (top left) has the rest. Go be a menace!';
    hud.update(s, staminaMax(), windAt(simTime), cam.yaw, hits, targets.length, frameDt);
  },
});

(window as unknown as { __lokkiReady: boolean }).__lokkiReady = true;
const boot = document.getElementById('boot');
boot?.classList.add('gone');
setTimeout(() => boot?.remove(), 700);
events.emit('ready', undefined);
