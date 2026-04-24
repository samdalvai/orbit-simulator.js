import { BodiesFactory, RigidBody, SETTINGS, Utils, type World } from '../../src';
import { exchangeHeat } from '../../src/force/Temperature';
import type Application from '../Application';
import Graphics from '../graphics/Graphics';
import { defineDemo } from './shared';

export const AMBIENT_TEMPERATURE = 0;
export const MIN_TEMPERATURE = 0;
export const MAX_TEMPERATURE = 5_000;
export const PARTICLE_MASS = 0.015;
export const HEATING_FACTOR = 0.65;
export const DISSIPATION_FACTOR = 0.000001;
export const CONVECTION_FORCE = 0.03;
export const MIN_TEMPERATURE_DIFFERENCE = 1000;

const STATIC_WALL_WIDTH = 50;
const STATIC_WALL_HEIGHT = 500;

function createStaticWall(
    world: World,
    app: Application,
    x: number,
    y: number,
    rotation: number,
    height = STATIC_WALL_HEIGHT,
    temperature = 0,
): RigidBody {
    const wall = BodiesFactory.box({ width: STATIC_WALL_WIDTH, height, x, y, mass: 0.0, rotation, temperature });
    app.setBodyTexture(wall, 'transparent');

    if (temperature > 0) {
        app.removeBodyTexture(wall);
    }
    world.addBody(wall);
    return wall;
}

function setupConvectionForce(world: World, app: Application): void {
    Graphics.zoom = 0.4;

    const floorWidth = 525;
    const floorHeight = 50;

    const floor = BodiesFactory.box({ width: floorWidth, height: floorHeight, x: 12.5, y: -1000, mass: 0.0 });
    floor.temperature = MAX_TEMPERATURE;
    app.removeBodyTexture(floor);
    app.setBodyFillColor(floor, Utils.temperatureToColor(floor.temperature, MIN_TEMPERATURE, MAX_TEMPERATURE));
    world.addBody(floor);

    const staticWallsOptions = [
        { x: -225, y: -390, rotation: 0, height: STATIC_WALL_HEIGHT * 1.55 },
        { x: -225, y: -900, rotation: 0, height: STATIC_WALL_HEIGHT * 0.5, temperature: MAX_TEMPERATURE },
        { x: -145, y: 110, rotation: -0.5, height: STATIC_WALL_HEIGHT / 1.5 },
        { x: 60, y: 350, rotation: -0.95, height: STATIC_WALL_HEIGHT / 1.5 },
        { x: 350, y: 475, rotation: -1.4, height: STATIC_WALL_HEIGHT / 1.5 },
        { x: 675, y: 465, rotation: -1.8, height: STATIC_WALL_HEIGHT / 1.5 },
        { x: 930, y: 310, rotation: -2.5, height: STATIC_WALL_HEIGHT / 1.5 },
        { x: 1035, y: 25, rotation: -0, height: STATIC_WALL_HEIGHT / 1.5 },
        { x: 960, y: -275, rotation: -0.5, height: STATIC_WALL_HEIGHT / 1.5 },
        { x: 770, y: -525, rotation: -0.8, height: STATIC_WALL_HEIGHT / 1.5 },
        { x: 450, y: -720, rotation: -1.2, height: STATIC_WALL_HEIGHT / 1.1 },
        { x: 250, y: -250, rotation: 0, height: STATIC_WALL_HEIGHT * 1.5 },
        { x: 250, y: -900, rotation: 0, height: STATIC_WALL_HEIGHT * 0.5, temperature: MAX_TEMPERATURE },
    ];

    const WALL_COLOR = 'rgb(90, 45, 20)';

    for (const option of staticWallsOptions) {
        const wall = createStaticWall(
            world,
            app,
            option.x,
            option.y,
            option.rotation,
            option.height,
            option.temperature,
        );
        app.setBodyFillColor(wall, WALL_COLOR);
    }

    const numOfParticles = 2_500;
    const particleRadius = 5;
    const BASE_Y = floor.position.y + floorHeight / 2 + particleRadius;
    const MIN_X = floor.position.x - floorWidth / 2 + particleRadius + STATIC_WALL_WIDTH;
    const MAX_X = floor.position.x + floorWidth / 2 + particleRadius - STATIC_WALL_WIDTH;

    for (let i = 0; i < numOfParticles; i++) {
        const particle = BodiesFactory.circle({
            radius: particleRadius,
            x: Utils.randomNumber(MIN_X, MAX_X),
            y: Utils.randomNumber(BASE_Y, BASE_Y + 800),
            mass: PARTICLE_MASS,
            temperature: MIN_TEMPERATURE,
        });

        app.setBodyFillColor(
            particle,
            Utils.temperatureToColor(particle.temperature, MIN_TEMPERATURE, MAX_TEMPERATURE),
        );
        particle.onContact = info => {
            const bodyA = info.bodyA;
            const bodyB = info.bodyB;
            exchangeHeat(bodyA, bodyB, SETTINGS.dt, HEATING_FACTOR, MIN_TEMPERATURE, MAX_TEMPERATURE);
        };

        world.addBody(particle);
    }

    app.setConvectionForce(true);
}

const convectionDemo = defineDemo('Convection force', setupConvectionForce);

export default convectionDemo;
