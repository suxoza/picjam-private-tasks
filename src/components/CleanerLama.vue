<template>
  <div v-if="isProcessing" class="absolute w-full h-full bg-gray-300 opacity-75 inset-0 z-30 flex items-center justify-center">
    <Loading />
  </div>
  <div class="flex justify-center pt-32 flex-col items-center gap-y-5">
    {{  showBrush  }}
    {{  isPainting  }}
    {{  changeBrushSizeByMouseInit  }}
    
    <div class="relative w-1/2 flex items-center justify-center" style="height: 30rem;">


      <div class="w-full h-full flex items-center justify-center">
        <img
          ref="image_ref"
          src="http://localhost:5173/images/picjam_-_red_sweater_23.png"
          alt=""
          width="512"
          height="512"
          style="display: none;"
          @load="onImageLoad"
        />
        <canvas
          width="512"
          ref="canvas_ref"
          class="absolute top-0"
          style="transition: clip-path 300ms cubic-bezier(0.4, 0, 0.2, 1); inset(0 30% 0 0); cursor: none;"
          @mousedown="onMouseDown"
          @mouseup="onMouseUp"
          @mousemove="onMouseMove"
          @mouseover="showBrush = true"
          @focus="showBrush = true"
          @mouseleave="onMouseleave"
        ></canvas>

        <div v-if="showBrush && !isProcessing"
            class="brush-shape "
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
import { getImageFileFromUrl, ImageColorPicker, inpaint, loadImage } from '../helpers'


import { ref, computed } from 'vue';

const canvas_ref = ref(null);
const image_ref = ref(null);

const showBrush = ref(false)
const isPainting = ref(false)
const isProcessing = ref(false)
const BRUSH_COLOR = '#ffcc00bb'

let drawingPoints = [];


let imageColorPicker, canvas, image;
const onImageLoad = () => {
  canvas = canvas_ref.value;
  image = image_ref.value;
  canvas.width = image.width;
  canvas.height = image.height;
  imageColorPicker = new ImageColorPicker(canvas, image);
}


function drawLines(ctx, lines, color = BRUSH_COLOR) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(image, 0, 0, image.width, image.height)
  ctx.fillStyle = 'rgba(255, 204, 0, 0.01)';
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  lines.forEach(line => {
    if (!line?.pts.length) {
      return
    }
    ctx.lineWidth = Number(circle_size.value || 50) + 50
    ctx.beginPath()
    ctx.moveTo(line.pts[0].x, line.pts[0].y)
    line.pts.forEach(pt => ctx.lineTo(pt.x, pt.y))
    ctx.stroke()
  })
}

function mouseXY(evt) {
  return { x: evt.offsetX, y: evt.offsetY };
}

const circle_size = ref(null)
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
  }
}

const dynamicStyles = computed(() => {
  const brushSize = Number(circle_size.value || 50) + 50
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

const onMouseDown = (evt) => {
  isPainting.value = true
  console.log('mouseDown')
  console.log(drawingPoints)
}

const onMouseUp = async (evt) => {
  isPainting.value = false
  console.log('mouseUp')
  const imageUrl  = image_ref.value.src
  const file = await getImageFileFromUrl(imageUrl)
  const croperRect = {x: 194, y: 194, width: 512, height: 512}
  const promptVal = ""
  const negativePromptVal = ""
  const seedVal = -1
  const useCustomMask = ""
  const paintByExampleImage = ""
  console.log('settings = ')
  console.log(settings.hdSettings[settings.model])


  isProcessing.value = true
  const res = await inpaint(
    file, // targetFile,
    settings, // settings,
    croperRect, // croperRect,
    promptVal,
    negativePromptVal,
    seedVal,
    canvas.toDataURL(),// useCustomMask ? undefined : maskCanvas.toDataURL(),
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