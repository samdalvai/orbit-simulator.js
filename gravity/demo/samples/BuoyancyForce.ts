import { Utils, type World } from '../../src';
import type Application from '../Application';
import { TEXTURES } from '../graphics/AssetStore';
import Graphics from '../graphics/Graphics';
import { FLOOR_HEIGHT, FLOOR_WIDTH, defineDemo, generateFences, generateFloor } from './shared';

function setupBuoyancyForce(world: World, app: Application): void {
    app.setBackground('transparent');
    Graphics.zoom = 0.75;

    const floor = generateFloor(world, app);
    const fences = generateFences(world, app);

    const texture: keyof typeof TEXTURES = 'metal';
    app.setBodyTexture(floor, texture);
    app.setBodyTexture(fences[0], texture);
    app.setBodyTexture(fences[1], texture);

    const LIQUID_MIN_X = floor.position.x - FLOOR_WIDTH / 2;
    const LIQUID_MIN_Y = floor.position.y + FLOOR_HEIGHT / 2;
    const LIQUID_MAX_X = floor.position.x + FLOOR_WIDTH / 2;
    const LIQUID_MAX_Y = 300;

    app.setLiquid({
        aabb: {
            minX: LIQUID_MIN_X,
            minY: LIQUID_MIN_Y,
            maxX: LIQUID_MAX_X,
            maxY: LIQUID_MAX_Y,
        },
        density: 0.1,
    });

    const numberOfObjects = 100;

    for (let i = 0; i < numberOfObjects; i++) {
        const x = Utils.randomNumber(LIQUID_MIN_X, LIQUID_MAX_X);
        const y = Utils.randomNumber(LIQUID_MAX_Y, LIQUID_MAX_Y + 200);
        const radius = Utils.randomNumber(5, 50);
        const numVertices = Utils.randomNumber(3, 10);
        const mass = Utils.randomNumber(0.01, 5);

        const object = Utils.randomConvexBody(x, y, radius, numVertices, mass);

        world.addBody(object);
    }
}

const buoyancyDemo = defineDemo('Buoyancy demo', setupBuoyancyForce);

export default buoyancyDemo;
