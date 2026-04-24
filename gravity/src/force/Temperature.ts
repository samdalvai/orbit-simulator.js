import { Utils } from '..';
import { RigidBody } from '../core/RigidBody';
import { Vec2 } from '../math/Vec2';

export function generateConvectionForce(
    body: RigidBody,
    ambientTemperature: number,
    strength: number,
    minTemperatureDifference = 0,
): Vec2 {
    if (body.isStatic()) {
        return new Vec2(0, 0);
    }

    const deltaT = body.temperature - ambientTemperature;
    if (deltaT <= minTemperatureDifference) {
        return new Vec2(0, 0);
    }

    return new Vec2(0, strength * (deltaT - minTemperatureDifference));
}

export function exchangeHeat(a: RigidBody, b: RigidBody, dt: number, k = 0.5, minTemp = 0, maxTemp = 1000) {
    const deltaT = a.temperature - b.temperature;
    if (deltaT === 0) return;

    const heat = k * deltaT * dt;

    if (!a.isStatic()) {
        a.temperature -= heat / a.mass;
    }

    if (!b.isStatic()) {
        b.temperature += heat / b.mass;
    }

    a.temperature = Utils.clamp(a.temperature, minTemp, maxTemp);
    b.temperature = Utils.clamp(b.temperature, minTemp, maxTemp);
}

export function dissipateHeat(body: RigidBody, ambientTemperature: number, dt: number, cooling = 0.001) {
    if (body.isStatic()) return;

    const deltaT = body.temperature - ambientTemperature;
    if (deltaT === 0) return;

    const perimeter = body.shape.getPerimeter();
    const heatLoss = cooling * perimeter * deltaT * dt;

    body.temperature = Math.max(ambientTemperature, body.temperature - heatLoss / body.mass);
}
