import { BodiesFactory, SETTINGS, Utils } from '../../src';
import type { World } from '../../src';
import type Application from '../Application';
import Graphics from '../graphics/Graphics';
import { defineDemo } from './shared';

function setupDrag(world: World, app: Application): void {
    app.setBackground('darkBackground');
    SETTINGS.applyGravity = false;
    Graphics.zoom = 0.75;

    const numColumns = 4;
    const poolRadius = 30;
    const spacing = 10;
    const offsetX = 150;

    for (let col = 0; col <= numColumns; col++) {
        const poolsInColumn = col;

        for (let row = 0; row <= poolsInColumn; row++) {
            const x = offsetX + poolRadius * 2 * col + spacing * col;
            const y = poolRadius * 2 * row + spacing * row - col * poolRadius;
            const pool = BodiesFactory.circle({ radius: poolRadius, x, y: -y, mass: 1, restitution: 0.9 });
            app.setBodyFillColor(pool, Utils.randomColor());
            world.addBody(pool);
        }
    }

    const movingPool = BodiesFactory.circle({ radius: poolRadius, x: -offsetX * 2, y: Utils.randomNumber(-50, 50), mass: 2.5, restitution: 0.9 });
    movingPool.velocity.x = 5_000;
    movingPool.angularVelocity = Utils.randomNumber(-10, 10);
    app.setBodyFillColor(movingPool, 'white');
    world.addBody(movingPool);

    app.setDragForce(0.0030);
}

const dragDemo = defineDemo('Drag demo', setupDrag);

export default dragDemo;
