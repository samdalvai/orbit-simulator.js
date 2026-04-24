import * as buoyancy from './Buoyancy';
import * as gravity from './Gravity';
import * as interactions from './Interactions';
import * as quadTree from './QuadTree';
import * as resistance from './Resistance';
import * as spring from './Spring';
import * as temperature from './Temperature';

export const Force = {
    /** Buoyancy, submerged-area, and water-drag helpers. */
    buoyancy,
    /** Weight and body-to-body gravitational force helpers. */
    gravity,
    /** Electrostatic and explosion interaction forces. */
    interactions,
    /** Spatial partitioning utilities used by Barnes-Hut force solvers. */
    quadTree,
    /** Linear and angular drag helpers for motion through a medium. */
    resistance,
    /** Spring force and damping helpers. */
    spring,
    /** Heat dissipation and convection force helpers. */
    temperature,
};
