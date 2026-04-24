import { BodiesFactory, Vec2 } from '../../src';
import type { World } from '../../src';
import type Application from '../Application';
import {
    JOINT_TUNING,
    createDistanceJoint,
    defineDemo,
    generateFences,
    generateFloor,
} from './shared';

function setupSimpleWhip(world: World, app: Application): void {
    app.setBackground('background');
    generateFloor(world, app);
    generateFences(world, app);

    const whipAnchor = BodiesFactory.box({ width: 60, height: 25, x: 0, y: 350, mass: 0 });
    app.setBodyTexture(whipAnchor, 'rockBridgeAnchor');
    world.addBody(whipAnchor);

    let last = whipAnchor;
    const whipElementHeight = 50;
    const tuning = JOINT_TUNING.whip;
    const distance = -1;

    for (let i = 0; i < 10; i++) {
        const x = whipAnchor.position.x;
        const y =
            i === 0
                ? whipAnchor.position.y - whipElementHeight
                : whipAnchor.position.y - (whipElementHeight + 60 * i);
        const whipElement = BodiesFactory.box({ width: 10, height: 50, x, y, mass: 1 });
        app.setBodyTexture(whipElement, 'crate');
        world.addBody(whipElement);

        world.addJoint(
            createDistanceJoint(
                last,
                whipElement,
                tuning,
                last.position.subNew(new Vec2(0, whipElementHeight / 2)),
                whipElement.position.addNew(new Vec2(0, whipElementHeight / 2)),
                distance,
            ),
        );

        last = whipElement;
    }
}

const simpleWhipDemo = defineDemo('A simple whip', setupSimpleWhip);

export default simpleWhipDemo;
