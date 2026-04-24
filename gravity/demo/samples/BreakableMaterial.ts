import type { World } from '../../src';
import type Application from '../Application';
import { defineDemo, generateFences, generateFloor } from './shared';

function setupBreakableMaterial(world: World, app: Application): void {
    app.setBackground('background');
    generateFloor(world, app);
    generateFences(world, app);

    
}

const breakableMaterial = defineDemo('Breakable material', setupBreakableMaterial);

export default breakableMaterial;
