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
                <div class="flex flex-col my-2">
                  <span>Color range</span>
                  <input v-model="color_range" @input="on_slicer_change" type="range" class="w-64" min="1" max="100">
                </div>
                <div class="flex flex-col my-2">
                  <span>Opacity</span>
                  <input v-model="opacity" @input="on_slicer_change" type="range" class="w-64" min="1" max="10">
                </div>
              </div>
              <div ref="picker_ref" class=" viewColor bg-[#d39e8bff] rounded-full color-red-500 -ml-48"></div>
            </div>
        </div>
        
        <div class="relative w-1/2 flex items-center justify-start">
          <!-- <img ref="image_ref" style="display: none;" src="http://localhost:5173/canvas_image.jpg" alt=""> -->
          <!-- <img ref="image_ref" style="display: none;" src="http://localhost:5173/images/woman.png" alt=""> -->
          <img ref="image_ref" style="display: none; max-width: 300px;" src="http://localhost:5173/images/image1232.png" alt="">
          <!-- <img ref="image_ref" style="display: none;" src="http://localhost:5173/images/picjam_-_green_turtleneck_sweater_47.png" alt=""> -->
          <!-- <img ref="image_ref" style="display: none; width: 200px;" src="http://localhost:5173/images/picjam_-_red_sweater_23.png" alt=""/> -->
          <canvas style="cursor: none;" ref="canvas_ref"></canvas>
        </div>
      </div>
  
      <div class="w-full flex flex-wrap items-center justify-center mt-2 mx-10 mb-20">
        <canvas class="" id="canvas_0"></canvas>
        <canvas class="" id="canvas_1"></canvas>
        <canvas class="" id="canvas_2"></canvas>
        <canvas class="" id="canvas_3"></canvas>
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
      rgb2hsv3,
      toRgb,
      toRgb2,
      rgbaToRgb,
      hslToRgb,
      hslToRgb2, 
      hsvToRgb, 
      rgbToHsv
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

      first_load(){
        // const from_color = {h: 215, s: 61, v: 47} // rgba(47, 108, 193, 1)
        // const to_color = {h:353, s:90, v:49} // rgba(237, 12, 39, 1)

        const from_color = {h: 215, s: 75.6, v: 75.7} // rgba(47, 108, 193, 1)
        const to_color = {h:353, s:94.9, v:92.9} // rgba(237, 12, 39, 1)


        ///////----------------

        // const from_color = {h: 128, s: 33, v: 53} // rgba(95, 174, 106, 1)
        // const to_color = {h:353, s:89, v:48} // rgba(234, 13, 37, 1)

        // const from_color = {h: 128, s: 45, v: 68} // rgba(95, 174, 106, 1) // hsl(128, 33%, 53%) // hsv(128, 45%, 68%)
        // const to_color = {h:353, s:94, v:92} // rgba(234, 13, 37, 1) // hsl(353, 89%, 48%) // hsv(353, 94%, 92%)  


        this.color_range.value = 10
        this.opacity.value = 70
        this.replaceColor(from_color, to_color)
      }


      constructor(canvas, viewColor, img, picker, target_circle, color_range, opacity) {
        this.originalImage = img
        this.viewColor = viewColor
        this.canvas = canvas
        this.color_range = color_range
        this.opacity = opacity

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
        }).on('change', (color, source, instance) => {
          // this.targeted_circle().style.backgroundColor = rgbaToRgb(color.toRGBA().toString())
          this.set_action(color)
        }).on('swatchselect', (color) => {
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
          

          this.color_range.value = 10
          this.first_load()

        })

        this.canvas.addEventListener("mousemove", (e) => {
          if([ACTIONS.IS_NOT_SELECTED].includes(status.value))return
          const { thisRGB, thisRGBRy, hsv } = this.get_colors(e)

          // this.targeted_circle().style.backgroundColor = thisRGB;

        }, false);


        this.canvas.addEventListener('click', (e) => {

          const { thisRGB, thisRGBRy, hsv } = this.get_colors(e)
          
          // this.targeted_circle().style.backgroundColor = thisRGB;

          // this.picker.setColour(thisRGB)
          this.picker.setColor(thisRGB)
          this.picker.show()

          // this.set_action(hsv)
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
        }else if(status.value >= ACTIONS.TARGET_IS_ENABLED){
          this.destiny_color = color
          console.log('colors =1 ')
          console.log(this.selected_color)
          console.log(color)
          this.replaceColor(this.selected_color, color)
        }
      }

      reset(){
        this.load_image((img, image) => {
            for (let index = 0; index < 4; index++) {
              const canvas_2 = document.getElementById(`canvas_${index}`)
              canvas_2.width = img.width
              canvas_2.height = img.height
              const ctx = canvas_2.getContext("2d");
              const ch = this.canvas.height = this.imgW * img.height / img.width;
              ctx.drawImage(img, 0, 0, this.cw, ch);
              const imgData = ctx.getImageData(0, 0, this.cw, ch);
              ctx.putImageData(imgData, 0, 0);
            }

            this.color_range.value = 50
            this.opacity.value = 7
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

      display_rgb(ry) {
        return `rgb(${Math.round(ry[0])},${Math.round(ry[1])},${Math.round(ry[2])})`;
      }

      replaceColor(targetColorString, replacementColorString) {
          
          //
          const first_one = hsvToRgb(targetColorString.h, targetColorString.s, targetColorString.v)
          const second_one = hsvToRgb(replacementColorString.h, replacementColorString.s, replacementColorString.v)
          console.log('color1', first_one)
          console.log(replacementColorString)
          console.log('color2', second_one)
          console.log('first color yet = ')
          console.log('first........')
          console.log(rgb2hsv0(...first_one))
          console.log(rgb2hsv0(...second_one))
          console.log('second........')
          console.log(rgb2hsv1(...first_one))
          console.log(rgb2hsv1(...second_one))
          console.log('third........')
          console.log(rgb2hsv2(...first_one))
          console.log(rgb2hsv2(...second_one))
          console.log('forth........')
          console.log(rgb2hsv3(...first_one))
          console.log(rgb2hsv3(...second_one))

          
          this.viewColor.style.backgroundColor = this.display_rgb(first_one)
          this.target_circle.style.backgroundColor = this.display_rgb(second_one);
          //

          this.load_image((img, image) => {

              for (let index = 0; index < 4; index++) {
                  const canvas_2 = document.getElementById(`canvas_${index}`)
                  const ctx = canvas_2.getContext("2d");
                  const ch = this.canvas.height = this.imgW * img.height / img.width;
                  ctx.drawImage(img, 0, 0, this.cw, ch);
                  const imgData = ctx.getImageData(0, 0, this.cw, ch);       
                  
                  for (let i = 0; i < imgData.data.length; i += 4) {
                    const pixelColor = {
                      r: imgData.data[i],
                      g: imgData.data[i + 1],
                      b: imgData.data[i + 2]
                    };
                    // const pixelHSV = rgb2hsv(pixelColor.r, pixelColor.g, pixelColor.b);
                    // const pixelHSV = rgb2hsv2(pixelColor.r, pixelColor.g, pixelColor.b);
                    let pixelHSV
                    switch (index) {
                      case 0:
                        pixelHSV = rgb2hsv0(pixelColor.r, pixelColor.g, pixelColor.b);break;
                      case 1:
                        pixelHSV = rgb2hsv1(pixelColor.r, pixelColor.g, pixelColor.b);break;
                      case 2:
                        // pixelHSV = rgb2hsv2(pixelColor.r, pixelColor.g, pixelColor.b);break;
                        pixelHSV = rgbToHsv(pixelColor.r, pixelColor.g, pixelColor.b);break;
                      case 3:
                        pixelHSV = rgb2hsv3(pixelColor.r, pixelColor.g, pixelColor.b);break;
                    }
                    // if(iter2 < 10){
                    //   console.log('*********************')
                    //   console.log(pixelHSV)
                    //   console.log(rgb2hsv2(pixelColor.r, pixelColor.g, pixelColor.b))
                    //   iter2++
                    // }

                    const dist = hsvColorDistance(targetColorString, pixelHSV);
                    // if(iter < 30 && dist < this.color_range.value){
                    //   console.log(dist)
                    //   console.log('---------')
                    //   iter++
                    // }
                    // if (pixelColor === oldColor) {
                    if (dist < this.color_range.value) {
                      // console.log(pixelColor+' -> '+newColor)
                      imgData.data[i] = second_one[0];
                      imgData.data[i + 1] = second_one[1];
                      imgData.data[i + 2] = second_one[2];
                      imgData.data[i + 3 ] = (this.opacity.value / 10) * 255;
                    }
                  }

                ctx.putImageData(imgData, 0, 0);
                // console.log('next one')
                // await sleep(300)
              }
          })
      }
  }  
        const picker_ref = ref(null);
        const target_circle = ref(null);
        const canvas_ref = ref(null)
        const image_ref = ref(null)
        const viewcolor_ref = ref(null)
        const color_range = ref(50) // this value is responsible for color range
        const opacity = ref(7) // this value is responsible for opacity

        let imageColorPicker;
        onMounted(() => {
          imageColorPicker = new ImageColorPicker(
            canvas_ref.value, 
            viewcolor_ref.value, 
            image_ref.value,
            picker_ref.value,
            target_circle.value,
            color_range,
            opacity,
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
    

