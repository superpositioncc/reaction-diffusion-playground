//==============================================================
//  EFFECTS PANE
//  - Tweakpane controls for visual effects like style map,
//    flow, and more.
//==============================================================

import * as THREE from "three";
import Tweakpane from "tweakpane";

import parameterValues from "../parameterValues";
import { simulationUniforms } from "../uniforms";
import parameterMetadata from "../parameterMetadata";
import { rebuildRightPane, currentSeedType } from "./right-pane";
import { displayUniforms } from "../uniforms";
import { resetTextureSizes } from "../../entry";
import globals from "../globals";

let settingsPane,
  effectsPane,
  paneContainer,
  styleMapChooser,
  styleMapPreviewImageContainer,
  styleMapPreviewImage;

// Settings State
let settingsState = {
  name: "My settings",
  selected: "",
};

function getSavedSettings() {
  try {
    const s = localStorage.getItem("rd-playground-settings");
    return s ? JSON.parse(s) : {};
  } catch (e) {
    console.error("Error reading settings", e);
    return {};
  }
}

function saveSettings() {
  const name = settingsState.name;
  if (!name) {
    alert("Please enter a name for the settings.");
    return;
  }

  const settings = getSavedSettings();

  // Create a deep copy of parameterValues
  const parameterValuesCopy = JSON.parse(JSON.stringify(parameterValues));
  
  // Remove large image data to prevent localStorage quota exceeded errors
  if (parameterValuesCopy.styleMap) {
    parameterValuesCopy.styleMap.imageData = null;
    parameterValuesCopy.styleMap.imageLoaded = false;
  }

  settings[name] = {
    version: 1,
    parameterValues: parameterValuesCopy,
    actions: {
      totalRecordingFrames: globals.totalRecordingFrames,
      recordingPrefix: globals.recordingPrefix,
      restartBeforeRecording: globals.restartBeforeRecording,
    },
  };

  try {
    localStorage.setItem("rd-playground-settings", JSON.stringify(settings));
    settingsState.selected = name;
    rebuildLeftPane();
    alert(`Settings "${name}" saved.`);
  } catch (e) {
    alert(
      "Failed to save settings. The data might be too large (e.g. images)."
    );
    console.error(e);
  }
}

