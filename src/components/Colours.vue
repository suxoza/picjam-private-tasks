<template>
      <div class="flex justify-start pt-32">
        <div class="w-1/2 flex flex-col pt-10 gap-y-10">
            <div class="flex gap-x-3 items-center mx-5 px-5 w-full justify-center">
              <div @click="setStatus(ACTIONS.INITIAL_IS_ENABLED)" :class="status === ACTIONS.IS_NOT_SELECTED?'opacity-50 border-gray-400 border-2':''" class="flex flex-col gap-y-2 items-center border-gray-300 border p-5 cursor-pointer rounded-lg">
                <div class="border-box text-lg font-bold">
                  Select Initial color
                </div>
                <div ref="viewcolor_ref" class="viewColor bg-[#d39e8bff] h-16 w-16 rounded-full color-red-500"></div>
              </div>
              <div @click="status < 2?null:setStatus(ACTIONS.TARGET_IS_ENABLED)" :class="[
                (status != ACTIONS.TARGET_IS_ENABLED? 'opacity-25': ''),
                (status == ACTIONS.TARGET_IS_ENABLED? 'border-gray-800 border-2': '')
            ]" class="flex flex-col gap-y-2 items-center border-gray-300 border p-5 cursor-pointer rounded-lg">
                <div class="border-box text-lg font-bold">
                  Select Target color 
                </div>
                <div ref="target_circle" class="viewColor bg-[#d39e8bff] h-16 w-16 rounded-full color-red-500 ml-5"></div>
              </div>  
            </div>
  
            <div :class="status === ACTIONS.IS_NOT_SELECTED?'hidden':''" class="w-full justify-center flex items-center flex flex-col">
              <div v-show="status === ACTIONS.TARGET_IS_ENABLED" class="my-5">
                <!-- <input v-model="distance" @input="on_slicer_change" type="range" class="w-64" value="50" min="1" max="100"> -->
                <input v-model="distance" @input="on_slicer_change" type="range" class="w-64" min="1" max="100">
              </div>
              <div ref="picker_ref" class=" viewColor bg-[#d39e8bff] rounded-full color-red-500 -ml-48"></div>
            </div>
        </div>
        
        <div class="relative w-1/2 flex items-center justify-start">
          <!-- <img ref="image_ref" style="display: none; width: 200px;" src="http://localhost:5173/canvas_image.jpg" alt=""> -->
          <!-- <img ref="image_ref" style="display: none; width: 200px;" src="http://localhost:5173/woman.png" alt=""> -->
          <!-- <img ref="image_ref" style="display: none; width: 200px;" src="http://localhost:5173/images/image1232.png" alt=""> -->
          <!-- <img ref="image_ref" style="display: none; width: 200px;" src="http://localhost:5173/images/picjam_-_green_turtleneck_sweater_47.png" alt=""> -->
          <img ref="image_ref" style="display: none; width: 200px;" src="http://localhost:5173/images/picjam_-_red_sweater_23.png" alt=""/>
          <canvas ref="canvas_ref"></canvas>
        </div>
      </div>
  
      <div class="w-full flex items-center justify-end mt-2">
        <canvas width="700" height="700" class="w-9/12 h-full"  id="canvas_2"></canvas>
      </div>
</template>

<script>

  import '@simonwep/pickr/dist/themes/classic.min.css';   

  import Pickr from '@simonwep/pickr';
  import { ref, onMounted } from 'vue'
  import debounce from 'lodash.debounce';
</script>

