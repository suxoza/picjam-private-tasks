<template>
  <div v-if="isProcessing" class="fixed w-screen h-screen bg-gray-300 opacity-75 inset-0 z-30 flex items-center justify-center">
    <Loading />
  </div>

  <!-- <img id="example_image" class="absolute inset-0 z-20 w-72" src="http://localhost:5173/images/woman.png" alt=""> -->
  <div class="flex justify-center pt-32 flex-col items-center gap-y-5">
    <div class="my-10">
      {{  showBrush  }}
      {{  isPainting  }}
      {{  changeBrushSizeByMouseInit  }}
    </div>
    
    <div class="w-1/2 flex items-center justify-center">


      <div class="flex items-center justify-center relative">
        <img
          ref="image_ref"
          src="http://localhost:5173/images/picjam_-_red_sweater_23.png"
          alt=""
          class="hidden"
          @load="onImageLoad"
        />
        <!-- <img
          ref="image_ref"
          src="http://localhost:5173/images/woman.png"
          alt=""
          class="hidden"
          @load="onImageLoad"
        /> -->
        <canvas
          ref="canvas_ref"
          style="clipPath: inset(0 0% 0 0); transition: clip-path 300ms cubic-bezier(0.4, 0, 0.2, 1)"
          @mousedown="onMouseDown"
          @mouseup="onMouseUp"
          @mousemove="onMouseMove"
          @mouseover="showBrush = true"
          @focus="showBrush = true"
          @mouseleave="onMouseleave"
        >
      
      </canvas>

        <div v-if="showBrush && !isProcessing"
            class="brush-shape"
            :style="dynamicStyles"
          >
        </div>
      </div>


    </div>
    
    <div class="my-20 bg-gray-100 p-5 rounded-xl">
      <input
        v-model="circle_size"
        type="range"
        class="w-64"
        min="1"
        max="100"
      />
    </div>
  </div>
</template>

<script setup>
import Loading from './loading.vue'
import settings from '../settings.json'
import { 
  getImageFileFromUrl, 
  ImageColorPicker, 
  inpaint, 
  loadImage, 
  srcToFile 
} from '../helpers'


import { ref, computed } from 'vue';

const canvas_ref = ref(null);
const image_ref = ref(null);

const showBrush = ref(false)
const isPainting = ref(false)
const isProcessing = ref(false)
const BRUSH_COLOR = '#ffcc00bb'
const maskCanvas = ref(document.createElement('canvas'))
const renders = []

let drawingPoints = [];


let imageColorPicker, canvas, image;
const onImageLoad = () => {
  canvas = canvas_ref.value;
  image = image_ref.value;
  canvas.width = image.width;
  canvas.height = image.height;
  imageColorPicker = new ImageColorPicker(canvas, image);
}

const drawOnMask = (lines) => {
  maskCanvas.value.width = canvas.width
  maskCanvas.value.height = canvas.height
  const ctx = maskCanvas.value.getContext('2d')
  drawLines(ctx, lines, 'white')
}

function drawLines(ctx, lines, color = BRUSH_COLOR) {
  // ctx.strokeStyle = color
  // ctx.strokeStyle = 'yellow'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = 'rgba(255, 255, 0, 0.009)';
  lines.forEach(line => {
    if (!line?.pts.length) {
      return
    }
    ctx.lineWidth = Number(circle_size.value || 50) + 30
    ctx.beginPath()
    ctx.moveTo(line.pts[0].x, line.pts[0].y)
    line.pts.forEach(pt => ctx.lineTo(pt.x, pt.y))
    ctx.stroke()
  })
  ctx.fill();
  ctx.closePath();
  ctx.globalAlpha = 1;
}

function mouseXY(evt) {
  return { x: evt.offsetX, y: evt.offsetY };
}

const circle_size = ref(70)
const changeBrushSizeByMouseInit = ref({
    x: -1,
    y: -1,
})

const onMouseMove = (evt) => {
  const pos = mouseXY(evt)
  changeBrushSizeByMouseInit.value.x = pos.x
  changeBrushSizeByMouseInit.value.y = pos.y

  if(isPainting.value){
    drawingPoints.push({ pts: [pos] })
    drawLines(
      imageColorPicker.ctx,
      drawingPoints,
    )
    drawOnMask(drawingPoints)
  }
}

const dynamicStyles = computed(() => {
  const brushSize = Number(circle_size.value || 70) + 30
  return {
    left:  changeBrushSizeByMouseInit.value.x+'px',
    top:  changeBrushSizeByMouseInit.value.y+'px',
    width: brushSize+'px',
    height: brushSize+'px'
  }
})

const onMouseleave = (evt) => {
  
  showBrush.value = false
  isPainting.value = false

}

const onMouseDown = () => {
  isPainting.value = true
  console.log('mouseDown')
  console.log(drawingPoints)
}

const onMouseUp = async () => {
  isPainting.value = false
  console.log('mouseUp')
  const imageUrl  = image_ref.value.src
  let file = await getImageFileFromUrl(imageUrl)
  if(renders.length){
    const lastRender = renders[renders.length - 1]
    file = await srcToFile(
      lastRender.currentSrc,
      file.name,
      file.type
    )
  }
  
  // const croperRect = {x: 194, y: 194, width: 512, height: 512}
  const croperRect = {
    x: 12,
    y: 103,
    width: 512,
    height: 512,
  }
  const promptVal = ""
  const negativePromptVal = ""
  const seedVal = -1
  const useCustomMask = ""
  const paintByExampleImage = ""
  console.log('settings = ')
  console.log(settings.hdSettings[settings.model])
  console.log(file)
  // console.log(maskCanvas.value.toDataURL())
  // return

  isProcessing.value = true
  console.log(renders)
  console.log({
      a: file,
      a2: settings,
      a3: croperRect,
      a4: promptVal,
      a5: negativePromptVal,
      a6: seedVal,
      a7: maskCanvas.value.toDataURL(),
      a8: useCustomMask,
      a9: paintByExampleImage,
    })
  showBrush.value = false  
  const res = await inpaint(
    file, // targetFile,
    settings, // settings,
    croperRect, // croperRect,
    promptVal,
    negativePromptVal,
    seedVal,
    maskCanvas.value.toDataURL(),// useCustomMask ? undefined : maskCanvas.toDataURL(),
    useCustomMask,// useCustomMask ? customMask : undefined,
    paintByExampleImage, // paintByExampleImage
  )
  isProcessing.value = false

  const { blob, seed } = res
  if (seed) {
    setSeed(parseInt(seed, 10))
  }
  const newRender = new Image()
  await loadImage(newRender, blob)

  renders.push(newRender)

  new ImageColorPicker(canvas, newRender)
  drawingPoints = []

}
</script>


<style scoped>
.brush-shape {
  position: absolute;
  border-radius: 50%;
  background-color: #ffcc00bb;
  border: 1px solid #ffcc00;
  pointer-events: none;
  transform: translate(-50%, -50%)
}
</style>