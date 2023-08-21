
import { _SHADERS } from './shaders'
import * as PIXI from 'pixi.js'; 

const hexToRGB = (e) => {
  return e.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, ((e,t,r,a)=>"#" + t + t + r + r + a + a)).substring(1).match(/.{2}/g).map((e=>parseInt(e, 16) / 255))
}

export class ColorReplaceFilterUpd extends PIXI.Filter {
  constructor(options = {}) {
    const defaultSettings = {
      sourceColor: hexToRGB(options.originalColor || "#fff"),
      targetColor: hexToRGB(options.newColor || "#000"),
      targetAlpha: options.targetAlpha || 0,
      tolerance: options.epsilon || 0.4,
      preserveLuminosity: options.preserveLuminosity || 0
    };
    
    super(_SHADERS.vert, _SHADERS.replaceColorUpd, defaultSettings);
  }

}

  
const replaceColor = async (options = {}, textureData, config = {}, onComplete = () => {}) => {
    
    // const existingFilters = _LIB.app.stage.children.filter(child => child._type === 'replaceColor');
    // if (existingFilters.length > 1) {
    //   existingFilters.forEach((filter, index) => {
    //     if (index > 0) {
    //       _LIB.app.stage.removeChild(filter);
    //     }
    //   });
    // }
  
    const currentFilter = false; // existingFilters[0];
    const newFilter = new ColorReplaceFilterUpd(options);
  
    const findMaskFilter = (element) => {
      return element.filters.find(filter => filter.__proto__ && filter.__proto__.constructor && filter.__proto__.constructor.name === 'MaskFilter');
    };
  
    const updateMaskFilterTexture = (element, texture, width, height) => {
      const maskFilter = findMaskFilter(element);
      maskFilter.textureConfig.texture.baseTexture.setRealSize(width, height);
      maskFilter.textureConfig.texture.baseTexture.resource.data = texture;
    };
  
    if (currentFilter) {
      // Update existing filter
      try {
        currentFilter.children[1].visible = !!config.showMask;
        currentFilter.children[0].visible = !config.showMask;
        findMaskFilter(currentFilter).uniforms.invert = !!config.invertSelection;
  
        if (textureData && textureData.visible) {
          updateMaskFilterTexture(textureData.data, textureData.width, textureData.height);
        } else {
          updateMaskFilterTexture(new Uint8Array(4).fill(0), 1, 1);
        }
      } catch (error) {
        console.error(error);
      }
  
      currentFilter.filters = [newFilter, ...(textureData ? [textureData] : [])];
    } else {
      // Create a new filter container
      const filterContainer = new PIXI.Container;
      filterContainer._type = 'replaceColor';
  
      const textureClone = new PIXI.Sprite(_LIB.app.stage.children[0].texture.clone());
      filterContainer.addChild(textureClone);
  
      _LIB.Drawing.destroyBrush();
  
      await _LIB.Drawing.initDraw(true, {
        hideCanvas: true,
        isEraser: false,
        width: 50,
        opacity: 100,
        softness: 0,
        color: '#ffffff',
        brush: 'CrayonBrushFilter'
      });
  
      _LIB.Drawing.canvas.freeDrawingBrush.ticker = onComplete;
  
      // Create a mask filter with default settings
      const maskFilter = new _LIB.filters.MaskFilter({
        texture: PIXI.Texture.fromBuffer(new Uint8Array(4).fill(0), 1, 1, {
          format: PIXI.FORMATS.RGBA
        }),
        isFit: true,
        position: 'center-center'
      }, {
        alpha: 0.8,
        angle: 0,
        applyAs: 'custom_clear',
        blurImage: PIXI.Texture.EMPTY,
        isMask: true,
        mode: 'default',
        opacity: 100,
        rotation: 0,
        size: 100,
        x: 0,
        y: 0,
        lockAdaptive: true,
        invert: false
      });
  
      // Create a graphics object for the mask
      const maskGraphics = new PIXI.Graphics;
      maskGraphics.beginFill(0xff0000, 0.5);
      maskGraphics.drawRect(0, 0, _LIB.app._canvasSize.w, _LIB.app._canvasSize.h);
      maskGraphics.endFill();
      maskGraphics.visible = !!config.showMask;
  
      // Toggle visibility based on configuration
      textureClone.visible = !config.showMask;
  
      filterContainer.filters = [newFilter, maskFilter];
      filterContainer.addChild(maskGraphics);
  
      // Add the filter container to the stage
      _LIB.app.stage.addChild(filterContainer);
    }
  
    // Trigger canvas re-render
    _LIB.app.reRenderCanvas();
}
  
  