<script setup>

    
    
    const ACTIONS = {
        IS_NOT_SELECTED: 1,
        INITIAL_IS_ENABLED: 2,
        TARGET_IS_ENABLED: 3,
        TARGET_IS_SELECTED: 4 
    };

    var status = ref(ACTIONS.IS_NOT_SELECTED)
    
    class ImageColorPicker {


      load_image(callback) {

        const image = new Image();
        image.src = this.originalImage.src;
        
        image.addEventListener('load', () => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataURL = event.target.result;
            const img = new Image();
            img.src = dataURL;
            

            img.onload = () => callback(img, image)
            
          };
          fetch(image.src)
            .then(response => response.blob())
            .then(blob => {
              reader.readAsDataURL(blob);
            });
        });
      }


      constructor(canvas, viewColor, img, picker, target_circle, distance) {
        this.originalImage = img
        this.viewColor = viewColor
        this.canvas = canvas
        this.distance = distance

        this.picker = new Pickr({
              el: picker,
              components: {
                autoReposition: false,
                position: 'bottom-middle',
                preview: false,
                opacity: false,
                hue: true,
                inline: true,
                theme: 'nano',
                showAlways: true,
                adjustableNumbers: true,
                interaction: {
                  input: true
                }
              },
        }).on('hide', instance => {
          instance.show()
        }).on('change', debounce((color, source, instance) => {
          this.targeted_circle().style.backgroundColor = this.rgbaToRgb(color.toRGBA().toString())
          const selectedColor = this.rgbaToRgb(color.toRGBA().toString())
          this.set_action(selectedColor)
        }, 100)).on('swatchselect', (color) => {
          console.log('swatch select had been changed...', color)
        });

        // this.picker.show()

        this.target_circle = target_circle
        this.imgW = 400;
        this.ctx = this.canvas.getContext("2d");
        
        this.cw = this.canvas.width = this.imgW;
        this.pixels = null;
        this.imgData = null

        this.circle = {
            radius: 40, 
            zoomFactor: 2,
        };
        
        this.selected_color = null
        this.destiny_color = null

        this.load_image((img, image) => {
          const ch = this.canvas.height = this.imgW * img.height / img.width;
          this.ctx.drawImage(img, 0, 0, this.cw, ch);
          this.imgData = this.ctx.getImageData(0, 0, this.cw, ch);
          console.log('imgData2 = ')
          console.log(this.imgData)
          this.pixels = this.imgData.data;
          this.animate(image)
        })

        this.canvas.addEventListener("mousemove", (e) => {
          if([ACTIONS.IS_NOT_SELECTED].includes(status.value))return
          const { thisRGB, thisRGBRy } = this.get_colors(e)

          this.targeted_circle().style.backgroundColor = thisRGB;

        }, false);


        this.canvas.addEventListener('click', (e) => {

          const { thisRGB, thisRGBRy } = this.get_colors(e)
          console.log('colors: ', thisRGB, thisRGBRy)
          
          this.targeted_circle().style.backgroundColor = thisRGB;

          // this.picker.setColour(thisRGB)
          this.picker.setColor(thisRGB)
          // this.picker.show()

          this.set_action(thisRGB)
        })
      }

      on_slicer_change() {
          console.log('debounce changes here...')
          this.set_action(this.destiny_color || this.selected_color)
      }

      targeted_circle() {
        // console.log('status = ', status.value)
        return status.value < 3 ? this.viewColor: this.target_circle
      }

      set_action(color) {
        // console.log('color = ', color)
        if(status.value < ACTIONS.TARGET_IS_ENABLED){
          status.value = ACTIONS.INITIAL_IS_ENABLED
          this.selected_color = color
        }else if(status.value == ACTIONS.TARGET_IS_ENABLED){
          this.destiny_color = color
          this.replaceColor(this.selected_color, color)
        }
      }

      reset(){
        this.load_image((img, image) => {
            const canvas_2 = document.getElementById('canvas_2')
            const ctx = canvas_2.getContext("2d");
            const ch = this.canvas.height = this.imgW * img.height / img.width;
            this.distance.value = 40
            ctx.drawImage(img, 0, 0, this.cw, ch);
            const imgData = ctx.getImageData(0, 0, this.cw, ch);
            ctx.putImageData(imgData, 0, 0);
            this.destiny_color = null
        })
      }

      get_colors(e) {
        const m = this.oMousePos(e);
        const i = (m.x + m.y * this.cw) * 4;
        const R = this.pixels[i];
        const G = this.pixels[i + 1];
        const B = this.pixels[i + 2];
        const thisRGBRy = [R, G, B];
        const thisRGB = this.display_rgb(thisRGBRy);
        return {
          thisRGBRy, 
          thisRGB
        }
      }
      
      oMousePos(evt) {
        const ClientRect = this.canvas.getBoundingClientRect();
        
        const result = {
          x: Math.round(evt.clientX - ClientRect.left),
          y: Math.round(evt.clientY - ClientRect.top)
        };

        this.circle.x = result.x;
        this.circle.y = result.y
        return result
      }

      display_rgb(ry) {
        return `rgb(${Math.round(ry[0])},${Math.round(ry[1])},${Math.round(ry[2])})`;
      }

      animate(image) {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

          const { x, y, radius, zoomFactor } = this.circle;

          const zoomedX = x - radius;
          const zoomedY = y - radius;
          const zoomedWidth = radius * 2;
          const zoomedHeight = radius * 2;

          this.ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
          this.ctx.save();
          this.ctx.beginPath();
          this.ctx.arc(x, y, radius, 0, Math.PI * 2);
          this.ctx.clip();

          this.ctx.drawImage(
              this.canvas,
              zoomedX, zoomedY, zoomedWidth, zoomedHeight,
              x - radius * zoomFactor, y - radius * zoomFactor, radius * 2 * zoomFactor, radius * 2 * zoomFactor
          );

          this.ctx.restore();
          this.ctx.beginPath();
          this.ctx.arc(x, y, radius, 0, Math.PI * 2);
          this.ctx.strokeStyle = "blue";
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
          this.ctx.closePath();

          requestAnimationFrame(this.animate.bind(this, image));
      }

      parseRGB(rgbString) {
        try {
          
          const match = rgbString.match(/\((\d+),\s*(\d+),\s*(\d+)\)/);
  
          if (match) {
              const r = Number(match[1]);
              const g = Number(match[2]);
              const b = Number(match[3]);
              
              return { r, g, b }
          } 
        } catch (error) {
          console.log('rgbString = ', rgbString)        
        }
        return rgbString
      }

      rgbToLab(rgb) {
          const r = rgb.r / 255;
          const g = rgb.g / 255;
          const b = rgb.b / 255;

          const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
          const y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
          const z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b;

          const epsilon = 0.008856; // CIE standards
          const kappa = 903.3; // CIE standards

          const xr = x / 0.95047; // reference white point
          const yr = y / 1.0;
          const zr = z / 1.08883;

          const fx = xr > epsilon ? Math.pow(xr, 1/3) : (kappa * xr + 16) / 116;
          const fy = yr > epsilon ? Math.pow(yr, 1/3) : (kappa * yr + 16) / 116;
          const fz = zr > epsilon ? Math.pow(zr, 1/3) : (kappa * zr + 16) / 116;

          const L = 116 * fy - 16;
          const a = 500 * (fx - fy);
          const d = 200 * (fy - fz);

          return { L, a, b:d };
        }


      colorDistance(color1, color2) {
          // const rDiff = color1.r - color2.r;
          // const gDiff = color1.g - color2.g;
          // const bDiff = color1.b - color2.b;
          // const diff =  Math.sqrt((rDiff * rDiff) + (gDiff * gDiff) + (bDiff * bDiff));
          // return diff
          const deltaL = color1.L - color2.L;
          const deltaA = color1.a - color2.a;
          const deltaB = color1.b - color2.b;
          return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB)
      }

      rgbaToRgb(rgba) {
        const rgbaComponents = rgba.substring(5, rgba.length - 1).split(',').map(Number);

        const red = Math.round(rgbaComponents[0]);
        const green = Math.round(rgbaComponents[1]);
        const blue = Math.round(rgbaComponents[2]);

        return `rgb(${red}, ${green}, ${blue})`;
      }

      replaceColor(targetColorString, replacementColorString) {
        
          this.load_image((img, image) => {
              const canvas_2 = document.getElementById('canvas_2')
              const ctx = canvas_2.getContext("2d");
              const ch = this.canvas.height = this.imgW * img.height / img.width;
              ctx.drawImage(img, 0, 0, this.cw, ch);
              const imgData = ctx.getImageData(0, 0, this.cw, ch);
              

              const oldColor = this.parseRGB(targetColorString);
              const newColor = this.parseRGB(replacementColorString)

              
              let iter = 0
              for (let i = 0; i < imgData.data.length; i += 4) {
                const pixelColor = {
                  r: imgData.data[i],
                  g: imgData.data[i + 1],
                  b: imgData.data[i + 2]
                };
                const dist = this.colorDistance(this.rgbToLab(oldColor), this.rgbToLab(pixelColor));
                if(iter < 30 && dist < this.distance.value){
                  console.log(dist)
                  console.log('---------')
                  iter++
                }
                // if (pixelColor === oldColor) {
                if (dist < this.distance.value) {
                  // console.log(pixelColor+' -> '+newColor)
                  imgData.data[i] = newColor.r;
                  imgData.data[i + 1] = newColor.g;
                  imgData.data[i + 2] = newColor.b;
                }
              }

            ctx.putImageData(imgData, 0, 0);
          })
      }


  }

  
        const picker_ref = ref(null);
        const target_circle = ref(null);
        const canvas_ref = ref(null)
        const image_ref = ref(null)
        const viewcolor_ref = ref(null)
        const distance = ref(50) // this value is responsible for distance

        let imageColorPicker;
        onMounted(() => {
          imageColorPicker = new ImageColorPicker(
            canvas_ref.value, 
            viewcolor_ref.value, 
            image_ref.value,
            picker_ref.value,
            target_circle.value,
            distance
          );
          
        })
        
        const on_slicer_change = debounce(() => imageColorPicker.on_slicer_change(), 250)
        const setStatus = (value) => {
          if(value == 1)n
            imageColorPicker.reset()
          status.value = value
        }
      
    
  </script>
  <style>
    .pcr-app.visible{
      width: 250px;
    }
  </style>
    

