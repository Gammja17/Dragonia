import { state } from '../core/state.js';
import { WORLD_SIZE, VILLAGE_CENTER, PLAYER_SPAWN, NEST_POS, HOMES, TRAINING, MAX_ENEMIES, CHEST_COUNT } from '../core/config.js';
import { rand, dist, pick, mulberry32 } from '../core/utils.js';
import { getBiome } from './biomes.js';
import { groundAt } from './terrain.js';
import { buildPropGrid, solidAt } from './collision.js';
import { WAYSTONES } from '../systems/travel.js';
import { Dragon } from '../entities/Dragon.js';
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { Prop } from '../entities/Prop.js';
import { Nest } from '../entities/Nest.js';
import { FIXED_NPCS, WANDER_NAMES, WANDER_PERSONALITIES, WANDER_SPECIES, WANDER_LOOKS, WANDER_ACCESSORIES, SPECIES_COLORS } from '../data/npcs.js';
import { BIOME_ENEMIES, BOSSES } from '../data/enemies.js';
import { enemyCapMult } from '../systems/events.js';

const ELITE_CHANCE = 0.08;

const DESPAWN_RANGE = 1900; // 플레이어에게서 이만큼 멀어진 적은 치운다

/** 플레이어 주변(화면 밖)의 위험 지역에 그 바이옴의 적을 하나 만든다 */
export function spawnEnemy() {
    const p = state.player;
    for (let tries = 0; tries < 8; tries++) {
        const a = rand(0, Math.PI * 2), r = rand(750, 1300);
        const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
        if (x < 60 || y < 60 || x > WORLD_SIZE - 60 || y > WORLD_SIZE - 60) continue;
        const types = BIOME_ENEMIES[getBiome(x, y)];
        if (!types || dist({ x, y }, VILLAGE_CENTER) < 700) continue;
        if ([...Object.values(BOSSES), TRAINING].some(b => dist({ x, y }, b) < 480)) continue; // 결투장·수련장은 비워 둔다
        if (dist({ x, y }, NEST_POS) < 420) continue;                                          // 아지트도
        if (solidAt(x, y, 20)) continue;                                                       // 나무·바위·물 속은 안 된다
        const type = pick(types);
        state.entities.enemies.push(new Enemy(x, y, type, type !== 'PREY' && Math.random() < ELITE_CHANCE));
        return;
    }
}

export function spawnWanderingNPC() {
    let x, y, tries = 0;
    do { x = rand(300, 3200); y = rand(300, 3200); tries++; }
    while ((getBiome(x, y) === 'VILLAGE' || solidAt(x, y, 20)) && tries < 40);
    // 떠돌이는 대부분 한 장짜리 새 외형, 가끔 옛 종족
    const species = Math.random() < 0.8 ? 'LOOK' : pick(WANDER_SPECIES);
    state.entities.npcs.push(new Dragon(x, y, {
        name: pick(WANDER_NAMES),
        personality: pick(WANDER_PERSONALITIES),
        species,
        colors: SPECIES_COLORS[species] || SPECIES_COLORS.WESTERN,
        look: pick(WANDER_LOOKS),
        accessory: pick(WANDER_ACCESSORIES),
        scale: rand(0.8, 1.15),
        canPartner: false,
    }));
}

/** 매 프레임: 멀어진 적은 치우고, 부족하면 플레이어 주변에 보충 */
export function updateSpawns() {
    const E = state.entities;
    for (const e of E.enemies) if (dist(e, state.player) > DESPAWN_RANGE) e.remove = true;
    if (E.enemies.length < MAX_ENEMIES * enemyCapMult() && Math.random() < 0.05) spawnEnemy();
}

