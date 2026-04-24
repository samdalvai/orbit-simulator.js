import { Utils } from '../../src';
import type { World } from '../../src';
import type Application from '../Application';
import { defineDemo, generateSquareCage, populateStressDemo } from './shared';

function setup1000RandomConvexShapes(world: World, app: Application): void {
    app.setBackground('darkBackground');
    const cage = generateSquareCage(world, app);
    const palette = ['#f94144', '#f8961e', '#f9c74f', '#43aa8b', '#577590'];

    populateStressDemo(world, cage, (x, y, index) => {
        const radius = Utils.randomNumber(8, 12);
        const vertices = Math.round(Utils.randomNumber(3, 8));
        const body = Utils.randomConvexBody(x, y, radius, vertices);
        body.rotation = Utils.randomNumber(0, Math.PI * 2);
        body.shape.updateVertices(body.rotation, body.position);
        body.shape.updateAABB(body);
        app.setBodyFillColor(body, palette[index % palette.length]);
        return body;
    });
}

const randomConvexShapesDemo = defineDemo('1000 random convex shapes', setup1000RandomConvexShapes);

export default randomConvexShapesDemo;
