import thousandBoxesDemo from './1000Boxes';
import thousandCapsulesDemo from './1000Capsules';
import thousandCirclesDemo from './1000Circles';
import randomConvexShapesDemo from './1000RandomConvexShapes';
import blackHoleOrbitDemo from './BlackHoleOrbit';
import breakableJointsDemo from './BreakableJoints';
import buoyancyDemo from './BuoyancyForce';
import clothSimulationDemo from './ClothSimulation';
import collisionFilteringDemo from './ColllisionFiltering';
import complexSceneDemo from './ComplexScene';
import continuousCollisionDetectionDemo from './ContinuousCollisionDetection';
import convectionDemo from './ConvectionForce';
import dragDemo from './Drag';
import electroStaticDemo from './ElectrostaticForce';
import planetOrbitDemo from './PlanetOrbit';
import plankDemo from './Plank';
import pyramidOfBoxesDemo from './PyramidOfBoxes';
import simpleWhipDemo from './SimpleWhip';
import singleBoxDemo from './SingleBox';
import skeletonRagdollDemo from './SkeletonRagdoll';
import stackOfBoxesDemo from './StackOfBoxes';
import stressTestDemo from './StressTest';
import suspensionBridgeDemo from './SuspensionBridge';
import weldedBoxesDemo from './WeldedBoxes';
import type { DemoRunner } from './shared';

export const DEMOS: DemoRunner[] = [
    complexSceneDemo,
    singleBoxDemo,
    stackOfBoxesDemo,
    pyramidOfBoxesDemo,
    suspensionBridgeDemo,
    simpleWhipDemo,
    skeletonRagdollDemo,
    plankDemo,
    clothSimulationDemo,
    stressTestDemo,
    continuousCollisionDetectionDemo,
    thousandCirclesDemo,
    thousandBoxesDemo,
    thousandCapsulesDemo,
    randomConvexShapesDemo,
    weldedBoxesDemo,
    breakableJointsDemo,
    collisionFilteringDemo,
    dragDemo,
    blackHoleOrbitDemo,
    planetOrbitDemo,
    electroStaticDemo,
    convectionDemo,
    buoyancyDemo,
];

export const DEMO_LABELS = DEMOS.map((demo, index) => `Demo ${index}: ${demo.label}`);
