<template>
    <div class="flex items-center justify-center">
        <div class="my-5 gap-y-2 flex flex-col">
            <div class="flex flex-col my-2">
                <span>Color range</span>
                <input v-model="color_range" @input="on_slicer_change" type="range" class="w-64" min="1" max="100">
            </div>
            <div class="flex flex-col my-2">
                <span>Opacity</span>
                <input v-model="opacity" @input="on_slicer_change" type="range" class="w-64" min="1" max="10">
            </div>
        </div>
    </div>

    <div id="container_here"></div>
</template>


<script setup>
    import { ref, onMounted, computed, watch } from 'vue'
    import * as PIXI from 'pixi.js'; 
    import { ColorReplaceFilterUpd } from '../libs/customFilters'

    const color_range = ref(70)
    const opacity = ref(5)
    const computed_alpha = computed(() => color_range.value)

    const is_mounted = ref(false)

    let container, bg, app;
    onMounted(() => {

        //
        app = new PIXI.Application({ resizeTo: window });
        document.getElementById('container_here').appendChild(app.view);
        app.stage.eventMode = 'static';
        
        container = new PIXI.Container();
        bg = PIXI.Sprite.from('http://localhost:5173/images/image1232.png');
        // bg = PIXI.Sprite.from('http://localhost:5173/images/woman.png');
        

        console.log(app.renderer)
        //
        custom_filter()
        container.addChild(bg);
        app.stage.addChild(container);

        // 
        new ImageColorPicker(app.view)
        // 

        is_mounted.value = true
    })

    watch(() => {
        if(is_mounted.value){
            custom_filter()
        }
    }, computed_alpha)

    const custom_filter = () => {
        console.log('alpha = ', (computed_alpha.value / 100)) // 1-10
        console.log('epsilon = ', (opacity.value / 10)) // 0.1 - 1.0
        const newFilter = new ColorReplaceFilterUpd({
            originalColor: '#2F6BBF',
            newColor: '#1A3C7F',
            targetAlpha: computed_alpha.value / 100,
            epsilon: opacity.value / 10
        });

        container.filters = [newFilter];

        
    }

    // app.view
    class ImageColorPicker {

        constructor(canvas) {
            this.canvas = canvas
            this.ctx = this.canvas.getContext('2d')
            console.log(this.ctx)

            // this.animate()
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
    }
    

    

</script>