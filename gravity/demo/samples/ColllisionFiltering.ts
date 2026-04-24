import { BodiesFactory, CollisionCategory, World } from '../../src';
import Application from '../Application';
import { defineDemo } from './shared';

function setupColllisionFiltering(world: World, app: Application): void {
    const layer1Color = '#ff5a5f';
    const layer2Color = '#56c271';
    const layer3Color = '#5aa9ff';
    const ballAllLayersColor = blendHex(blendHex(layer1Color, layer2Color), layer3Color);
    const ballLayer1And2Color = blendHex(layer1Color, layer2Color);
    const ballLayer1Color = layer1Color;

    const barsWidth = 1000;
    const barsHeight = 25;
    const barsStartY = -250;
    const barsOffset = 200;

    const bar1 = BodiesFactory.box({
        width: barsWidth,
        height: barsHeight,
        x: 0,
        y: barsStartY,
        mass: 0,
        collisionCategory: CollisionCategory.LAYER1,
        collisionMask: CollisionCategory.ALL,
    });
    app.setBodyFillColor(bar1, layer1Color);

    const bar2 = BodiesFactory.box({
        width: barsWidth,
        height: barsHeight,
        x: 0,
        y: barsStartY + barsOffset,
        mass: 0,
        collisionCategory: CollisionCategory.LAYER2,
        collisionMask: CollisionCategory.ALL,
    });
    app.setBodyFillColor(bar2, layer2Color);

    const bar3 = BodiesFactory.box({
        width: barsWidth,
        height: barsHeight,
        x: 0,
        y: barsStartY + barsOffset * 2,
        mass: 0,
        collisionCategory: CollisionCategory.LAYER3,
        collisionMask: CollisionCategory.ALL,
    });
    app.setBodyFillColor(bar3, layer3Color);

    world.addBody(bar1);
    world.addBody(bar2);
    world.addBody(bar3);

    const ball1 = BodiesFactory.circle({
        radius: 30,
        x: -250,
        y: 1000,
        mass: 1,
        collisionCategory: CollisionCategory.DEFAULT,
        collisionMask: CollisionCategory.LAYER1 | CollisionCategory.LAYER2 | CollisionCategory.LAYER3,
    });
    app.setBodyFillColor(ball1, ballAllLayersColor);

    const ball2 = BodiesFactory.circle({
        radius: 30,
        x: 0,
        y: 1000,
        mass: 1,
        collisionCategory: CollisionCategory.DEFAULT,
        collisionMask: CollisionCategory.LAYER1 | CollisionCategory.LAYER2,
    });
    app.setBodyFillColor(ball2, ballLayer1And2Color);

    const ball3 = BodiesFactory.circle({
        radius: 30,
        x: 250,
        y: 1000,
        mass: 1,
        collisionCategory: CollisionCategory.DEFAULT,
        collisionMask: CollisionCategory.LAYER1,
    });
    app.setBodyFillColor(ball3, ballLayer1Color);

    world.addBody(ball1);
    world.addBody(ball2);
    world.addBody(ball3);
}

const collisionFilteringDemo = defineDemo('Collision filtering', setupColllisionFiltering);

export default collisionFilteringDemo;

function hexToRgb(hex: string) {
    const value = parseInt(hex.slice(1), 16);
    return {
        r: (value >> 16) & 0xff,
        g: (value >> 8) & 0xff,
        b: value & 0xff,
    };
}

function rgbToHex(r: number, g: number, b: number): string {
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function blendHex(c1: string, c2: string): string {
    const a = hexToRgb(c1);
    const b = hexToRgb(c2);

    const r = (a.r + b.r) >> 1;
    const g = (a.g + b.g) >> 1;
    const bVal = (a.b + b.b) >> 1;

    return rgbToHex(r, g, bVal);
}
