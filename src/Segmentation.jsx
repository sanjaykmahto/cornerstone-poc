/* eslint-disable jsx-a11y/heading-has-content */
import { useEffect, useRef } from "react";
import {
  RenderingEngine,
  Enums,
  setVolumesForViewports,
  volumeLoader,
} from "@cornerstonejs/core";
import * as cornerstone from "@cornerstonejs/core";
import * as cornerstoneTools from "@cornerstonejs/tools";
import {
  initDemo,
  addDropdownToToolbar,
  addSliderToToolbar,
  setCtTransferFunctionForVolumeActor,
} from "./utils/demo/helpers";
import { cornerstoneNiftiImageVolumeLoader } from "./nifti-volume-loader";

const NIFTI_URL = "Add Nifti Url Here";

function Segmentation() {
  //Creating Refs
  const contentRef = useRef(null),
    toolbarRef = useRef(null);

  useEffect(() => {
    if (!contentRef.current || !toolbarRef.current) {
      return;
    }

    //Getting Cornerstone tools
    const {
      SegmentationDisplayTool,
      ToolGroupManager,
      Enums: csToolsEnums,
      segmentation,
      RectangleScissorsTool,
      SphereScissorsTool,
      CircleScissorsTool,
      BrushTool,
      PaintFillTool,
      PanTool,
      ZoomTool,
      StackScrollTool,
      StackScrollMouseWheelTool,
      utilities: cstUtils,
    } = cornerstoneTools;

    const { MouseBindings, KeyboardBindings } = csToolsEnums;
    const { ViewportType } = Enums;
    const { segmentation: segmentationUtils } = cstUtils;

    // Define a unique id for the volume
    const niftiURL = NIFTI_URL; // NIFTI Url
    const volumeId = "nifti:" + niftiURL;
    const segmentationId = "MY_SEGMENTATION_ID";
    const toolGroupId = "MY_TOOLGROUP_ID";
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

    const instructions = document.createElement("p");
    instructions.innerText = `
  Left Click: Use selected Segmentation Tool.
  Middle Click: Pan
  Right Click: Zoom
  Mouse wheel: Scroll Stack
  `;

    content.append(instructions);

    const brushInstanceNames = {
      CircularBrush: "CircularBrush",
      CircularEraser: "CircularEraser",
      SphereBrush: "SphereBrush",
      SphereEraser: "SphereEraser",
      ThresholdCircle: "ThresholdCircle",
      ScissorsEraser: "ScissorsEraser",
    };

    const brushStrategies = {
      [brushInstanceNames.CircularBrush]: "FILL_INSIDE_CIRCLE",
      [brushInstanceNames.CircularEraser]: "ERASE_INSIDE_CIRCLE",
      [brushInstanceNames.SphereBrush]: "FILL_INSIDE_SPHERE",
      [brushInstanceNames.SphereEraser]: "ERASE_INSIDE_SPHERE",
      [brushInstanceNames.ThresholdCircle]: "THRESHOLD_INSIDE_CIRCLE",
      [brushInstanceNames.ScissorsEraser]: "ERASE_INSIDE",
    };

    const brushValues = [
      brushInstanceNames.CircularBrush,
      brushInstanceNames.CircularEraser,
      brushInstanceNames.SphereBrush,
      brushInstanceNames.SphereEraser,
      brushInstanceNames.ThresholdCircle,
    ];

    const optionsValues = [
      ...brushValues,
      RectangleScissorsTool.toolName,
      CircleScissorsTool.toolName,
      SphereScissorsTool.toolName,
      brushInstanceNames.ScissorsEraser,
      PaintFillTool.toolName,
    ];

    // Adding segmentation Tools
    // ============================= //
    addDropdownToToolbar({
      options: { values: optionsValues, defaultValue: BrushTool.toolName },
      onSelectedValueChange: (nameAsStringOrNumber) => {
        const name = String(nameAsStringOrNumber);
        const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);

        // Set the currently active tool disabled
        const toolName = toolGroup.getActivePrimaryMouseButtonTool();

        if (toolName) {
          toolGroup.setToolDisabled(toolName);
        }

        if (brushValues.includes(name)) {
          toolGroup.setToolActive(name, {
            bindings: [{ mouseButton: MouseBindings.Primary }],
          });
        } else {
          const toolName = name;

          toolGroup.setToolActive(toolName, {
            bindings: [{ mouseButton: MouseBindings.Primary }],
          });
        }
      },
      container: toolbarRef.current,
    });

    const thresholdOptions = new Map();
    thresholdOptions.set("CT Fat: (-150, -70)", {
      threshold: [-150, -70],
    });
    thresholdOptions.set("CT Bone: (200, 1000)", {
      threshold: [200, 1000],
    });

    addDropdownToToolbar({
      options: {
        values: Array.from(thresholdOptions.keys()),
        defaultValue: thresholdOptions[0],
      },
      onSelectedValueChange: (nameAsStringOrNumber) => {
        const name = String(nameAsStringOrNumber);

        const thresholdArgs = thresholdOptions.get(name);

        segmentationUtils.setBrushThresholdForToolGroup(
          toolGroupId,
          thresholdArgs.threshold,
          thresholdArgs
        );
      },
      container: toolbarRef.current,
    });

    addSliderToToolbar({
      title: "Brush Size",
      range: [5, 50],
      defaultValue: 25,
      onSelectedValueChange: (valueAsStringOrNumber) => {
        const value = Number(valueAsStringOrNumber);
        segmentationUtils.setBrushSizeForToolGroup(toolGroupId, value);
      },
      container: toolbarRef.current,
    });
    // ============================= //

    async function addSegmentationsToState() {
      // Create a segmentation of the same resolution as the source data
      await volumeLoader.createAndCacheDerivedSegmentationVolume(volumeId, {
        volumeId: segmentationId,
      });

      // Add the segmentations to state
      segmentation.addSegmentations([
        {
          segmentationId,
          representation: {
            // The type of segmentation
            type: csToolsEnums.SegmentationRepresentations.Labelmap,
            // The actual segmentation data, in the case of labelmap this is a
            // reference to the source volume of the segmentation.
            data: {
              volumeId: segmentationId,
            },
          },
        },
      ]);

      const segmentationVolume = cornerstone.cache.getVolume(segmentationId);
      const scalarData = segmentationVolume.scalarData;
      const { dimensions } = segmentationVolume;

      let innerRadius = dimensions[0] / 8;
      let outerRadius = dimensions[0] / 4;
      let centerOffset = [0, 0, 0];
      const center = [
        dimensions[0] / 2 + centerOffset[0],
        dimensions[1] / 2 + centerOffset[1],
        dimensions[2] / 2 + centerOffset[2],
      ];

      let voxelIndex = 0;

      for (let z = 0; z < dimensions[2]; z++) {
        for (let y = 0; y < dimensions[1]; y++) {
          for (let x = 0; x < dimensions[0]; x++) {
            const distanceFromCenter = Math.sqrt(
              (x - center[0]) * (x - center[0]) +
                (y - center[1]) * (y - center[1]) +
                (z - center[2]) * (z - center[2])
            );
            if (distanceFromCenter < innerRadius) {
              scalarData[voxelIndex] = 5;
            } else if (distanceFromCenter < outerRadius) {
              scalarData[voxelIndex] = 6;
            }
            voxelIndex++;
          }
        }
      }
    }

    /**
     * Runs the demo
     */
    async function run() {
      // Init Cornerstone and related libraries
      await initDemo();

      volumeLoader.registerVolumeLoader(
        "nifti",
        cornerstoneNiftiImageVolumeLoader
      );

      // Add tools to Cornerstone3D
      cornerstoneTools.addTool(PanTool);
      cornerstoneTools.addTool(ZoomTool);
      cornerstoneTools.addTool(StackScrollMouseWheelTool);
      cornerstoneTools.addTool(StackScrollTool);
      cornerstoneTools.addTool(SegmentationDisplayTool);
      cornerstoneTools.addTool(RectangleScissorsTool);
      cornerstoneTools.addTool(CircleScissorsTool);
      cornerstoneTools.addTool(SphereScissorsTool);
      cornerstoneTools.addTool(PaintFillTool);
      cornerstoneTools.addTool(BrushTool);

      // Define tool groups to add the segmentation display tool to
      const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);

      // Manipulation Tools
      toolGroup.addTool(PanTool.toolName);
      toolGroup.addTool(ZoomTool.toolName);
      toolGroup.addTool(StackScrollMouseWheelTool.toolName);

      // Segmentation Tools
      toolGroup.addTool(SegmentationDisplayTool.toolName);
      toolGroup.addTool(RectangleScissorsTool.toolName);
      toolGroup.addTool(CircleScissorsTool.toolName);
      toolGroup.addTool(SphereScissorsTool.toolName);
      toolGroup.addToolInstance(
        brushInstanceNames.ScissorsEraser,
        SphereScissorsTool.toolName,
        {
          activeStrategy: brushStrategies.ScissorsEraser,
        }
      );
      toolGroup.addTool(PaintFillTool.toolName);
      toolGroup.addTool(StackScrollTool.toolName);
      toolGroup.addToolInstance(
        brushInstanceNames.CircularBrush,
        BrushTool.toolName,
        {
          activeStrategy: brushStrategies.CircularBrush,
        }
      );
      toolGroup.addToolInstance(
        brushInstanceNames.CircularEraser,
        BrushTool.toolName,
        {
          activeStrategy: brushStrategies.CircularEraser,
        }
      );
      toolGroup.addToolInstance(
        brushInstanceNames.SphereBrush,
        BrushTool.toolName,
        {
          activeStrategy: brushStrategies.SphereBrush,
        }
      );
      toolGroup.addToolInstance(
        brushInstanceNames.SphereEraser,
        BrushTool.toolName,
        {
          activeStrategy: brushStrategies.SphereEraser,
        }
      );
      toolGroup.setToolActive(StackScrollTool.toolName, {
        bindings: [
          {
            mouseButton: MouseBindings.Primary, // Left Click
            modifierKey: KeyboardBindings.Alt,
          },
          {
            numTouchPoints: 1,
            modifierKey: KeyboardBindings.Meta,
          },
        ],
      });
      toolGroup.addToolInstance(
        brushInstanceNames.ThresholdCircle,
        BrushTool.toolName,
        {
          activeStrategy: brushStrategies.ThresholdCircle,
        }
      );
      toolGroup.setToolEnabled(SegmentationDisplayTool.toolName);

      toolGroup.setToolActive(brushInstanceNames.CircularBrush, {
        bindings: [{ mouseButton: MouseBindings.Primary }],
      });

      toolGroup.setToolActive(ZoomTool.toolName, {
        bindings: [
          {
            mouseButton: MouseBindings.Primary, // Shift Left Click
            modifierKey: KeyboardBindings.Shift,
          },
        ],
      });

      toolGroup.setToolActive(PanTool.toolName, {
        bindings: [
          {
            mouseButton: MouseBindings.Auxiliary, // Middle Click
          },
          {
            mouseButton: MouseBindings.Primary,
            modifierKey: KeyboardBindings.Ctrl,
          },
        ],
      });
      toolGroup.setToolActive(ZoomTool.toolName, {
        bindings: [
          {
            mouseButton: MouseBindings.Secondary, // Right Click
          },
        ],
      });
      // As the Stack Scroll mouse wheel is a tool using the `mouseWheelCallback`
      // hook instead of mouse buttons, it does not need to assign any mouse button.
      toolGroup.setToolActive(StackScrollMouseWheelTool.toolName);

      // This will load the nifti file, no need to call .load again for nifti
      await volumeLoader.createAndCacheVolume(volumeId);

      // Add some segmentations based on the source data volume
      await addSegmentationsToState();

      // Instantiate a rendering engine
      const renderingEngineId = "myRenderingEngine";
      const renderingEngine = new RenderingEngine(renderingEngineId);

      // Create the viewports
      const viewportId1 = "CT_AXIAL";
      const viewportId2 = "CT_SAGITTAL";
      const viewportId3 = "CT_CORONAL";

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

      toolGroup.addViewport(viewportId1, renderingEngineId);
      toolGroup.addViewport(viewportId2, renderingEngineId);
      toolGroup.addViewport(viewportId3, renderingEngineId);

      // Set volumes on the viewports
      await setVolumesForViewports(
        renderingEngine,
        [{ volumeId, callback: setCtTransferFunctionForVolumeActor }],
        [viewportId1, viewportId2, viewportId3]
      );

      // Add the segmentation representation to the toolgroup
      await segmentation.addSegmentationRepresentations(toolGroupId, [
        {
          segmentationId,
          type: csToolsEnums.SegmentationRepresentations.Labelmap,
        },
      ]);

      // Render the image
      renderingEngine.renderViewports([viewportId1, viewportId2, viewportId3]);
    }

    run();
  }, []);

  return (
    <div>
      <div id="toolbar" ref={toolbarRef}></div>
      <div id="content" ref={contentRef}></div>
    </div>
  );
}

export default Segmentation;
