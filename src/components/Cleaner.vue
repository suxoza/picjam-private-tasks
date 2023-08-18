<template>
  <div class="flex justify-center pt-32 flex-col items-center gap-y-5">
    <div class="relative w-1/2 flex items-center justify-start">
      <img
        ref="image_ref"
        style="display: none"
        src="http://localhost:5173/images/picjam_-_red_sweater_23.png"
        alt=""
        @load="onImageLoad"
      />
      <canvas
        ref="canvas_ref"
        @mousedown="onMouseDown"
      ></canvas>
    </div>
    <div class="my-5 bg-gray-100 p-5 rounded-xl">
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
import { ref } from 'vue';

const canvas_ref = ref(null);
const image_ref = ref(null);

const circle_size = ref(30);

let isDrawing = false;
let drawingPoints = [];

const onMouseDown = (e) => {
  isDrawing = true;
  const rect = canvas_ref.value.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  drawingPoints.push({ x: mouseX, y: mouseY });
};

const onImageLoad = () => {
  const canvas = canvas_ref.value;
  const image = image_ref.value;
  canvas.width = image.width;
  canvas.height = image.height;
  const imageColorPicker = new ImageColorPicker(canvas, image);

  const onMouseMove = (e) => {
    if (!isDrawing) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, image.width, image.height);

      ctx.fillStyle = 'rgba(255, 204, 0, 0.07)';
      for (const point of drawingPoints) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, circle_size.value, 0, Math.PI * 32);
        ctx.fill();
        ctx.closePath();
      }
      
      // Draw the current mouse position with transparency
      ctx.fillStyle = 'rgba(255, 204, 0, 0.8)';
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, circle_size.value, 0, Math.PI * 32);
      ctx.fill();
      ctx.closePath();
    }
  };

  canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) {
      onMouseMove(e);
    } else {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      drawingPoints.push({ x: mouseX, y: mouseY });
      imageColorPicker.drawPath(drawingPoints);
    }
  });

  canvas.addEventListener('mouseup', () => {
    if (isDrawing) {
      isDrawing = false;
      // imageColorPicker.drawPath(drawingPoints);
    }
  });
};

class ImageColorPicker {
  constructor(canvas, img) {
    this.originalImage = img;
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.imgW = img.width;
    this.imgH = img.height;
    this.ctx.drawImage(this.originalImage, 0, 0, this.imgW, this.imgH);
    this.imgData = this.ctx.getImageData(0, 0, this.imgW, this.imgH);
  }

  drawPath(points) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.originalImage, 0, 0, this.imgW, this.imgH);
    
    this.ctx.fillStyle = 'rgba(255, 204, 0, 0.5)';
    for (const point of points) {
      if(drawingPoints.includes({x: point.x, y: point.y}))continue
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, circle_size.value, 0, Math.PI * 32);
      this.ctx.fill();
      this.ctx.closePath();
    }
  }
  
}
</script>