function loadSettings() {
  const name = settingsState.selected;
  if (!name) return;

  const settings = getSavedSettings();
  const loaded = settings[name];

  if (loaded) {
    let paramsToLoad = loaded;
    if (loaded.version && loaded.parameterValues) {
      paramsToLoad = loaded.parameterValues;

      if (loaded.actions) {
        globals.totalRecordingFrames = loaded.actions.totalRecordingFrames;
        globals.recordingPrefix = loaded.actions.recordingPrefix;
        globals.restartBeforeRecording = loaded.actions.restartBeforeRecording;
      }
    }

    function deepCopy(target, source) {
      for (const key in source) {
        if (
          source[key] &&
          typeof source[key] === "object" &&
          !Array.isArray(source[key])
        ) {
          if (!target[key]) target[key] = {};
          deepCopy(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }

    deepCopy(parameterValues, paramsToLoad);

    // currentSeedType = parseInt(parameterValues.seed.type);

    // Update Simulation Uniforms
    simulationUniforms.f.value = parameterValues.f;
    simulationUniforms.k.value = parameterValues.k;
    simulationUniforms.dA.value = parameterValues.dA;
    simulationUniforms.dB.value = parameterValues.dB;
    simulationUniforms.timestep.value = parameterValues.timestep;
    simulationUniforms.bias.value.set(
      parameterValues.bias.x,
      parameterValues.bias.y
    );

    simulationUniforms.styleMapParameters.value.set(
      parameterValues.f,
      parameterValues.k,
      parameterValues.dA,
      parameterValues.dB
    );

    simulationUniforms.styleMapTransforms.value.set(
      parameterValues.styleMap.scale,
      parameterValues.styleMap.rotation,
      parameterValues.styleMap.translate.x,
      parameterValues.styleMap.translate.y
    );

    if (
      parameterValues.styleMap.imageLoaded &&
      parameterValues.styleMap.imageData
    ) {
      const loader = new THREE.TextureLoader();
      simulationUniforms.styleMapTexture.value = loader.load(
        parameterValues.styleMap.imageData
      );

      const img = new Image();
      img.onload = function () {
        simulationUniforms.styleMapResolution.value = new THREE.Vector2(
          parseFloat(img.width),
          parseFloat(img.height)
        );
      };
      img.src = parameterValues.styleMap.imageData;

      if (styleMapPreviewImageContainer && styleMapPreviewImage) {
        styleMapPreviewImageContainer.style.display = "block";
        styleMapPreviewImage.setAttribute(
          "src",
          parameterValues.styleMap.imageData
        );
      }
    } else if (!parameterValues.styleMap.imageLoaded) {
      simulationUniforms.styleMapTexture.value = undefined;
      if (styleMapPreviewImageContainer) {
        styleMapPreviewImageContainer.style.display = "none";
      }
      if (styleMapChooser) {
        styleMapChooser.value = null;
      }
    }

    // Update Display Uniforms
    displayUniforms.renderingStyle.value =
      parseInt(parameterValues.renderingStyle) || 0;

    displayUniforms.hslFrom.value.set(
      parameterValues.hsl.from.min,
      parameterValues.hsl.from.max
    );
    displayUniforms.hslTo.value.set(
      parameterValues.hsl.to.min,
      parameterValues.hsl.to.max
    );
    displayUniforms.hslSaturation.value = parameterValues.hsl.saturation;
    displayUniforms.hslLuminosity.value = parameterValues.hsl.luminosity;

    function updateColorStop(uniformName, colorName, stopName) {
      displayUniforms[uniformName].value.set(
        parameterValues.gradientColors[colorName].r / 255,
        parameterValues.gradientColors[colorName].g / 255,
        parameterValues.gradientColors[colorName].b / 255,
        parameterValues.gradientColors[stopName]
      );
    }

    updateColorStop("colorStop1", "color1RGB", "color1Stop");
    updateColorStop("colorStop2", "color2RGB", "color2Stop");
    updateColorStop("colorStop3", "color3RGB", "color3Stop");
    updateColorStop("colorStop4", "color4RGB", "color4Stop");
    updateColorStop("colorStop5", "color5RGB", "color5Stop");

    rebuildRightPane();
    rebuildLeftPane();

    if (
      parameterValues.canvas.width !== window.innerWidth ||
      parameterValues.canvas.height !== window.innerHeight
    ) {
      resetTextureSizes();
    }
  }
}

function deleteSettings() {
  const name = settingsState.selected;
  if (!name) return;

  if (confirm(`Are you sure you want to delete "${name}"?`)) {
    const settings = getSavedSettings();
    delete settings[name];
    localStorage.setItem("rd-playground-settings", JSON.stringify(settings));
    settingsState.selected = "";
    rebuildLeftPane();
  }
}

function setupSaveLoadSettings() {
  // Use settingsPane directly
  settingsPane.addInput(settingsState, "name", { label: "Name" });
  settingsPane.addButton({ title: "Save settings" }).on("click", saveSettings);

  const settings = getSavedSettings();
  const options = {};
  options["Select..."] = "";
  Object.keys(settings).forEach((k) => (options[k] = k));

  settingsPane
    .addInput(settingsState, "selected", {
      label: "Load",
      options: options,
    })
    .on("change", (value) => {
      if (value) loadSettings();
    });

  settingsPane
    .addButton({ title: "Delete Selected" })
    .on("click", deleteSettings);
}

export function setupLeftPane() {
  if (styleMapChooser === undefined || styleMapChooser === null) {
    styleMapChooser = document.getElementById("style-map-chooser");

    styleMapChooser.addEventListener("change", (e) => {
      if (e.target.files.length === 0) {
        return;
      }

      let reader = new FileReader();
      reader.onload = function () {
        // Create the DOM elements needed for the floating thumbnail, if they aren't already set up
        if (styleMapPreviewImageContainer === undefined) {
          styleMapPreviewImageContainer = document.createElement("div");
          styleMapPreviewImageContainer.setAttribute(
            "id",
            "style-map-preview-image-container"
          );

          styleMapPreviewImage = document.createElement("img");
          styleMapPreviewImageContainer.appendChild(styleMapPreviewImage);

          document.body.appendChild(styleMapPreviewImageContainer);

          // If the container has been set up previously, that means the user has probably loaded a new image, so we just need to make sure the container is visible.
        } else {
          styleMapPreviewImageContainer.style.display = "block";
        }

        // Load the image and pass it to the simulation shader as a texture uniform
        const loader = new THREE.TextureLoader();
        simulationUniforms.styleMapTexture.value = loader.load(reader.result);

        // Also pass the width and height of the image into the shader as uniforms
        const img = new Image();
        img.onload = function () {
          simulationUniforms.styleMapResolution.value = new THREE.Vector2(
            parseFloat(img.width),
            parseFloat(img.height)
          );
        };
        img.src = reader.result;

        // Visually display the image as a thumbnail next to the UI
        styleMapPreviewImage.setAttribute("src", reader.result);

        parameterValues.styleMap.imageData = reader.result;
        parameterValues.styleMap.imageLoaded = true;
        rebuildLeftPane();
      };

      reader.readAsDataURL(e.target.files[0]);
    });
  }

  if (paneContainer === undefined) {
    paneContainer = document.createElement("div");
    paneContainer.setAttribute("id", "left-pane-container");
    document.body.appendChild(paneContainer);
  }

  // Clear container
  paneContainer.innerHTML = "";

  const settingsContainer = document.createElement("div");
  settingsContainer.style.marginBottom = "5px";
  paneContainer.appendChild(settingsContainer);

  const effectsContainer = document.createElement("div");
  paneContainer.appendChild(effectsContainer);

  settingsPane = new Tweakpane({
    title: "Settings",
    container: settingsContainer,
  });

  effectsPane = new Tweakpane({
    title: "Effects",
    container: effectsContainer,
  });

  setupSaveLoadSettings();
  setupStyleMapFolder();
  setupBiasFolder();

  // TODO: setupFlowFolder();
  // TODO: setupScaleFolder();
}

export function rebuildLeftPane() {
  if (settingsPane) settingsPane.dispose();
  if (effectsPane) effectsPane.dispose();
  setupLeftPane();
}

export function refreshLeftPane() {
  if (settingsPane) settingsPane.refresh();
  if (effectsPane) effectsPane.refresh();
}

export function hideLeftPane() {
  if (paneContainer) paneContainer.style.display = "none";
}

export function showLeftPane() {
  if (paneContainer) paneContainer.style.display = "block";
}

//===========================================================
//  STYLE MAP
//===========================================================
function setupStyleMapFolder() {
  const styleMapFolder = effectsPane.addFolder({ title: "Style map" });

  // If an image has been loaded ...
  if (parameterValues.styleMap.imageLoaded) {
    // Scale range slider
    styleMapFolder
      .addInput(parameterValues.styleMap, "scale", {
        label: "Scale",
        min: 0.1,
        max: 3.0,
        step: 0.01,
      })
      .on("change", () => {
        simulationUniforms.styleMapTransforms.value.x =
          parameterValues.styleMap.scale;

        styleMapPreviewImage.style.transform =
          "scale(" +
          parameterValues.styleMap.scale +
          ") " +
          "rotate(" +
          parameterValues.styleMap.rotation +
          "deg) ";
      });

    // Rotation range slider
    styleMapFolder
      .addInput(parameterValues.styleMap, "rotation", {
        label: "Rotation",
        min: -180.0,
        max: 180.0,
        step: 0.001,
      })
      .on("change", () => {
        simulationUniforms.styleMapTransforms.value.y =
          (parameterValues.styleMap.rotation * 3.14159265359) / 180;

        styleMapPreviewImage.style.transform =
          "scale(" +
          parameterValues.styleMap.scale +
          ") " +
          "rotate(" +
          parameterValues.styleMap.rotation +
          "deg) ";
      });

    // X/Y offset 2D slider
    styleMapFolder
      .addInput(parameterValues.styleMap, "translate", {
        label: "Offset",
        x: {
          min: -parameterValues.canvas.width / 2,
          max: parameterValues.canvas.width / 2,
          step: 0.01,
        },
        y: {
          min: -parameterValues.canvas.height / 2,
          max: parameterValues.canvas.height / 2,
          step: 0.01,
        },
      })
      .on("change", (value) => {
        // X component
        simulationUniforms.styleMapTransforms.value.z = value.x;
        styleMapPreviewImage.style.marginLeft = value.x + "px";

        // Y component
        simulationUniforms.styleMapTransforms.value.w = value.y;
        styleMapPreviewImage.style.marginTop = value.y + "px";
      });

    styleMapFolder.addSeparator();

    // f/k/dA/dB PARAMETERS ----------------------------------------------------------------------
    styleMapFolder
      .addInput(parameterValues.styleMap, "f", {
        label: "Feed (#2)",
        min: parameterMetadata.f.min,
        max: parameterMetadata.f.max,
        initial: parameterValues.f.value,
        step: 0.0001,
      })
      .on("change", (value) => {
        simulationUniforms.styleMapParameters.value.x = value;
      });

    styleMapFolder
      .addInput(parameterValues.styleMap, "k", {
        label: "Kill (#2)",
        min: parameterMetadata.k.min,
        max: parameterMetadata.k.max,
        initial: parameterValues.k.value,
        step: 0.0001,
      })
      .on("change", (value) => {
        simulationUniforms.styleMapParameters.value.y = value;
      });

    styleMapFolder
      .addInput(parameterValues.styleMap, "dA", {
        label: "dA (#2)",
        min: parameterMetadata.dA.min,
        max: parameterMetadata.dA.max,
        initial: parameterValues.dA.value,
        step: 0.0001,
      })
      .on("change", (value) => {
        simulationUniforms.styleMapParameters.value.z = value;
      });

    styleMapFolder
      .addInput(parameterValues.styleMap, "dB", {
        label: "dB (#2)",
        min: parameterMetadata.dB.min,
        max: parameterMetadata.dB.max,
        initial: parameterValues.dB.value,
        step: 0.0001,
      })
      .on("change", (value) => {
        simulationUniforms.styleMapParameters.value.w = value;
      });

    styleMapFolder.addSeparator();

    /*
    // ANIMATION ----------------------------------------------------------------------
    // Animate checkbox
    styleMapFolder.addInput(parameterValues.styleMap.animation, 'enabled', { label: 'Animate' })
      .on('change', () => {
        rebuildLeftPane();
      });

    // If animation has been enabled ...
    if(parameterValues.styleMap.animation.enabled) {
      // Parameter dropdown
      styleMapFolder.addInput(parameterValues.styleMap.animation, 'parameter', {
        label: 'Parameter',
        options: {
          'Scale': 0,
          'Rotation': 1,
          'X offset': 2,
          'Y offset': 3,
        }
      });

      // Easing equation dropdown
      styleMapFolder.addInput(parameterValues.styleMap.animation, 'easingEquation', {
        label: 'Easing',
        options: {
          'Linear': 0
        }
      });

      // Speed range slider
      styleMapFolder.addInput(parameterValues.styleMap.animation, 'speed', {
        label: 'Speed',
        min: 0.1,
        max: 5.0,
        step: .1
      });
    }

      styleMapFolder.addSeparator();
    */
  }

  // Unload style map button (only when a style map has been loaded)
  if (parameterValues.styleMap.imageLoaded) {
    styleMapFolder
      .addButton({
        title: "Unload style map image",
      })
      .on("click", () => {
        styleMapPreviewImageContainer.style.display = "none";
        simulationUniforms.styleMapTexture.value = undefined;
        simulationUniforms.styleMapResolution.value = new THREE.Vector2(-1, -1);
        parameterValues.styleMap.imageLoaded = false;

        styleMapChooser.value = null;
        rebuildLeftPane();
      });
  }

  // Load style map image button
  styleMapFolder
    .addButton({
      title: "Load style map image",
    })
    .on("click", () => {
      styleMapChooser.click();
    });
}

//===========================================================
//  Bias (orientation)
//===========================================================
function setupBiasFolder() {
  const biasFolder = effectsPane.addFolder({ title: "Bias" });

  // X/Y bias direction 2D pad
  biasFolder
    .addInput(parameterValues, "bias", {
      label: "Direction",
      x: {
        min: -parameterMetadata.bias.x.max,
        max: parameterMetadata.bias.x.max,
        step: 0.001,
      },
      y: {
        min: -parameterMetadata.bias.y.max,
        max: parameterMetadata.bias.y.max,
        step: 0.001,
      },
    })
    .on("change", (value) => {
      simulationUniforms.bias.value.x = value.x;
      simulationUniforms.bias.value.y = value.y;
    });
}
