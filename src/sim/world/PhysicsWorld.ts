import { TUNING } from "../../content/tuning";
import type { Player } from "../entities";
import { Terrain } from "./Terrain";

export class PhysicsWorld {
  terrain = new Terrain();

  stepPlayer(player: Player, dt: number) {
    const g = TUNING.world.gravity;

    // gravity
    player.vel.y += g * dt;

    // air drag (plus temporary drag debuff)
    const drag = TUNING.world.airDrag + (player.dragDebuffT > 0 ? 0.08 : 0);
    player.vel.x *= (1 - drag);
    player.vel.y *= (1 - drag);

    // integrate
    player.pos.x += player.vel.x * dt;
    player.pos.y += player.vel.y * dt;

    // ground collision
    const groundY = this.terrain.groundYAt(player.pos.x);
    const bottom = player.pos.y + player.radius;

    if (bottom > groundY) {
      player.pos.y = groundY - player.radius;

      // bounce a bit
      if (player.vel.y > 0) {
        player.vel.y = -player.vel.y * TUNING.world.bounce;
      }

      // friction
      player.vel.x *= (1 - TUNING.world.groundFriction);
    }

    // debuff timers
    player.dragDebuffT = Math.max(0, player.dragDebuffT - dt);
  }
}
