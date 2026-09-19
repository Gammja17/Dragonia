import { state } from '../core/state.js';
import { WORLD_SIZE, VILLAGE_CENTER, PLAYER_SPAWN, MAX_ENEMIES } from '../core/config.js';
import { rand, dist, pick } from '../core/utils.js';
import { getBiome } from './biomes.js';
import { groundAt } from './terrain.js';
import { Dragon } from '../entities/Dragon.js';
import { Enemy } from '../entities/Enemy.js';
import { Prop } from '../entities/Prop.js';
import { Nest } from '../entities/Nest.js';
import { FIXED_NPCS, WANDER_NAMES, WANDER_PERSONALITIES, WANDER_SPECIES, SPECIES_COLORS } from '../data/npcs.js';

function randomPointOutsideVillage(minDist) {
    let x, y;
    do { x = rand(0, WORLD_SIZE); y = rand(0, WORLD_SIZE); }
    while (dist({ x, y }, VILLAGE_CENTER) < minDist);
    return { x, y };
}

export function spawnEnemy() {
    const { x, y } = randomPointOutsideVillage(700);
    state.entities.enemies.push(new Enemy(x, y, Math.random() < 0.5 ? 'SLIME' : 'GOBLIN'));
}

export function spawnWanderingNPC() {
    let x, y;
    do { x = rand(0, WORLD_SIZE); y = rand(0, WORLD_SIZE); }
    while (getBiome(x, y) === 'VILLAGE');
    const species = pick(WANDER_SPECIES);
    state.entities.npcs.push(new Dragon(x, y, {
        name: pick(WANDER_NAMES),
        personality: pick(WANDER_PERSONALITIES),
        species,
        colors: SPECIES_COLORS[species],
        canPartner: false,
    }));
}

/** 매 프레임: 적 수가 부족하면 가끔 보충 */
export function updateSpawns() {
    if (state.entities.enemies.length < MAX_ENEMIES && Math.random() < 0.02) spawnEnemy();
}

/** 새 게임 월드 구성. 엘더 NPC를 반환(튜토리얼용). */
export function buildWorld(config) {
    const E = state.entities;

    state.player = new Dragon(PLAYER_SPAWN.x, PLAYER_SPAWN.y, {
        name: config.name,
        species: config.species,
        colors: config.colors,
    }, true);

    // 숲 소품은 풀밭 위에만. 나무는 크니까 마을에서 더 멀리
    for (let i = 0; i < 130; i++) {
        const x = rand(0, WORLD_SIZE), y = rand(0, WORLD_SIZE);
        if (groundAt(x, y) === 'GRASS' && dist({ x, y }, VILLAGE_CENTER) > 650) E.props.push(new Prop(x, y, 'TREE'));
    }
    for (let i = 0; i < 220; i++) {
        const x = rand(0, WORLD_SIZE), y = rand(0, WORLD_SIZE);
        if (groundAt(x, y) === 'GRASS') E.props.push(new Prop(x, y, pick(['BUSH', 'BUSH', 'FERN', 'FERN', 'ROCK', 'STUMP'])));
    }
    E.props.push(new Prop(1150, 1100, 'HOUSE'));
    E.props.push(new Prop(1200, 1200, 'FOUNTAIN'));
    E.props.push(new Prop(1250, 1300, 'CAMPFIRE'));
    E.nests.push(new Nest(1250, 1250));

    for (const def of FIXED_NPCS) E.npcs.push(new Dragon(def.x, def.y, { ...def }));
    for (let i = 0; i < 3; i++) spawnWanderingNPC();
    for (let i = 0; i < 8; i++) spawnEnemy();

    return E.npcs.find(n => n.config.role === 'ELDER');
}
