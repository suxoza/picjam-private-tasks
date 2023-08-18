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
          <img ref="image_ref" style="display: none; width: 200px;" src="http://localhost:5173/images/picjam_-_green_turtleneck_sweater_47.png" alt="">
          <!-- <img ref="image_ref" style="display: none; width: 200px;" src="http://localhost:5173/images/picjam_-_red_sweater_23.png" alt=""/> -->
          <canvas style="cursor: none;" ref="canvas_ref"></canvas>
        </div>
      </div>
  
      <div class="w-full flex items-center justify-around mt-2 ml-24">
        <canvas width="700" height="700" class="w-[50%] h-full" id="canvas_0"></canvas>
        <canvas width="700" height="700" class="w-[50%] h-full" id="canvas_1"></canvas>
        <canvas width="700" height="700" class="w-[50%] h-full" id="canvas_2"></canvas>
      </div>
</template>

<script>

  import '@simonwep/pickr/dist/themes/classic.min.css';   

  import Pickr from '@simonwep/pickr';
  import { ref, onMounted } from 'vue'
  import debounce from 'lodash.debounce';
</script>

<script setup>

    import {
      hsvColorDistance,
      rgbToHsl,
      rgb2hsv0,
      rgb2hsv1,
      rgb2hsv2,
      toRgb,
      toRgb2,
      rgbaToRgb,
      hslToRgb
    } from '../colourHelpers'
    
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
          // instance.show()
        }).on('change', debounce((color, source, instance) => {
          this.targeted_circle().style.backgroundColor = rgbaToRgb(color.toRGBA().toString())
          this.set_action(color)
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
            radius: 10, 
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
          const { thisRGB, thisRGBRy, hsv } = this.get_colors(e)

          this.targeted_circle().style.backgroundColor = thisRGB;

        }, false);


        this.canvas.addEventListener('click', (e) => {

          const { thisRGB, thisRGBRy, hsv } = this.get_colors(e)
          console.log('colors: ', hsv)
          
          this.targeted_circle().style.backgroundColor = thisRGB;

          // this.picker.setColour(thisRGB)
          this.picker.setColor(thisRGB)
          this.picker.show()

          this.set_action(hsv)
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
          console.log('colors =1 ')
          console.log(this.selected_color)
          console.log(color)
          this.replaceColor(this.selected_color, color)
        }
      }

      reset(){
        this.load_image((img, image) => {
            for (let index = 0; index < 3; index++) {
              const canvas_2 = document.getElementById(`canvas_${index}`)
              const ctx = canvas_2.getContext("2d");
              const ch = this.canvas.height = this.imgW * img.height / img.width;
              ctx.drawImage(img, 0, 0, this.cw, ch);
              const imgData = ctx.getImageData(0, 0, this.cw, ch);
              ctx.putImageData(imgData, 0, 0);
            }

            this.distance.value = 40
            this.destiny_color = null
        })
      }

      get_colors(e) {
        const m = this.oMousePos(e);
        const i = (m.x + m.y * this.cw) * 4;
        const R = this.pixels[i];
        const G = this.pixels[i + 1];
        const B = this.pixels[i + 2];
        const hsv = rgbToHsl(R, G, B); // Convert RGB to HSV
        const thisRGBRy = [R, G, B];
        const thisRGB = `rgb(${Math.round(R)},${Math.round(G)},${Math.round(B)})`;
        return {
          thisRGBRy,
          thisRGB,
          hsv: hsv
        };
      }

      oMousePos(evt) {
        const ClientRect = this.canvas.getBoundingClientRect();
        const result = {
          x: Math.round(evt.clientX - ClientRect.left),
          y: Math.round(evt.clientY - ClientRect.top)
        };
        this.circle.x = result.x;
        this.circle.y = result.y;
        return result;
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

      replaceColor(targetColorString, replacementColorString) {
          const oldHSV = targetColorString
          const newColor = hslToRgb(replacementColorString)

          const sleep = (interval = 1000) => new Promise(resolve => setTimeout(() => {
            resolve()
          }, interval))

          this.load_image(async (img, image) => {

              for (let index = 1; index < 2; index++) {

                  const canvas_2 = document.getElementById(`canvas_${index}`)
                  const ctx = canvas_2.getContext("2d");
                  const ch = this.canvas.height = this.imgW * img.height / img.width;
                  ctx.drawImage(img, 0, 0, this.cw, ch);
                  const imgData = ctx.getImageData(0, 0, this.cw, ch);       
                  
                  let iter = 0
                  let iter2 = 0
                  for (let i = 0; i < imgData.data.length; i += 4) {
                    const pixelColor = {
                      r: imgData.data[i],
                      g: imgData.data[i + 1],
                      b: imgData.data[i + 2]
                    };
                    // const pixelHSV = rgb2hsv(pixelColor.r, pixelColor.g, pixelColor.b);
                    // const pixelHSV = rgb2hsv2(pixelColor.r, pixelColor.g, pixelColor.b);
                    const pixelHSV = eval(`rgb2hsv${index}`)(pixelColor.r, pixelColor.g, pixelColor.b);
                    // if(iter2 < 10){
                    //   console.log('*********************')
                    //   console.log(pixelHSV)
                    //   console.log(rgb2hsv2(pixelColor.r, pixelColor.g, pixelColor.b))
                    //   iter2++
                    // }

                    const dist = hsvColorDistance(oldHSV, pixelHSV);
                    // if(iter < 30 && dist < this.distance.value){
                    //   console.log(dist)
                    //   console.log('---------')
                    //   iter++
                    // }
                    // if (pixelColor === oldColor) {
                    if (dist < this.distance.value) {
                      // console.log(pixelColor+' -> '+newColor)
                      imgData.data[i] = newColor.r;
                      imgData.data[i + 1] = newColor.g;
                      imgData.data[i + 2] = newColor.b;
                    }
                  }

                ctx.putImageData(imgData, 0, 0);
                console.log('next one')
                await sleep(300)
              }
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
    

