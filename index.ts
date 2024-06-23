import { canvas, ctx } from "./renderer/canvas";
import * as cui from "./renderer/cui";

function render() {
  cui.enter();

  // cui.debugViewport();
  // cui.debugMouseState();

  const endFlow = cui.flow();

  for (let i = 0; i < 10; i++) {
    if (cui.button(`Hello ${i}`)) {
      console.log(`Hello from button ${i}`);
    }
  }

  endFlow();

  cui.exit();
  requestAnimationFrame(render);
}

render();
