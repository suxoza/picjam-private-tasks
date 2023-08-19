<template>
      <div>
        <div class="w-full h-24 bg-gray-300 flex items-center justify-center">
            <div class="flex gap-x-8">
              <div @click="setActive('filter_1')" :class="[active_item == 'filter_1'?'text-red-500':'text-green-900']" class="text-green-900 hover:text-blue-800 underline italic cursor-pointer">ColorReplace</div>
              <div @click="setActive('filter_2')" :class="[active_item == 'filter_2'?'text-red-500':'text-green-900']" class="text-green-900 hover:text-blue-800 underline italic cursor-pointer">ColorReplace-2</div>
              <div @click="setActive('filter_3')" :class="[active_item == 'filter_3'?'text-red-500':'text-green-900']" class="text-green-900 hover:text-blue-800 underline italic cursor-pointer">Shader</div>
              <div @click="setActive('filter_4')" :class="[active_item == 'filter_4'?'text-red-500':'text-green-900']" class="text-green-900 hover:text-blue-800 underline italic cursor-pointer">Custom Filter</div>
              <div @click="setActive('filter_5')" :class="[active_item == 'filter_5'?'text-red-500':'text-green-900']" class="text-green-900 hover:text-blue-800 underline italic cursor-pointer">Custom Filter-2</div>
              <div @click="setActive('filter_6')" :class="[active_item == 'filter_6'?'text-red-500':'text-green-900']" class="text-green-900 hover:text-blue-800 underline italic cursor-pointer">Custom Filter-3</div>
              <div @click="setActive('filter_7')" :class="[active_item == 'filter_7'?'text-red-500':'text-green-900']" class="text-green-900 hover:text-blue-800 underline italic cursor-pointer">Custom Filter-7</div>
            </div>
        </div>

          <div v-show="active_item == 'filter_1'" class="bg-red-300 flex items-center justify-center" id="container_here"></div>
          <div v-show="active_item == 'filter_2'" class="bg-red-300 flex items-center justify-center" id="container_here2"></div>
          <div v-show="active_item == 'filter_3'" class="bg-red-300 flex items-center justify-center" id="container_here3"></div>
          <div v-show="active_item == 'filter_4'" class="bg-red-300 flex items-center justify-center" id="container_here4"></div>
          <div v-show="active_item == 'filter_5'" class="bg-red-300 flex items-center justify-center" id="container_here5"></div>
          <div v-show="active_item == 'filter_6'" class="bg-red-300 flex items-center justify-center" id="container_here6"></div>
          <div v-show="active_item == 'filter_7'" class="bg-red-300 flex items-center justify-center" id="container_here7"></div>
        
      </div>
</template>

