import CameraController from '/core/ui/camera/camera-controller.js';
import { InterfaceMode, InterfaceModeChangedEventName } from '/core/ui/interface-modes/interface-modes.js';
import { utils } from '/core/ui/graph-layout/utils.js';
import ViewManager from '/core/ui/views/view-manager.js';

const zoomRate = 0.3;

const CC = { proto: Object.getPrototypeOf(CameraController) };

CameraController.bzCurrentFoV = CameraController.bzDefaultFoV = 35;
CameraController.bzMinFoV = 15;
CameraController.bzMaxFoV = 60;

CC.cameraZoomIn = CC.proto.cameraZoomIn;
CC.proto.cameraZoomIn = function(status, x) {
  if (!ViewManager.isWorldInputAllowed || this.zoomInProgress == 2 /* Out */) {
    return;
  }
  this.zoomInProgress = 1 /* In */;
  let zoomValue = x;
  if ((status == InputActionStatuses.START || status == InputActionStatuses.UPDATE) && zoomValue == 0) {
    zoomValue = 1;
  }
  const cameraState = Camera.getState();
  if (cameraState.zoomLevel == 0) {
    Camera.setVerticalFoV(this.bzCurrentFoV = this.bzMinFoV);
    Camera.setTilt(61, 1);
  } else if (this.bzCurrentFoV != this.bzDefaultFoV) {
    Camera.setVerticalFoV(this.bzCurrentFoV = this.bzDefaultFoV);
    Camera.setTilt(0, 0);
    requestAnimationFrame(() => Camera.zoom(1));
  } else {
    const amount = Math.max(cameraState.zoomLevel - zoomRate * zoomValue, 0);
    Camera.zoom(amount);
  }
  if (status == InputActionStatuses.FINISH) {
    this.zoomInProgress = 0 /* None */;
  }
}

CC.cameraZoomOut = CC.proto.cameraZoomOut;
CC.proto.cameraZoomOut = function(status, x) {
  if (!ViewManager.isWorldInputAllowed || this.zoomInProgress == 1 /* In */) {
    return;
  }
  this.zoomInProgress = 2 /* Out */;
  let zoomValue = x;
  if ((status == InputActionStatuses.START || status == InputActionStatuses.UPDATE) && zoomValue == 0) {
    zoomValue = 1;
  }
  const cameraState = Camera.getState();
  if (cameraState.zoomLevel == 1) {
    Camera.setVerticalFoV(this.bzCurrentFoV = this.bzMaxFoV);
    Camera.setTilt(36, 1);
  } else if (this.bzCurrentFoV != this.bzDefaultFoV) {
    Camera.setVerticalFoV(this.bzCurrentFoV = this.bzDefaultFoV);
    Camera.setTilt(0, 0);
    requestAnimationFrame(() => Camera.zoom(0));
  } else {
    const amount = Math.min(cameraState.zoomLevel + zoomRate * zoomValue, 1);
    Camera.zoom(amount);
  }
  if (status == InputActionStatuses.FINISH) {
    this.zoomInProgress = 0 /* None */;
  }
}

// TRIX: wait for camera to settle and then repeat city zoom
function rezoom() {
  const mode = InterfaceMode.getCurrent();
  const handler = InterfaceMode.getInterfaceModeHandler(mode);
  const cityID = handler.cityID ?? handler.Context.CityID;
  const city = Cities.get(cityID);
  const region = { min: { x: 0.275, y: 0.025 }, max: { x: 0.975, y: 0.975 } };
  let focus = Camera.calculateCameraFocusAndZoom(city.getPurchasedPlots(), 30, { region });
  if (focus) {
    const setFocus = () => {
      const lastFocus = focus;
      focus = Camera.calculateCameraFocusAndZoom(city.getPurchasedPlots(), 30, { region });
      if (Math.round(150 * focus.z) == Math.round(150 * lastFocus.z)) {
        const cameraFrame = {
          duration: 1,
          tilt: 30,
          focus: { x: focus.x, y: focus.y },
          zoom: utils.clamp(focus.z, 0.3, 1),
          func: InterpolationFunc.EaseOutSin,
          writeMask: KeyframeFlag.FLAG_ALL,
          // overwrite all affected camera state
          end: true
          // return to player control once done
        };
        Camera.addKeyframe(cameraFrame);
      } else {
        delayByFrame(setFocus, 1);
      }
    }
    delayByFrame(setFocus, 2);
  } else {
    Camera.lookAtPlot(city.location, { zoom: 1, tilt: 30 });
  }
}
CC.onInterfaceModeChanged = function(event) {
  const modes = ["INTERFACEMODE_ACQUIRE_TILE", "INTERFACEMODE_PLACE_BUILDING"];
  if (modes.includes(event?.detail?.newMode) && this.bzCurrentFoV != this.bzDefaultFoV) {
    Camera.clearAnimation();
    Camera.setVerticalFoV(this.bzCurrentFoV = this.bzDefaultFoV);
    Camera.setTilt(0, 0);
    rezoom();
  }
}
window.addEventListener(
  InterfaceModeChangedEventName,
  CC.onInterfaceModeChanged.bind(CameraController)
);

// vim: sw=2
