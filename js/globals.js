import * as THREE from "three";

export default {
  isPaused: false,
  currentRenderTargetIndex: 0,
  pingPongSteps: 60,
  clock: new THREE.Clock(),

  // PNG sequence recording
  isRecording: false,
  currentRecordingFrame: 0,
  totalRecordingFrames: 100,
  recordingPrefix: "frame_",
  recordedFrames: [], // Store frame data for ZIP
  isCapturingFrame: false, // Prevent frame drops
  restartBeforeRecording: true, // New toggle
};