<script setup>   
  import { onMounted, ref } from 'vue';
  const active_item = ref('filter_1')
  
  const setActive = (active) => {
    active_item.value = active
  }
  
  
  import * as PIXI from 'pixi.js'; 
  import { ColorReplaceFilter } from '@pixi/filter-color-replace';
  import { ColorGradientFilter } from '@pixi/filter-color-gradient';
  import { BloomFilter } from '@pixi/filter-bloom';
  import { ColorMapFilter } from '@pixi/filter-color-map';

  
  const color_replace_filter = () => {
    const app = new PIXI.Application({ resizeTo: window });
    document.getElementById('container_here').appendChild(app.view);
    app.stage.eventMode = 'static';
    const container = new PIXI.Container();
  
    const bg = PIXI.Sprite.from('http://localhost:5173/images/image1232.png');
    container.addChild(bg);
  
    const colorReplaceFilter = new ColorReplaceFilter()
    colorReplaceFilter.originalColor = [48/255.0, 106/255.0, 192/255.0]; 
    colorReplaceFilter.newColor = [207/255.0, 134/255.0, 104/255.0]; 
    colorReplaceFilter.epsilon = 0.4
    container.filters = [colorReplaceFilter];
    app.stage.addChild(container);
  }
  
  const color_replace_filter2 = () => {
    const app = new PIXI.Application({ resizeTo: window });
    document.getElementById('container_here2').appendChild(app.view);
    app.stage.eventMode = 'static';
    const container = new PIXI.Container();
  
    const bg = PIXI.Sprite.from('http://localhost:5173/images/picjam_-_red_sweater_23.png');
    container.addChild(bg);
  
    const colorReplaceFilter = new ColorReplaceFilter()
    colorReplaceFilter.originalColor = [244/255.0, 12/255.0, 40/255.0]; //rgba(244, 12, 40, 1)
    colorReplaceFilter.newColor = [31/255.0, 92/255.0, 213/255.0]; // rgba(31, 92, 213, 1)
    colorReplaceFilter.epsilon = 0.3
    container.filters = [colorReplaceFilter];
    app.stage.addChild(container);
  }

  const color_mapping = () => {
    const app = new PIXI.Application({ resizeTo: window });

    document.getElementById('container_here3').appendChild(app.view);
    app.stage.eventMode = 'static';
    const container = new PIXI.Container();

    var colorMatrix = new PIXI.filters.ColorMatrixFilter();
    container.filters = [colorMatrix];

    var params = {
        desaturation: .1, 
        toned: .1, 
        lightColor: "#FFFFFF",
        darkColor: "#000000"
        // lightColor: [244/255.0, 12/255.0, 40/255.0],
        // darkColor: [31/255.0, 92/255.0, 213/255.0]
    }
    colorMatrix.colorTone([
      params.desaturation, 
      params.toned, 
      params.lightColor, 
      params.darkColor
    ])

    colorMatrix.brightness(3.5); // 1.5 times brighter
    
  
    const bg = PIXI.Sprite.from('http://localhost:5173/images/picjam_-_red_sweater_23.png');
    container.addChild(bg);
  
    app.stage.addChild(container);
  }

  const custom_filter = () => {
    const app = new PIXI.Application({ resizeTo: window });
    document.getElementById('container_here4').appendChild(app.view);
    app.stage.eventMode = 'static';

    const container = new PIXI.Container();
    const bg = PIXI.Sprite.from('http://localhost:5173/images/picjam_-_red_sweater_23.png');

    // Define the target and new colors
    const targetColor = new Float32Array([235 / 255, 10 / 255, 37 / 255]); // rgba(235, 10, 37, 1)
    const newColor = new Float32Array([31 / 255, 92 / 255, 213 / 255]);

    // Create a custom shader for color replacement
    const customShader = new PIXI.Filter(null, `
        precision mediump float;
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform vec3 targetColor;
        uniform vec3 newColor;

        vec3 RGB2Lab(vec3 rgbColor) {
            // convert sRGB to XYZ
            vec3 xyzColor;
            xyzColor.x = (rgbColor.r > 0.04045 ? pow((rgbColor.r + 0.055) / 1.055, 2.4) : rgbColor.r / 12.92) * 100.0;
            xyzColor.y = (rgbColor.g > 0.04045 ? pow((rgbColor.g + 0.055) / 1.055, 2.4) : rgbColor.g / 12.92) * 100.0;
            xyzColor.z = (rgbColor.b > 0.04045 ? pow((rgbColor.b + 0.055) / 1.055, 2.4) : rgbColor.b / 12.92) * 100.0;

            // convert XYZ to Lab
            vec3 labColor;
            xyzColor /= vec3(95.047, 100.000, 108.883);
            xyzColor = vec3(xyzColor.x > 0.008856 ? pow(xyzColor.x, 1.0/3.0) : (7.787 * xyzColor.x) + (16.0/116.0),
                            xyzColor.y > 0.008856 ? pow(xyzColor.y, 1.0/3.0) : (7.787 * xyzColor.y) + (16.0/116.0),
                            xyzColor.z > 0.008856 ? pow(xyzColor.z, 1.0/3.0) : (7.787 * xyzColor.z) + (16.0/116.0));

            labColor.x = (116.0 * xyzColor.y) - 16.0;
            labColor.y = 500.0 * (xyzColor.x - xyzColor.y);
            labColor.z = 200.0 * (xyzColor.y - xyzColor.z);

            return labColor;
        }

        void main(void) {
            // Sample the texture
            vec4 color = texture2D(uSampler, vTextureCoord);

            // Convert colors to Lab color space
            vec3 labColor = RGB2Lab(color.rgb);
            vec3 labTargetColor = RGB2Lab(targetColor);

            // Calculate the Euclidean distance between the colors in Lab color space
            float colorDistance = distance(labColor, labTargetColor);

            // Define a threshold for color similarity
            float colorThreshold = 213.0; // Adjust this value for accuracy

            // Check if the color is similar enough to the targetColor
            if (colorDistance < colorThreshold) {
                color.rgb = newColor;
            }

            gl_FragColor = color;
        }
    `, {
        targetColor: targetColor,
        newColor: newColor
    });

    // Set the filter on the container
    container.filters = [customShader];

    container.addChild(bg);
    app.stage.addChild(container);

  }

  const custom_filter2 = () => {
    const app = new PIXI.Application({ resizeTo: window });
    document.getElementById('container_here5').appendChild(app.view);
    app.stage.eventMode = 'static';

    const container = new PIXI.Container();
    const bg = PIXI.Sprite.from('http://localhost:5173/images/picjam_-_red_sweater_23.png');

    // Define the target and new colors
    const targetColor = new Float32Array([235 / 255, 10 / 255, 37 / 255]); // rgba(235, 10, 37, 1)
    const newColor = new Float32Array([31 / 255, 92 / 255, 213 / 255]);

    // Create a custom shader for color replacement
    const customShader = new PIXI.Filter(null, `
        precision mediump float;
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform vec3 targetColor;
        uniform vec3 newColor;

        vec3 RGB2Lab(vec3 rgbColor) {
            // convert sRGB to XYZ
            vec3 xyzColor;
            xyzColor.x = (rgbColor.r > 0.04045 ? pow((rgbColor.r + 0.055) / 1.055, 2.4) : rgbColor.r / 12.92) * 100.0;
            xyzColor.y = (rgbColor.g > 0.04045 ? pow((rgbColor.g + 0.055) / 1.055, 2.4) : rgbColor.g / 12.92) * 100.0;
            xyzColor.z = (rgbColor.b > 0.04045 ? pow((rgbColor.b + 0.055) / 1.055, 2.4) : rgbColor.b / 12.92) * 100.0;

            // convert XYZ to Lab
            vec3 labColor;
            xyzColor /= vec3(95.047, 100.000, 108.883);
            xyzColor = vec3(xyzColor.x > 0.008856 ? pow(xyzColor.x, 1.0/3.0) : (7.787 * xyzColor.x) + (16.0/116.0),
                            xyzColor.y > 0.008856 ? pow(xyzColor.y, 1.0/3.0) : (7.787 * xyzColor.y) + (16.0/116.0),
                            xyzColor.z > 0.008856 ? pow(xyzColor.z, 1.0/3.0) : (7.787 * xyzColor.z) + (16.0/116.0));

            labColor.x = (116.0 * xyzColor.y) - 16.0;
            labColor.y = 500.0 * (xyzColor.x - xyzColor.y);
            labColor.z = 200.0 * (xyzColor.y - xyzColor.z);

            return labColor;
        }

        void main(void) {
            // Sample the texture
            vec4 color = texture2D(uSampler, vTextureCoord);

            // Convert colors to Lab color space
            vec3 labColor = RGB2Lab(color.rgb);
            vec3 labTargetColor = RGB2Lab(targetColor);

            // Calculate the Euclidean distance between the colors in Lab color space
            float colorDistance = distance(labColor, labTargetColor);

            // Define a threshold for color similarity
            float colorThreshold = 210.0; // Adjust this value for accuracy

            // Check if the color is similar enough to the targetColor
            if (colorDistance < colorThreshold) {
                color.rgb = newColor;
            }

            gl_FragColor = color;
        }
    `, {
        targetColor: targetColor,
        newColor: newColor
    });

    const colorReplaceFilter = new ColorReplaceFilter()
    colorReplaceFilter.originalColor = [244/255.0, 12/255.0, 40/255.0]; //rgba(244, 12, 40, 1)
    colorReplaceFilter.newColor = [31/255.0, 92/255.0, 213/255.0]; // rgba(31, 92, 213, 1)
    colorReplaceFilter.epsilon = 0.359

    const gradientFilter = new ColorGradientFilter()

    gradientFilter.alpha = 0.82

    // Set the filter on the container
    container.filters = [gradientFilter, colorReplaceFilter, customShader];

    // Set the filter on the container
    container.filters = [colorReplaceFilter, customShader];

    container.addChild(bg);
    app.stage.addChild(container);

  }

  const custom_filter3 = () => {
    const app = new PIXI.Application({ resizeTo: window });
    document.getElementById('container_here6').appendChild(app.view);
    app.stage.eventMode = 'static';
    

    const firstC = [48/255.0, 106/255.0, 192/255.0]

    // 207/255.0, 134/255.0, 104/255.0
    const secondC = [255 / 255, 0 / 255, 93 / 255]

    const container = new PIXI.Container();
    const bg = PIXI.Sprite.from('http://localhost:5173/images/image1232.png');

    // Define the target and new colors
    const targetColor = new Float32Array(firstC); // rgba(235, 10, 37, 1)
    const newColor = new Float32Array(secondC);

    // Create a custom shader for color replacement
    const customShader = new PIXI.Filter(null, `
        precision mediump float;
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform vec3 targetColor;
        uniform vec3 newColor;

        vec3 RGB2Lab(vec3 rgbColor) {
            // convert sRGB to XYZ
            vec3 xyzColor;
            xyzColor.x = (rgbColor.r > 0.04045 ? pow((rgbColor.r + 0.055) / 1.055, 2.4) : rgbColor.r / 12.92) * 100.0;
            xyzColor.y = (rgbColor.g > 0.04045 ? pow((rgbColor.g + 0.055) / 1.055, 2.4) : rgbColor.g / 12.92) * 100.0;
            xyzColor.z = (rgbColor.b > 0.04045 ? pow((rgbColor.b + 0.055) / 1.055, 2.4) : rgbColor.b / 12.92) * 100.0;

            // convert XYZ to Lab
            vec3 labColor;
            xyzColor /= vec3(95.047, 100.000, 108.883);
            xyzColor = vec3(xyzColor.x > 0.008856 ? pow(xyzColor.x, 1.0/3.0) : (7.787 * xyzColor.x) + (16.0/116.0),
                            xyzColor.y > 0.008856 ? pow(xyzColor.y, 1.0/3.0) : (7.787 * xyzColor.y) + (16.0/116.0),
                            xyzColor.z > 0.008856 ? pow(xyzColor.z, 1.0/3.0) : (7.787 * xyzColor.z) + (16.0/116.0));

            labColor.x = (116.0 * xyzColor.y) - 16.0;
            labColor.y = 500.0 * (xyzColor.x - xyzColor.y);
            labColor.z = 200.0 * (xyzColor.y - xyzColor.z);

            return labColor;
        }

        void main(void) {
            // Sample the texture
            vec4 color = texture2D(uSampler, vTextureCoord);

            // Convert colors to Lab color space
            vec3 labColor = RGB2Lab(color.rgb);
            vec3 labTargetColor = RGB2Lab(targetColor);

            // Calculate the Euclidean distance between the colors in Lab color space
            float colorDistance = distance(labColor, labTargetColor);

            // Define a threshold for color similarity
            float colorThreshold = 90.0; // Adjust this value for accuracy

            // Check if the color is similar enough to the targetColor
            if (colorDistance < colorThreshold) {
                color.rgb = newColor;
            }

            gl_FragColor = color;
        }
    `, {
        targetColor: targetColor,
        newColor: newColor
    });

    const colorReplaceFilter = new ColorReplaceFilter()
    colorReplaceFilter.originalColor = firstC; ; //rgba(244, 12, 40, 1)
    colorReplaceFilter.newColor = secondC; ; // rgba(31, 92, 213, 1)
    colorReplaceFilter.epsilon = 0.259


    // Define a custom color map (source RGB -> target RGB)
    const colorMap = {
        [0x306AC0]: [48/255.0, 106/255.0, 192/255.0],   // Map the source color to [48/255, 106/255, 192/255]
        [0xFF005D]: [255/255.0, 0/255.0, 93/255.0]       // Map the source color to [255/255, 0/255, 93/255]
    };

    // Create a custom filter for color mapping
    const colorMapFilter = new PIXI.Filter(null, `
        precision mediump float;
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;

        void main(void) {
            vec4 color = texture2D(uSampler, vTextureCoord);

            // Convert the color to integer (discard alpha channel)
            vec3 intColor = floor(color.rgb * 255.0 + 0.5);
            int sourceColor = int(intColor.r * 256.0 * 256.0 + intColor.g * 256.0 + intColor.b);

            // Map the color using the custom color map
            vec3 mappedColor = colorMap[sourceColor] / 255.0;

            // Apply the mapped color
            color.rgb = mappedColor;

            gl_FragColor = color;
        }
    `, {
        colorMap: colorMap
    });

    // Set the filter on the container
    container.filters = [colorReplaceFilter, customShader];

    container.addChild(bg);
    app.stage.addChild(container);

  }

  const custom_filter4 = () => {
    const app = new PIXI.Application({ resizeTo: window });
    document.getElementById('container_here7').appendChild(app.view);
    app.stage.eventMode = 'static';
    

    const firstC = [48/255.0, 106/255.0, 192/255.0]

    // 207/255.0, 134/255.0, 104/255.0
    const secondC = [255 / 255, 0 / 255, 93 / 255]

    const container = new PIXI.Container();
    const bg = PIXI.Sprite.from('http://localhost:5173/images/image1232.png');

    // Define the target and new colors
    const targetColor = new Float32Array(firstC); // rgba(235, 10, 37, 1)
    const newColor = new Float32Array(secondC);

    // Create a custom shader for color replacement
    const customShader = new PIXI.Filter(null, `
        precision mediump float;
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform vec3 targetColor;
        uniform vec3 newColor;

        vec3 RGB2Lab(vec3 rgbColor) {
            // convert sRGB to XYZ
            vec3 xyzColor;
            xyzColor.x = (rgbColor.r > 0.04045 ? pow((rgbColor.r + 0.055) / 1.055, 2.4) : rgbColor.r / 12.92) * 100.0;
            xyzColor.y = (rgbColor.g > 0.04045 ? pow((rgbColor.g + 0.055) / 1.055, 2.4) : rgbColor.g / 12.92) * 100.0;
            xyzColor.z = (rgbColor.b > 0.04045 ? pow((rgbColor.b + 0.055) / 1.055, 2.4) : rgbColor.b / 12.92) * 100.0;

            // convert XYZ to Lab
            vec3 labColor;
            xyzColor /= vec3(95.047, 100.000, 108.883);
            xyzColor = vec3(xyzColor.x > 0.008856 ? pow(xyzColor.x, 1.0/3.0) : (7.787 * xyzColor.x) + (16.0/116.0),
                            xyzColor.y > 0.008856 ? pow(xyzColor.y, 1.0/3.0) : (7.787 * xyzColor.y) + (16.0/116.0),
                            xyzColor.z > 0.008856 ? pow(xyzColor.z, 1.0/3.0) : (7.787 * xyzColor.z) + (16.0/116.0));

            labColor.x = (116.0 * xyzColor.y) - 16.0;
            labColor.y = 500.0 * (xyzColor.x - xyzColor.y);
            labColor.z = 200.0 * (xyzColor.y - xyzColor.z);

            return labColor;
        }

        void main(void) {
            // Sample the texture
            vec4 color = texture2D(uSampler, vTextureCoord);

            // Convert colors to Lab color space
            vec3 labColor = RGB2Lab(color.rgb);
            vec3 labTargetColor = RGB2Lab(targetColor);

            // Calculate the Euclidean distance between the colors in Lab color space
            float colorDistance = distance(labColor, labTargetColor);

            // Define a threshold for color similarity
            float colorThreshold = 90.0; // Adjust this value for accuracy

            // Check if the color is similar enough to the targetColor
            if (colorDistance < colorThreshold) {
                color.rgb = newColor;
            }

            gl_FragColor = color;
        }
    `, {
        targetColor: targetColor,
        newColor: newColor
    });

    const colorReplaceFilter = new ColorReplaceFilter()
    colorReplaceFilter.originalColor = firstC; ; //rgba(244, 12, 40, 1)
    colorReplaceFilter.newColor = secondC; ; // rgba(31, 92, 213, 1)
    colorReplaceFilter.epsilon = 0.259

    const gradientFilter = new ColorGradientFilter()
    gradientFilter.alpha = 0.12

    const bloomFilter = new BloomFilter()

    bloomFilter.blur = 0.20
    bloomFilter.kernelSize = 11

    // Set the filter on the container
    container.filters = [gradientFilter, colorReplaceFilter, customShader, bloomFilter];

    container.addChild(bg);
    app.stage.addChild(container);

  }


  onMounted(() => {
    color_replace_filter()
    color_replace_filter2()
    color_mapping()
    custom_filter()
    custom_filter2()
    custom_filter3()
    custom_filter4()
  })
    
  </script>

    

