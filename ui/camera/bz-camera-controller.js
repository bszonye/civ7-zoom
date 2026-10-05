import CameraController from '/core/ui/camera/camera-controller.js';
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

// vim: sw=2