/** 새 게임 월드 구성. 엘더 NPC를 반환(튜토리얼용). */
export function buildWorld(config) {
    const E = state.entities;

    state.player = new Dragon(PLAYER_SPAWN.x, PLAYER_SPAWN.y, {
        name: config.name,
        species: config.species,
        colors: config.colors,
        accessory: config.accessory || null,
        look: config.look || 0,
    }, true);

    // 숲 소품은 풀밭 위에만. 나무는 크니까 마을에서 더 멀리. 시드 고정이라 이어하기를 해도 숲이 그대로다
    const rng = mulberry32(777);
    const DECOR = ['BUSH', 'BUSH', 'FERN', 'FERN', 'ROCK', 'STUMP'];
    for (let i = 0; i < 1250; i++) {
        const x = rng() * WORLD_SIZE, y = rng() * WORLD_SIZE;
        if (groundAt(x, y) === 'GRASS' && dist({ x, y }, VILLAGE_CENTER) > 650) E.props.push(new Prop(x, y, 'TREE'));
    }
    for (let i = 0; i < 2100; i++) {
        const x = rng() * WORLD_SIZE, y = rng() * WORLD_SIZE, type = DECOR[Math.floor(rng() * DECOR.length)];
        if (groundAt(x, y) === 'GRASS') E.props.push(new Prop(x, y, type));
    }
    // 열매 덤불: 마을 근처에도 몇 개
    for (let n = 0, tries = 0; n < 150 && tries < 1200; tries++) {
        const x = 100 + rng() * (WORLD_SIZE - 200), y = 100 + rng() * (WORLD_SIZE - 200);
        if (groundAt(x, y) !== 'GRASS') continue;
        E.props.push(new Prop(x, y, 'BERRY'));
        n++;
    }
    // 보물상자: 마을 밖 풀밭 곳곳에. 열린 상자는 applySave 가 다시 열어 둔다
    for (let id = 0, tries = 0; id < CHEST_COUNT && tries < 800; tries++) {
        const x = 150 + rng() * (WORLD_SIZE - 300), y = 150 + rng() * (WORLD_SIZE - 300);
        if (groundAt(x, y) !== 'GRASS' || dist({ x, y }, VILLAGE_CENTER) < 800) continue;
        const chest = new Prop(x, y, 'CHEST');
        chest.chestId = id++;
        E.props.push(chest);
    }
    // 마을
    for (const [x, y, type] of [
        [980, 1040, 'HOUSE'], [1430, 1030, 'HOUSE'], [1460, 1540, 'HOUSE'],
        [1200, 1130, 'FOUNTAIN'], [1060, 1400, 'CAMPFIRE'],
        [1110, 1050, 'BARREL'], [1140, 1062, 'CRATE'], [1560, 1045, 'CRATE'], [1335, 1550, 'BARREL'],
        [1540, 1400, 'SIGN'], [900, 900, 'SIGN'],
    ]) E.props.push(new Prop(x, y, type));
    // 아지트: 오두막, 모닥불, 살림살이
    const D = NEST_POS;
    for (const [dx, dy, type] of [[-150, -70, 'HOUSE'], [120, 60, 'CAMPFIRE'], [-40, 110, 'BARREL'], [-10, 118, 'CRATE'], [170, -40, 'SIGN']]) E.props.push(new Prop(D.x + dx, D.y + dy, type));
    // 마을 용들의 보금자리
    for (const h of HOMES) for (const [dx, dy, type] of [[-130, -60, 'HOUSE'], [110, 70, 'CAMPFIRE'], [40, -90, 'BARREL']]) E.props.push(new Prop(h.x + dx, h.y + dy, type));
    // 수련장: 스승의 오두막과 화톳불
    for (const [dx, dy, type] of [[-150, -190, 'HOUSE'], [-260, 150, 'CAMPFIRE'], [260, 150, 'CAMPFIRE'], [200, -200, 'CRATE'], [232, -192, 'BARREL'], [-40, 290, 'SIGN']]) E.props.push(new Prop(TRAINING.x + dx, TRAINING.y + dy, type));
    // 보스 결투장 입구의 화톳불
    for (const b of Object.values(BOSSES)) {
        E.props.push(new Prop(b.x - 260, b.y + 200, 'CAMPFIRE'), new Prop(b.x + 260, b.y + 200, 'CAMPFIRE'));
    }
    // 이동 석비 (systems/travel.js). 길목마다 하나씩 서 있다
    for (const w of WAYSTONES) {
        const stone = new Prop(w.x, w.y, 'WAYSTONE');
        stone.stoneId = w.id;
        E.props.push(stone);
    }
    E.nests.push(new Nest(NEST_POS.x, NEST_POS.y));
    buildPropGrid(E.props);   // 소품 충돌 격자는 소품을 다 놓은 뒤에 한 번 만든다

    for (const def of FIXED_NPCS) E.npcs.push(new Dragon(def.x, def.y, { ...def, fixed: true }));
    for (let i = 0; i < 4; i++) spawnWanderingNPC();
    for (const id of Object.keys(BOSSES)) E.bosses.push(new Boss(id));

    return E.npcs.find(n => n.config.role === 'ELDER');
}
