/* eslint-disable jsx-a11y/heading-has-content */
import { useEffect, useRef } from "react";
import {
  RenderingEngine,
  Enums,
  setVolumesForViewports,
  volumeLoader,
  getRenderingEngine,
  eventTarget,
} from "@cornerstonejs/core";
import * as cornerstoneTools from "@cornerstonejs/tools";
import {
  cornerstoneNiftiImageVolumeLoader,
  Enums as NiftiEnums,
} from "./nifti-volume-loader";
import {
  initDemo,
  setCtTransferFunctionForVolumeActor,
  addDropdownToToolbar,
  addManipulationBindings,
  addToggleButtonToToolbar,
} from "./utils/demo/helpers";

function App() {
  const contentRef = useRef(null),
    toolbarRef = useRef(null);

  useEffect(() => {
    if (!contentRef.current || !toolbarRef.current) {
      return;
    }

    const {
      ToolGroupManager,
      Enums: csToolsEnums,
      CrosshairsTool,
      synchronizers,
    } = cornerstoneTools;

    const { createSlabThicknessSynchronizer } = synchronizers;

    const { MouseBindings } = csToolsEnums;
    const { ViewportType } = Enums;

    // Define a unique id for the volume
    const toolGroupId = "MY_TOOLGROUP_ID";
    const viewportId1 = "CT_AXIAL";
    const viewportId2 = "CT_SAGITTAL";
    const viewportId3 = "CT_CORONAL";
    const viewportIds = [viewportId1, viewportId2, viewportId3];
    const renderingEngineId = "myRenderingEngine";
    const synchronizerId = "SLAB_THICKNESS_SYNCHRONIZER_ID";

    const size = "500px";
    const content = contentRef.current;
    const viewportGrid = document.createElement("div");

    viewportGrid.style.display = "flex";
    viewportGrid.style.display = "flex";
    viewportGrid.style.flexDirection = "row";

    const element1 = document.createElement("div");
    const element2 = document.createElement("div");
    const element3 = document.createElement("div");
    element1.style.width = size;
    element1.style.height = size;
    element2.style.width = size;
    element2.style.height = size;
    element3.style.width = size;
    element3.style.height = size;

    // Disable right click context menu so we can have right click tools
    element1.oncontextmenu = (e) => e.preventDefault();
    element2.oncontextmenu = (e) => e.preventDefault();
    element3.oncontextmenu = (e) => e.preventDefault();

    viewportGrid.appendChild(element1);
    viewportGrid.appendChild(element2);
    viewportGrid.appendChild(element3);

    content.appendChild(viewportGrid);

    const pr = document.createElement("p");
    pr.innerText = "Nifti Loading Progress:";

    const progress = document.createElement("progress");
    progress.value = 0;
    progress.max = 100;

    content.appendChild(pr);
    content.appendChild(progress);

    const updateProgress = (evt) => {
      const { data } = evt.detail;

      if (!data) {
        return;
      }

      const { total, loaded } = data;

      if (!total) {
        return;
      }

      const progress = Math.round((loaded / total) * 100);

      const element = document.querySelector("progress");
      element.value = progress;
    };

    eventTarget.addEventListener(
      NiftiEnums.Events.NIFTI_VOLUME_PROGRESS,
      updateProgress
    );

    const viewportColors = {
      [viewportId1]: "rgb(200, 0, 0)",
      [viewportId2]: "rgb(200, 200, 0)",
      [viewportId3]: "rgb(0, 200, 0)",
    };

    let synchronizer;

    const viewportReferenceLineControllable = [
      viewportId1,
      viewportId2,
      viewportId3,
    ];

    const viewportReferenceLineDraggableRotatable = [
      viewportId1,
      viewportId2,
      viewportId3,
    ];

    const viewportReferenceLineSlabThicknessControlsOn = [
      viewportId1,
      viewportId2,
      viewportId3,
    ];

    function getReferenceLineColor(viewportId) {
      return viewportColors[viewportId];
    }

    function getReferenceLineControllable(viewportId) {
      const index = viewportReferenceLineControllable.indexOf(viewportId);
      return index !== -1;
    }

    function getReferenceLineDraggableRotatable(viewportId) {
      const index = viewportReferenceLineDraggableRotatable.indexOf(viewportId);
      return index !== -1;
    }

    function getReferenceLineSlabThicknessControlsOn(viewportId) {
      const index =
        viewportReferenceLineSlabThicknessControlsOn.indexOf(viewportId);
      return index !== -1;
    }

    const blendModeOptions = {
      MIP: "Maximum Intensity Projection",
      MINIP: "Minimum Intensity Projection",
      AIP: "Average Intensity Projection",
    };


    addDropdownToToolbar({
      id: 'MIP_Projections',
      options: {
        values: [
          "Maximum Intensity Projection",
          "Minimum Intensity Projection",
          "Average Intensity Projection",
        ],
        defaultValue: "Maximum Intensity Projection",
      },
      onSelectedValueChange: (selectedValue) => {
        let blendModeToUse;
        switch (selectedValue) {
          case blendModeOptions.MIP:
            blendModeToUse = Enums.BlendModes.MAXIMUM_INTENSITY_BLEND;
            break;
          case blendModeOptions.MINIP:
            blendModeToUse = Enums.BlendModes.MINIMUM_INTENSITY_BLEND;
            break;
          case blendModeOptions.AIP:
            blendModeToUse = Enums.BlendModes.AVERAGE_INTENSITY_BLEND;
            break;
          default:
            throw new Error("undefined orientation option");
        }

        const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);

        const crosshairsInstance = toolGroup.getToolInstance(
          CrosshairsTool.toolName
        );
        const oldConfiguration = crosshairsInstance.configuration;

        crosshairsInstance.configuration = {
          ...oldConfiguration,
          slabThicknessBlendMode: blendModeToUse,
        };

        // Update the blendMode for actors to instantly reflect the change
        toolGroup.viewportsInfo.forEach(({ viewportId, renderingEngineId }) => {
          const renderingEngine = getRenderingEngine(renderingEngineId);
          const viewport = renderingEngine.getViewport(viewportId);

          viewport.setBlendMode(blendModeToUse);
          viewport.render();
        });
      },
      container: toolbarRef.current
    });

    function setUpSynchronizers() {
      synchronizer = createSlabThicknessSynchronizer(synchronizerId);

      // Add viewports to VOI synchronizers
      [viewportId1, viewportId2, viewportId3].forEach((viewportId) => {
        synchronizer.add({
          renderingEngineId,
          viewportId,
        });
      });
      // Normally this would be left on, but here we are starting the demo in the
      // default state, which is to not have a synchronizer enabled.
      synchronizer.setEnabled(false);
    }

    /**
     * Runs the demo
     */
    async function run() {
      // Init Cornerstone and related libraries
      await initDemo();

      // Add tools to Cornerstone3D
      cornerstoneTools.addTool(CrosshairsTool);

      volumeLoader.registerVolumeLoader(
        "nifti",
        cornerstoneNiftiImageVolumeLoader
      );

      const niftiURL =
        "http://127.0.0.1:8080/axial.nii.gz";
      const volumeId = "nifti:" + niftiURL;

      // This will load the nifti file, no need to call .load again for nifti
      await volumeLoader.createAndCacheVolume(volumeId);

      // Instantiate a rendering engine
      const renderingEngine = new RenderingEngine(renderingEngineId);

      // Create the viewports
      const viewportInputArray = [
        {
          viewportId: viewportId1,
          type: ViewportType.ORTHOGRAPHIC,
          element: element1,
          defaultOptions: {
            orientation: Enums.OrientationAxis.AXIAL,
            background: [0, 0, 0],
          },
        },
        {
          viewportId: viewportId2,
          type: ViewportType.ORTHOGRAPHIC,
          element: element2,
          defaultOptions: {
            orientation: Enums.OrientationAxis.SAGITTAL,
            background: [0, 0, 0],
          },
        },
        {
          viewportId: viewportId3,
          type: ViewportType.ORTHOGRAPHIC,
          element: element3,
          defaultOptions: {
            orientation: Enums.OrientationAxis.CORONAL,
            background: [0, 0, 0],
          },
        },
      ];

      renderingEngine.setViewports(viewportInputArray);

      // Set volumes on the viewports
      await setVolumesForViewports(
        renderingEngine,
        [
          {
            volumeId,
            callback: setCtTransferFunctionForVolumeActor,
          },
        ],
        [viewportId1, viewportId2, viewportId3]
      );

      // Define tool groups to add the segmentation display tool to
      const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
      addManipulationBindings(toolGroup);

      // For the crosshairs to operate, the viewports must currently be
      // added ahead of setting the tool active. This will be improved in the future.
      toolGroup.addViewport(viewportId1, renderingEngineId);
      toolGroup.addViewport(viewportId2, renderingEngineId);
      toolGroup.addViewport(viewportId3, renderingEngineId);

      // Manipulation Tools
      // Add Crosshairs tool and configure it to link the three viewports
      // These viewports could use different tool groups. See the PET-CT example
      // for a more complicated used case.

      const isMobile = window.matchMedia("(any-pointer:coarse)").matches;

      toolGroup.addTool(CrosshairsTool.toolName, {
        getReferenceLineColor,
        getReferenceLineControllable,
        getReferenceLineDraggableRotatable,
        getReferenceLineSlabThicknessControlsOn,
        mobile: {
          enabled: isMobile,
          opacity: 0.8,
          handleRadius: 9,
        },
      });

      toolGroup.setToolActive(CrosshairsTool.toolName, {
        bindings: [{ mouseButton: MouseBindings.Primary }],
      });

      setUpSynchronizers();

      addToggleButtonToToolbar({
        id: "syncSlabThickness",
        title: "Sync Slab Thickness",
        defaultToggle: false,
        onClick: (toggle) => {
          synchronizer.setEnabled(toggle);
        },
        container: toolbarRef.current
      });

      // Render the image
      renderingEngine.renderViewports(viewportIds);
    }

    run();

    return () => {};
  }, [contentRef, toolbarRef]);

  return (
    <div>
      <div id="toolbar" ref={toolbarRef}></div>
      <div id="content" ref={contentRef}></div>
    </div>
  );
}

export default App;
